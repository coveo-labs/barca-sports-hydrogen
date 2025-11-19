import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import {
  data as reactRouterData,
  useLoaderData,
  useNavigate,
  useRouteLoaderData,
  type LoaderFunctionArgs,
} from 'react-router';
import cx from '~/lib/cx';
import type {RootLoader} from '~/root';
import {ProductCard} from '~/components/Products/ProductCard';
import {
  CONVERSATIONS_SESSION_KEY,
  type ConversationMessage,
  type ConversationSummary,
} from '~/types/conversation';

const STORAGE_KEY = 'agentic:conversations:v1';
const STREAM_ENDPOINT = '/api/agentic/conversation';
const MAX_MESSAGES = 20;
const MAX_CONVERSATIONS = 10;

type ConversationRecord = {
  localId: string;
  sessionId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
  isPersisted?: boolean;
};

type ToolResultParse = {
  message: string | null;
  products: Product[] | null;
};

function parseToolResultPayload(raw: unknown): ToolResultParse {
  const message =
    typeof raw === 'object' && raw !== null
      ? (() => {
          const candidate = raw as Record<string, unknown>;
          const value = candidate.message ?? candidate.status ?? candidate.text;
          if (typeof value === 'string' && value.trim()) {
            return value.trim();
          }
          return null;
        })()
      : typeof raw === 'string'
        ? raw.trim()
        : null;

  const products = extractProductArray(raw);

  return {
    message: message && message.length ? message : null,
    products,
  };
}

function extractProductArray(source: unknown): Product[] | null {
  const stack: unknown[] = [source];
  const seen = new Set<unknown>();
  const keysToCheck = ['products', 'items', 'results', 'hits', 'documents'];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    if (Array.isArray(current) && current.length > 0) {
      return current as Product[];
    }

    if (typeof current === 'object') {
      if (seen.has(current)) {
        continue;
      }
      seen.add(current);
      const record = current as Record<string, unknown>;
      for (const key of keysToCheck) {
        if (key in record) {
          stack.push(record[key]);
        }
      }
    }
  }

  return null;
}

function loadConversationsFromStorage(): ConversationRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ConversationSummary[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map(mapSummaryToRecord);
  } catch {
    return [];
  }
}

function persistConversationsToStorage(records: ConversationRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  const summaries = records
    .filter((conversation) => conversation.sessionId)
    .map(recordToSummary)
    .slice(0, 10);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const diff = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return 'just now';
  }
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return `${minutes} min ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `${hours} h ago`;
  }
  const days = Math.round(diff / day);
  return `${days} d ago`;
}

function findEventBoundary(buffer: string) {
  const lfIndex = buffer.indexOf('\n\n');
  const crlfIndex = buffer.indexOf('\r\n\r\n');
  if (lfIndex === -1) return crlfIndex;
  if (crlfIndex === -1) return lfIndex;
  return Math.min(lfIndex, crlfIndex);
}

function getBoundaryLength(buffer: string, index: number) {
  return buffer.startsWith('\r\n\r\n', index) ? 4 : 2;
}

export async function loader({request, context}: LoaderFunctionArgs) {
  const stored = context.session.get(CONVERSATIONS_SESSION_KEY) as
    | ConversationSummary[]
    | undefined;

  const conversations = Array.isArray(stored)
    ? [...stored].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : [];

  const url = new URL(request.url);
  const requestedConversationId = url.searchParams.get('conversationId');
  const rawInitialQuestion = url.searchParams.get('q');
  let initialQuestion: string | null = null;

  if (rawInitialQuestion) {
    const normalized = rawInitialQuestion.replace(/\+/g, ' ').trim();
    if (normalized) {
      initialQuestion = normalized;
    }
  }

  const headers: Record<string, string> = {};
  if (context.session.isPending) {
    headers['Set-Cookie'] = await context.session.commit();
  }

  return reactRouterData(
    {
      conversations,
      activeConversationId:
        requestedConversationId ?? conversations[0]?.id ?? null,
      initialQuestion,
    },
    Object.keys(headers).length ? {headers} : undefined,
  );
}

export default function GenerativeShoppingAssistant() {
  const {
    conversations: initialSummaries,
    activeConversationId: loaderActiveId,
    initialQuestion,
  } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const navigate = useNavigate();
  const locale = rootData?.locale;

  const initialRecords = useMemo(
    () => initialSummaries.map(mapSummaryToRecord),
    [initialSummaries],
  );

  const [conversations, setConversations] =
    useState<ConversationRecord[]>(initialRecords);

  useEffect(() => {
    setConversations((prev) => mergeConversations(prev, initialRecords));
  }, [initialRecords]);

  const initialActiveLocalId = useMemo(() => {
    if (!loaderActiveId) {
      return initialRecords[0]?.localId ?? null;
    }
    const match =
      initialRecords.find(
        (conversation) =>
          conversation.sessionId === loaderActiveId ||
          conversation.localId === loaderActiveId,
      ) ?? null;

    return match?.localId ?? initialRecords[0]?.localId ?? null;
  }, [initialRecords, loaderActiveId]);

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(initialActiveLocalId);

  useEffect(() => {
    setActiveConversationId((current) => {
      if (
        current &&
        conversations.some((conversation) => conversation.localId === current)
      ) {
        return current;
      }
      return conversations[0]?.localId ?? null;
    });
  }, [conversations]);

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const storageLoadedRef = useRef(false);
  const initialQueryHandledRef = useRef(false);
  useEffect(() => {
    if (!isHydrated || storageLoadedRef.current) {
      return;
    }
    const stored = loadConversationsFromStorage();
    if (stored.length > 0) {
      setConversations((prev) => mergeConversations(prev, stored));
    }
    storageLoadedRef.current = true;
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    persistConversationsToStorage(conversations);
  }, [conversations, isHydrated]);

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const streamAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => streamAbortRef.current?.abort(), []);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.localId === activeConversationId,
      ) ?? null,
    [conversations, activeConversationId],
  );

  const messages = activeConversation?.messages ?? [];

  const messageContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = messageContainerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const persistConversation = useCallback(
    async (record: ConversationRecord) => {
      if (!record.sessionId) {
        return;
      }

      const summary = recordToSummary(record);

      try {
        const response = await fetch(STREAM_ENDPOINT, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({conversation: summary}),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.localId === record.localId
              ? {...conversation, isPersisted: true}
              : conversation,
          ),
        );
      } catch (error) {
        console.error('Failed to persist conversation', error);
      }
    },
    [setConversations],
  );

  const streamAssistantResponse = useCallback(
    async ({
      conversationLocalId,
      conversationSessionId,
      userMessage,
    }: {
      conversationLocalId: string;
      conversationSessionId: string | null;
      userMessage: string;
    }) => {
      const controller = new AbortController();
      streamAbortRef.current = controller;

      const view =
        typeof window !== 'undefined'
          ? {
              url: window.location.href,
              referrer: document.referrer || undefined,
            }
          : undefined;

      let resolvedSessionId = conversationSessionId;
      let assistantMessageId: string | null = null;
      let accumulatedContent = '';
      let latestSnapshot: ConversationRecord | null = null;
      let statusMessageId: string | null = null;
      let toolMessageId: string | null = null;
      let productMessageId: string | null = null;
      let capturedErrorMessage: string | null = null;

      const applyUpdate = (
        mutator: (conversation: ConversationRecord) => ConversationRecord,
      ) => {
        setConversations((prev) =>
          sortConversations(
            prev.map((conversation) => {
              if (conversation.localId !== conversationLocalId) {
                return conversation;
              }
              const updated = mutator(conversation);
              const limitedMessages = limitMessages(updated.messages);
              const limited =
                limitedMessages === updated.messages
                  ? updated
                  : {
                      ...updated,
                      messages: limitedMessages,
                    };
              latestSnapshot = limited;
              return limited;
            }),
          ),
        );
      };

      const ensureEphemeralMessage = (
        id: string | null,
        content: string,
        kind: ConversationMessage['kind'],
      ) => {
        const messageId = id ?? generateId();
        const timestamp = new Date().toISOString();
        applyUpdate((conversation) => {
          const messages = [...conversation.messages];
          const index = messages.findIndex(
            (message) => message.id === messageId,
          );
          if (index === -1) {
            messages.push({
              id: messageId,
              role: 'assistant',
              content,
              createdAt: timestamp,
              kind,
              ephemeral: true,
            });
          } else {
            messages[index] = {
              ...messages[index],
              content,
              kind,
              ephemeral: true,
            };
          }
          return {
            ...conversation,
            updatedAt: timestamp,
            messages,
          };
        });
        return messageId;
      };

      const removeEphemeralMessage = (id: string | null) => {
        if (!id) {
          return;
        }
        applyUpdate((conversation) => {
          const messages = conversation.messages.filter(
            (message) => message.id !== id,
          );
          if (messages.length === conversation.messages.length) {
            return conversation;
          }
          return {
            ...conversation,
            updatedAt: new Date().toISOString(),
            messages,
          };
        });
      };

      const clearProgressIndicators = () => {
        if (statusMessageId) {
          removeEphemeralMessage(statusMessageId);
          statusMessageId = null;
        }
        if (toolMessageId) {
          removeEphemeralMessage(toolMessageId);
          toolMessageId = null;
        }
      };

      const pushErrorBubble = (text: string) => {
        applyUpdate((conversation) => ({
          ...conversation,
          updatedAt: new Date().toISOString(),
          messages: [
            ...conversation.messages,
            {
              id: generateId(),
              role: 'assistant',
              content: text,
              createdAt: new Date().toISOString(),
              kind: 'error',
            },
          ],
        }));
      };

      const extractText = (value: unknown, fallback: string) => {
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed || fallback;
        }
        if (typeof value === 'object' && value !== null) {
          const record = value as Record<string, unknown>;
          const keys = ['message', 'content', 'status', 'detail', 'text'];
          for (const key of keys) {
            const candidate = record[key];
            if (typeof candidate === 'string' && candidate.trim()) {
              return candidate.trim();
            }
          }
        }
        return fallback;
      };

      try {
        if (typeof window !== 'undefined') {
          console.info('[chat] streaming request start', {
            conversationLocalId,
            conversationSessionId,
            endpoint: STREAM_ENDPOINT,
          });
        }

        statusMessageId = ensureEphemeralMessage(
          statusMessageId,
          'Connecting to the Barça assistant...',
          'status',
        );
        const response = await fetch(STREAM_ENDPOINT, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          signal: controller.signal,
          body: JSON.stringify({
            message: userMessage,
            conversationSessionId: conversationSessionId ?? undefined,
            locale,
            view,
          }),
        });

        if (!response.ok || !response.body) {
          if (typeof window !== 'undefined') {
            console.error('[chat] streaming response missing body', {
              status: response.status,
            });
          }
          const errorText = await response.text().catch(() => '');
          const message =
            errorText || 'Unable to reach the shopping assistant right now.';
          capturedErrorMessage = message;
          clearProgressIndicators();
          pushErrorBubble(message);
          setStreamError(message);
          throw new Error(message);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processEvent = (event: {event: string; data: string}) => {
          if (!event.data) return;

          let parsed: unknown;
          try {
            parsed = JSON.parse(event.data);
          } catch {
            parsed = event.data;
          }

          if (typeof parsed === 'object' && parsed !== null) {
            const payload = parsed as {
              conversationSessionId?: string;
              sessionId?: string;
              content?: string;
              message?: string;
            };

            const sessionValue =
              payload.conversationSessionId || payload.sessionId;
            if (sessionValue && sessionValue !== resolvedSessionId) {
              resolvedSessionId = sessionValue;
              applyUpdate((conversation) => ({
                ...conversation,
                sessionId: sessionValue,
              }));

              if (typeof window !== 'undefined') {
                const nextUrl = new URL(window.location.href);
                nextUrl.searchParams.set('conversationId', sessionValue);
                navigate(
                  `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
                  {replace: true},
                );
              }
            }
          } else if (event.event === 'session' && typeof parsed === 'string') {
            const trimmed = parsed.trim();
            if (trimmed && trimmed !== resolvedSessionId) {
              resolvedSessionId = trimmed;
              applyUpdate((conversation) => ({
                ...conversation,
                sessionId: trimmed,
              }));

              if (typeof window !== 'undefined') {
                const nextUrl = new URL(window.location.href);
                nextUrl.searchParams.set('conversationId', trimmed);
                navigate(
                  `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
                  {replace: true},
                );
              }
            }
          }

          switch (event.event || 'message') {
            case 'status': {
              if (assistantMessageId) {
                return;
              }
              const statusText = extractText(
                parsed,
                'Working on your request...',
              );
              statusMessageId = ensureEphemeralMessage(
                statusMessageId,
                statusText,
                'status',
              );
              return;
            }
            case 'tool_invocation': {
              if (assistantMessageId) {
                return;
              }
              const toolText = extractText(
                parsed,
                'Assistant is fetching fresh data...',
              );
              toolMessageId = ensureEphemeralMessage(
                toolMessageId,
                toolText,
                'tool',
              );
              return;
            }
            case 'tool_result': {
              if (assistantMessageId) {
                return;
              }
              const toolPayload = parseToolResultPayload(parsed);
              const successNote =
                toolPayload.message ??
                extractText(
                  parsed,
                  'Got the latest catalog results - summarizing now.',
                );

              toolMessageId = ensureEphemeralMessage(
                toolMessageId,
                successNote,
                'tool',
              );

              const displayText =
                toolPayload.message ??
                extractText(parsed, 'Here are some products I found for you.');

              const productList = toolPayload.products ?? [];
              if (productList.length > 0) {
                if (!productMessageId) {
                  productMessageId = generateId();
                }

                const createdAt = new Date().toISOString();
                const metadata = {products: productList};

                applyUpdate((conversation) => {
                  const messages = [...conversation.messages];
                  const index = messages.findIndex(
                    (message) => message.id === productMessageId,
                  );

                  const nextMessage: ConversationMessage = {
                    id: productMessageId!,
                    role: 'assistant',
                    content: displayText,
                    createdAt:
                      index >= 0 ? messages[index].createdAt : createdAt,
                    kind: 'products',
                    metadata,
                  };

                  if (index >= 0) {
                    messages[index] = {
                      ...messages[index],
                      ...nextMessage,
                      metadata,
                    };
                  } else {
                    messages.push(nextMessage);
                  }

                  return {
                    ...conversation,
                    updatedAt: new Date().toISOString(),
                    messages,
                  };
                });
              }

              return;
            }
            case 'error': {
              const errorText = extractText(
                parsed,
                'The assistant ran into an issue. Please try again.',
              );
              capturedErrorMessage = errorText;
              clearProgressIndicators();
              pushErrorBubble(errorText);
              setStreamError(errorText);
              controller.abort();
              return;
            }
            default: {
              let chunk = '';
              if (typeof parsed === 'string') {
                chunk = parsed;
              } else if (
                typeof parsed === 'object' &&
                parsed !== null &&
                typeof (parsed as Record<string, unknown>).content === 'string'
              ) {
                chunk = (parsed as Record<string, unknown>).content as string;
              } else if (
                typeof parsed === 'object' &&
                parsed !== null &&
                typeof (parsed as Record<string, unknown>).message === 'string'
              ) {
                chunk = (parsed as Record<string, unknown>).message as string;
              }

              if (!chunk) {
                return;
              }

              if (!assistantMessageId) {
                clearProgressIndicators();
              }

              accumulatedContent += chunk;
              const contentSnapshot = accumulatedContent;

              applyUpdate((conversation) => {
                const messages = [...conversation.messages];
                if (!assistantMessageId) {
                  assistantMessageId = generateId();
                  messages.push({
                    id: assistantMessageId,
                    role: 'assistant',
                    content: contentSnapshot,
                    createdAt: new Date().toISOString(),
                    kind: 'text',
                  });
                } else {
                  const index = messages.findIndex(
                    (message) => message.id === assistantMessageId,
                  );
                  if (index >= 0) {
                    messages[index] = {
                      ...messages[index],
                      content: contentSnapshot,
                      kind: 'text',
                    };
                  } else {
                    messages.push({
                      id: assistantMessageId,
                      role: 'assistant',
                      content: contentSnapshot,
                      createdAt: new Date().toISOString(),
                      kind: 'text',
                    });
                  }
                }

                return {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  sessionId: resolvedSessionId ?? conversation.sessionId,
                  messages,
                };
              });
              return;
            }
          }
        };

        const processRawEvent = (rawEvent: string) => {
          if (!rawEvent.trim()) {
            return;
          }
          const lines = rawEvent.split(/\r?\n/);
          let eventType = 'message';
          const dataLines: string[] = [];
          for (const line of lines) {
            if (!line || line.startsWith(':')) {
              continue;
            }
            if (line.startsWith('event:')) {
              eventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              dataLines.push(line.slice(5).trimStart());
            }
          }
          processEvent({event: eventType, data: dataLines.join('\n')});
        };

        const extractEvents = (chunk: string) => {
          buffer += chunk;
          while (true) {
            const boundaryIndex = findEventBoundary(buffer);
            if (boundaryIndex === -1) {
              break;
            }
            const delimiterLength = getBoundaryLength(buffer, boundaryIndex);
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + delimiterLength);
            processRawEvent(rawEvent);
          }
        };

        while (true) {
          const {value, done} = await reader.read();
          if (done) {
            if (buffer.trim()) {
              processRawEvent(buffer);
              buffer = '';
            }
            break;
          }
          const chunk = decoder.decode(value, {stream: true});
          extractEvents(chunk);
        }

        clearProgressIndicators();

        if (latestSnapshot) {
          const snapshot: ConversationRecord = latestSnapshot;
          const finalSnapshot: ConversationRecord = {
            ...snapshot,
            sessionId: resolvedSessionId ?? snapshot.sessionId,
            updatedAt: new Date().toISOString(),
          };

          setConversations((prev) =>
            sortConversations(
              prev.map((conversation) =>
                conversation.localId === finalSnapshot.localId
                  ? finalSnapshot
                  : conversation,
              ),
            ),
          );

          if (finalSnapshot.sessionId && !capturedErrorMessage) {
            await persistConversation(finalSnapshot);
          }
        }
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          if (typeof window !== 'undefined') {
            if (capturedErrorMessage) {
              console.warn(
                '[chat] streaming request aborted after server-side error',
              );
            } else {
              console.info('[chat] streaming request aborted');
            }
          }
          return;
        }
        console.error('[chat] streaming request error', error);
        if (!capturedErrorMessage) {
          setStreamError(
            'The assistant ran into a problem. Please try again in a moment.',
          );
        }
      } finally {
        clearProgressIndicators();
        streamAbortRef.current = null;
        setIsStreaming(false);
        if (typeof window !== 'undefined') {
          console.info('[chat] streaming request finished');
        }
      }
    },
    [locale, navigate, persistConversation, setConversations],
  );

  const sendMessage = useCallback(
    async (messageText: string, options: {forceNew?: boolean} = {}) => {
      const trimmed = messageText.trim();
      if (!trimmed) {
        return;
      }

      setStreamError(null);

      const {forceNew = false} = options;

      const now = new Date().toISOString();
      const existing =
        !forceNew && activeConversationId
          ? (conversations.find(
              (conversation) => conversation.localId === activeConversationId,
            ) ?? null)
          : null;

      const base: ConversationRecord =
        existing ??
        createEmptyConversation(
          trimmed.slice(0, 60) || 'New conversation',
          now,
        );

      if (!existing && typeof window !== 'undefined') {
        console.info('[chat] created new conversation', base);
      }

      const userMessage: ConversationMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        createdAt: now,
        kind: 'text',
      };

      const title =
        base.messages.length === 0
          ? trimmed.slice(0, 60) || base.title
          : base.title;

      const updated: ConversationRecord = {
        ...base,
        title,
        updatedAt: now,
        messages: limitMessages([...base.messages, userMessage]),
      };

      if (typeof window !== 'undefined') {
        console.info('[chat] sending message', {
          localId: updated.localId,
          sessionId: updated.sessionId,
          text: trimmed,
        });
      }

      setConversations((prev) => {
        const others = prev.filter(
          (conversation) => conversation.localId !== updated.localId,
        );
        const nextState = [updated, ...others];
        if (typeof window !== 'undefined') {
          console.info('[chat] next conversations state', nextState);
        }
        return nextState;
      });

      setActiveConversationId(updated.localId);
      setIsStreaming(true);

      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href);
        if (updated.sessionId) {
          nextUrl.searchParams.set('conversationId', updated.sessionId);
        } else {
          nextUrl.searchParams.delete('conversationId');
        }
        const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
        window.history.replaceState(window.history.state, '', nextHref);
        console.info('[chat] updated url', nextHref);
        console.info('[chat] invoking streamAssistantResponse', {
          localId: updated.localId,
          sessionId: updated.sessionId,
        });
      }

      await streamAssistantResponse({
        conversationLocalId: updated.localId,
        conversationSessionId: updated.sessionId,
        userMessage: trimmed,
      });
    },
    [
      activeConversationId,
      conversations,
      streamAssistantResponse,
      setConversations,
    ],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (initialQueryHandledRef.current) {
      return;
    }

    const question = initialQuestion?.trim();
    if (!question) {
      return;
    }

    initialQueryHandledRef.current = true;

    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('q');
      window.history.replaceState(
        window.history.state,
        '',
        `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
      );
    }

    void sendMessage(question, {forceNew: true});
  }, [initialQuestion, isHydrated, sendMessage]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isStreaming) {
        return;
      }
      const value = inputValue.trim();
      if (!value) {
        return;
      }
      setInputValue('');
      await sendMessage(value);
    },
    [inputValue, isStreaming, sendMessage],
  );

  const handleStop = useCallback(() => {
    streamAbortRef.current?.abort();
  }, []);

  const handleNewConversation = useCallback(() => {
    streamAbortRef.current?.abort();
    setStreamError(null);
    setInputValue('');

    const timestamp = new Date().toISOString();
    const freshConversation = createEmptyConversation(
      'New conversation',
      timestamp,
    );

    setConversations((prev) => {
      const keep = prev.filter(
        (conversation) =>
          conversation.messages.length > 0 || conversation.isPersisted,
      );
      return [freshConversation, ...keep].slice(0, MAX_CONVERSATIONS);
    });
    setActiveConversationId(freshConversation.localId);

    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('conversationId');
      navigate(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
        replace: true,
      });
    }
  }, [navigate]);

  const handleDeleteConversation = useCallback(
    async (conversation: ConversationRecord) => {
      if (
        streamAbortRef.current &&
        conversation.localId === activeConversationId
      ) {
        streamAbortRef.current.abort();
      }

      const meta = {nextActive: null as string | null};
      setConversations((prev) => {
        const filtered = prev.filter(
          (item) => item.localId !== conversation.localId,
        );
        meta.nextActive = filtered[0]?.localId ?? null;
        return filtered;
      });

      if (activeConversationId === conversation.localId) {
        setActiveConversationId(meta.nextActive);
      }

      if (conversation.sessionId) {
        try {
          const response = await fetch(STREAM_ENDPOINT, {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id: conversation.sessionId}),
          });
          if (!response.ok) {
            throw new Error(await response.text());
          }
        } catch (error) {
          console.error('Failed to delete conversation', error);
        }
      }

      if (typeof window !== 'undefined') {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('conversationId');
        navigate(`${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`, {
          replace: true,
        });
      }
    },
    [activeConversationId, navigate, setConversations],
  );

  const suggestedPrompts = useMemo(
    () => [
      'Show me Barcelona home jerseys in stock',
      'I need a gift for a young Barça fan who loves goalkeeping',
      'Build me a full kit for a futsal match',
      'Compare the latest Barcelona training tops',
    ],
    [],
  );

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-80 flex-col border-r border-slate-200 bg-white/80 backdrop-blur lg:flex">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Conversations
          </h2>
          <button
            type="button"
            className="rounded-full border border-transparent bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
            onClick={handleNewConversation}
          >
            New chat
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-6 pt-4">
          {conversations.length === 0 ? (
            <p className="px-4 text-sm text-slate-500">
              Start a conversation to see it here.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {conversations.map((conversation) => {
                const isActive = conversation.localId === activeConversationId;
                return (
                  <li key={conversation.localId}>
                    <div
                      className={cx(
                        'group flex w-full items-stretch gap-2 rounded-xl transition',
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                          : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveConversationId(conversation.localId);
                          setStreamError(null);
                          if (typeof window !== 'undefined') {
                            const nextUrl = new URL(window.location.href);
                            if (conversation.sessionId) {
                              nextUrl.searchParams.set(
                                'conversationId',
                                conversation.sessionId,
                              );
                            } else {
                              nextUrl.searchParams.delete('conversationId');
                            }
                            navigate(
                              `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`,
                              {replace: true},
                            );
                          }
                        }}
                        className="flex flex-1 flex-col gap-1 rounded-xl px-4 py-3 text-left"
                      >
                        <span className="truncate text-sm font-medium">
                          {conversation.title || 'Untitled conversation'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatRelativeTime(conversation.updatedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteConversation(conversation)
                        }
                        className="mr-2 mt-2 self-start rounded-full p-1 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                        aria-label="Delete conversation"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>
      <main className="flex flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Shopping assistant
              </h1>
              <p className="text-sm text-slate-500">
                Ask about Barça gear, outfits, and recommendations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Stop generating
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-full border border-transparent bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                  onClick={handleNewConversation}
                >
                  New chat
                </button>
              )}
            </div>
          </div>
        </header>

        <div
          ref={messageContainerRef}
          className="flex-1 overflow-y-auto bg-slate-50 px-4 py-6 sm:px-6 lg:px-10"
        >
          {messages.length === 0 ? (
            <EmptyState
              prompts={suggestedPrompts}
              isStreaming={isStreaming}
              onPromptClick={(prompt) => {
                if (isStreaming) return;
                setInputValue('');
                void sendMessage(prompt);
              }}
            />
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col gap-4">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isStreaming={
                    isStreaming &&
                    message.role === 'assistant' &&
                    index === messages.length - 1
                  }
                />
              ))}
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-10">
          {streamError && (
            <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {streamError}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-3xl flex-col gap-3"
          >
            <div className="rounded-2xl border border-slate-300 bg-white px-4 py-2 shadow-sm focus-within:border-indigo-500 focus-within:shadow-md">
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ask about products, kits, or styling advice..."
                className="h-14 w-full resize-none border-0 bg-transparent text-base text-slate-900 outline-none focus:ring-0"
                rows={1}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (isStreaming) {
                      return;
                    }
                    const value = inputValue.trim();
                    if (!value) {
                      return;
                    }
                    setInputValue('');
                    void sendMessage(value);
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Powered by Coveo agentic commerce</span>
              <div className="flex items-center gap-3">
                <span>
                  {isStreaming ? 'Generating...' : 'Press Enter to send'}
                </span>
                <button
                  type="submit"
                  disabled={isStreaming || !inputValue.trim()}
                  className={cx(
                    'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                    isStreaming || !inputValue.trim()
                      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500',
                  )}
                >
                  Send
                </button>
              </div>
            </div>
          </form>
        </footer>
      </main>
    </div>
  );
}

function EmptyState({
  prompts,
  isStreaming,
  onPromptClick,
}: {
  prompts: string[];
  isStreaming: boolean;
  onPromptClick: (prompt: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
      <h2 className="text-2xl font-semibold text-slate-900">
        How can I help with your Barça shopping?
      </h2>
      <p className="max-w-xl text-sm">
        Ask me to build outfits, compare products, or find the perfect gear for
        any occasion.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isStreaming}
            className={cx(
              'rounded-full border border-slate-200 px-4 py-2 text-sm shadow-sm transition-colors',
              isStreaming
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600',
            )}
            onClick={() => onPromptClick(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ConversationMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === 'user';
  const kind = message.kind ?? 'text';
  const isAssistant = !isUser;

  if (isAssistant && kind === 'products') {
    return <ProductResultsMessage message={message} />;
  }

  type AssistantBubbleKind = 'text' | 'status' | 'tool' | 'error';
  const normalizedKind =
    kind === 'products' ? 'text' : (kind as AssistantBubbleKind);

  const assistantVariants: Record<AssistantBubbleKind, string> = {
    text: 'bg-white text-slate-900 ring-1 ring-slate-200',
    status: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    tool: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
    error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  };

  const assistantClass =
    assistantVariants[normalizedKind] ?? assistantVariants.text;
  const shouldShowTrailingSpinner =
    isAssistant && isStreaming && normalizedKind === 'text';
  const shouldShowLeadingSpinner =
    isAssistant &&
    isStreaming &&
    normalizedKind !== 'text' &&
    normalizedKind !== 'error';

  return (
    <div
      className={cx('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cx(
          'max-w-xl rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
          isUser ? 'bg-indigo-600 text-white' : assistantClass,
        )}
      >
        <div
          className={cx(
            'whitespace-pre-wrap break-words',
            shouldShowLeadingSpinner ? 'flex items-baseline gap-2' : undefined,
          )}
        >
          {shouldShowLeadingSpinner ? (
            <span
              className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-indigo-200" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </span>
          ) : null}
          <span className={shouldShowLeadingSpinner ? 'flex-1' : undefined}>
            <span className="whitespace-pre-wrap break-words">
              {message.content}
            </span>
          </span>
        </div>
        {shouldShowTrailingSpinner ? (
          <span className="mt-2 inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
        ) : null}
      </div>
    </div>
  );
}

function ProductResultsMessage({message}: {message: ConversationMessage}) {
  const products = message.metadata?.products ?? [];

  if (products.length === 0) {
    return (
      <div className="flex w-full justify-start">
        <div className="max-w-xl rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200">
          <span className="whitespace-pre-wrap break-words">
            {message.content}
          </span>
        </div>
      </div>
    );
  }

  const gridClass = getProductGridClass(products.length);

  return (
    <div className="flex w-full justify-start">
      <div className="w-full rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200">
        {message.content ? (
          <p className="text-sm font-semibold text-slate-900">
            {message.content}
          </p>
        ) : null}
        <div className={cx('mt-4 grid gap-4', gridClass)}>
          {products.map((product, index) => (
            <ProductCard
              key={`${
                product.permanentid ??
                product.clickUri ??
                `${message.id}-${index}`
              }`}
              product={product}
              className="h-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function getProductGridClass(count: number) {
  if (count >= 6) {
    return 'sm:grid-cols-2 xl:grid-cols-3';
  }
  if (count >= 4) {
    return 'sm:grid-cols-2 lg:grid-cols-3';
  }
  if (count >= 2) {
    return 'sm:grid-cols-2';
  }
  return 'sm:grid-cols-1';
}

function mapSummaryToRecord(summary: ConversationSummary): ConversationRecord {
  return {
    localId: generateId(),
    sessionId: summary.id,
    title: summary.title,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    messages: limitMessages(summary.messages ?? []),
    isPersisted: true,
  };
}

function recordToSummary(record: ConversationRecord): ConversationSummary {
  return {
    id: record.sessionId ?? record.localId,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    messages: limitMessages(record.messages),
  };
}

function createEmptyConversation(
  title: string,
  timestamp: string,
): ConversationRecord {
  const label = title.trim() || 'New conversation';
  return {
    localId: generateId(),
    sessionId: null,
    title: label,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
    isPersisted: false,
  };
}

function mergeConversations(
  existing: ConversationRecord[],
  incoming: ConversationRecord[],
): ConversationRecord[] {
  const merged = new Map<string, ConversationRecord>();

  const upsert = (record: ConversationRecord, preserveLocalId?: string) => {
    const key = record.sessionId ?? record.localId;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, {
        ...record,
        localId: preserveLocalId ?? record.localId,
        messages: limitMessages(record.messages),
      });
      return;
    }

    const currentTime = Date.parse(current.updatedAt);
    const incomingTime = Date.parse(record.updatedAt);
    const newer = incomingTime > currentTime ? record : current;
    const older = newer === current ? record : current;

    merged.set(key, {
      ...newer,
      localId: preserveLocalId ?? current.localId,
      sessionId: newer.sessionId ?? older.sessionId ?? null,
      title: newer.title || older.title,
      messages: limitMessages(
        newer.messages.length ? newer.messages : older.messages,
      ),
      isPersisted: newer.isPersisted ?? older.isPersisted,
    });
  };

  for (const record of existing) {
    upsert(record);
  }
  for (const record of incoming) {
    const key = record.sessionId ?? record.localId;
    const localId = merged.get(key)?.localId;
    upsert(record, localId);
  }

  return sortConversations(Array.from(merged.values())).slice(
    0,
    MAX_CONVERSATIONS,
  );
}

function sortConversations(
  records: ConversationRecord[],
): ConversationRecord[] {
  return [...records].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt, undefined, {numeric: true}),
  );
}

function limitMessages(messages: ConversationMessage[]): ConversationMessage[] {
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }
  return messages.slice(-MAX_MESSAGES);
}

function generateId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
