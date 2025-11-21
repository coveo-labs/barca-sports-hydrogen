import {useCallback, useRef} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import type {
  ConversationMessage,
  ConversationThinkingUpdate,
} from '~/types/conversation';
import {
  type ConversationRecord,
  extractAssistantChunk,
  findEventBoundary,
  generateId,
  getBoundaryLength,
  limitMessages,
  parseToolResultPayload,
  sortConversations,
} from '~/lib/generative-chat';
import {logDebug, logError, logInfo, logWarn} from '~/lib/logger';

const CONNECTING_STATUS_MESSAGE =
  'Connecting to the Barca water sports assistant...';
const DEFAULT_STATUS_MESSAGE =
  'Assistant is preparing your Barca recommendations...';
const DEFAULT_TOOL_PROGRESS_MESSAGE =
  'Assistant is fetching fresh data...';
const TOOL_RESULT_FALLBACK_MESSAGE =
  'Got the latest catalog results - summarizing now.';
const CONNECTION_ERROR_MESSAGE =
  'Unable to reach the shopping assistant right now.';
const INTERRUPTED_ERROR_MESSAGE =
  'The assistant stopped responding before finishing. Please try again.';
const GENERIC_ERROR_MESSAGE =
  'The assistant ran into a problem. Please try again in a moment.';

export type ThinkingUpdateSnapshot = {
  updates: ConversationThinkingUpdate[];
  isComplete: boolean;
  messageId: string | null;
};

type StreamArgs = {
  conversationLocalId: string;
  conversationSessionId: string | null;
  userMessage: string;
  showInitialStatus?: boolean;
  onThinkingUpdate?: (snapshot: ThinkingUpdateSnapshot) => void;
};

type UseAssistantStreamingOptions = {
  locale: unknown;
  setConversations: Dispatch<SetStateAction<ConversationRecord[]>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setStreamError: Dispatch<SetStateAction<string | null>>;
  endpoint: string;
  onThinkingUpdate?: (snapshot: ThinkingUpdateSnapshot) => void;
};

type SessionIdentifiers = {
  conversationSessionId: string | null;
  sessionId: string | null;
};

type StatusPayload = SessionIdentifiers & {
  text: string | null;
  traceId: string | null;
  raw: unknown;
};

type ToolResultPayload = SessionIdentifiers & {
  message: string | null;
  products: ReturnType<typeof parseToolResultPayload>['products'];
  raw: unknown;
};

type ErrorPayload = SessionIdentifiers & {
  message: string;
  raw: unknown;
};

type MessagePayload = SessionIdentifiers & {
  value: unknown;
  raw: unknown;
};

type AssistantStreamEvent =
  | {type: 'turn_started'; payload: SessionIdentifiers & {raw: unknown}}
  | {type: 'turn_complete'; payload: SessionIdentifiers & {raw: unknown}}
  | {type: 'status'; payload: StatusPayload}
  | {type: 'status_update'; payload: StatusPayload}
  | {type: 'tool_invocation'; payload: StatusPayload}
  | {type: 'tool_result'; payload: ToolResultPayload}
  | {type: 'error'; payload: ErrorPayload}
  | {type: 'message'; payload: MessagePayload}
  | {type: 'unknown'; event: string; payload: SessionIdentifiers & {raw: unknown}};

export function useAssistantStreaming({
  locale,
  setConversations,
  setIsStreaming,
  setStreamError,
  endpoint,
  onThinkingUpdate,
}: UseAssistantStreamingOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const streamAssistantResponse = useCallback(
    async ({
      conversationLocalId,
      conversationSessionId,
      userMessage,
      showInitialStatus,
      onThinkingUpdate: streamCallback,
    }: StreamArgs) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const updateCallback = streamCallback ?? onThinkingUpdate;

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
      let productMessageId: string | null = null;
      let capturedErrorMessage: string | null = null;
      let turnCompleted = false;
      const seenStatusTraces = new Set<string>();
      const seenStatusMessages = new Set<string>();
      let thinkingUpdates: ConversationThinkingUpdate[] = [];

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

      const emitThinkingSnapshot = () => {
        if (!updateCallback) {
          return;
        }
        updateCallback({
          updates: [...thinkingUpdates],
          isComplete: turnCompleted,
          messageId: assistantMessageId,
        });
      };

      const resetThinkingState = () => {
        thinkingUpdates = [];
        turnCompleted = false;
        emitThinkingSnapshot();
      };

      const syncThinkingMetadata = () => {
        if (!assistantMessageId) {
          emitThinkingSnapshot();
          return;
        }
        const snapshot = [...thinkingUpdates];
        applyUpdate((conversation) => {
          const messages = [...conversation.messages];
          const index = messages.findIndex(
            (message) => message.id === assistantMessageId,
          );
          if (index === -1) {
            return conversation;
          }
          messages[index] = {
            ...messages[index],
            metadata: {
              ...(messages[index].metadata ?? {}),
              thinkingUpdates: snapshot,
            },
          };
          return {...conversation, messages};
        });
        emitThinkingSnapshot();
      };

      const recordThinkingUpdate = (
        text: string,
        kind: ConversationThinkingUpdate['kind'],
      ) => {
        const trimmed = text.trim();
        if (!trimmed) {
          return;
        }
        const last = thinkingUpdates[thinkingUpdates.length - 1];
        if (last && last.text === trimmed && last.kind === kind) {
          return;
        }
        const update: ConversationThinkingUpdate = {
          id: generateId(),
          text: trimmed,
          kind,
          timestamp: new Date().toISOString(),
        };
        thinkingUpdates = [...thinkingUpdates.slice(-24), update];
        syncThinkingMetadata();
      };

      const pushAssistantMessage = (
        content: string,
        kind: ConversationMessage['kind'],
        options: {
          metadata?: ConversationMessage['metadata'];
          ephemeral?: boolean;
        } = {},
      ) => {
        const timestamp = new Date().toISOString();
        const messageId = generateId();
        applyUpdate((conversation) => ({
          ...conversation,
          updatedAt: timestamp,
          messages: [
            ...conversation.messages,
            {
              id: messageId,
              role: 'assistant',
              content,
              createdAt: timestamp,
              kind,
              ephemeral: options.ephemeral ?? false,
              metadata: options.metadata,
            },
          ],
        }));
        return messageId;
      };

      const pushErrorBubble = (text: string) => {
        pushAssistantMessage(text, 'error');
      };

      const updateResolvedSession = (payload: SessionIdentifiers) => {
        const sessionValue =
          payload.conversationSessionId ?? payload.sessionId ?? null;
        if (!sessionValue || sessionValue === resolvedSessionId) {
          return;
        }
        resolvedSessionId = sessionValue;
        applyUpdate((conversation) => ({
          ...conversation,
          sessionId: sessionValue,
        }));
      };

      try {
        logInfo('streaming request start', {
          conversationLocalId,
          conversationSessionId,
          endpoint,
        });

        resetThinkingState();

        const initialStatusMessage = showInitialStatus
          ? CONNECTING_STATUS_MESSAGE
          : DEFAULT_STATUS_MESSAGE;

        pushAssistantMessage(initialStatusMessage, 'status', {
          ephemeral: true,
        });
        recordThinkingUpdate(initialStatusMessage, 'status');
        const response = await fetch(endpoint, {
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
          logError('streaming response missing body', {
            status: response.status,
            conversationLocalId,
            conversationSessionId,
          });
          const errorText = await response.text().catch(() => '');
          const message = errorText || CONNECTION_ERROR_MESSAGE;
          capturedErrorMessage = message;
          recordThinkingUpdate(message, 'status');
          turnCompleted = true;
          syncThinkingMetadata();
          pushErrorBubble(message);
          setStreamError(message);
          throw new Error(message);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        const processEvent = (event: {event: string; data: string}) => {
          if (!event.data) return;

          const parsedEvent = parseAssistantStreamEvent(event);

          const updateSessionFromPayload = (payload: SessionIdentifiers) => {
            updateResolvedSession(payload);
          };

          switch (parsedEvent.type) {
            case 'turn_started': {
              updateSessionFromPayload(parsedEvent.payload);
              return;
            }
            case 'status':
            case 'status_update': {
              updateSessionFromPayload(parsedEvent.payload);

              const statusText = parsedEvent.payload.text ?? '';
              if (!statusText) {
                return;
              }

              const traceId = parsedEvent.payload.traceId;
              if (traceId) {
                if (seenStatusTraces.has(traceId)) {
                  return;
                }
                seenStatusTraces.add(traceId);
              } else {
                if (seenStatusMessages.has(statusText)) {
                  return;
                }
                seenStatusMessages.add(statusText);
              }

              recordThinkingUpdate(statusText, 'status');

              if (assistantMessageId) {
                return;
              }

              pushAssistantMessage(statusText, 'status', {ephemeral: true});
              return;
            }
            case 'tool_invocation': {
              updateSessionFromPayload(parsedEvent.payload);

              const toolText = parsedEvent.payload.text ?? '';
              if (!toolText) {
                return;
              }
              if (seenStatusMessages.has(toolText)) {
                return;
              }
              seenStatusMessages.add(toolText);

              recordThinkingUpdate(toolText, 'tool');

              if (assistantMessageId) {
                return;
              }

              pushAssistantMessage(toolText, 'tool', {ephemeral: true});
              return;
            }
            case 'tool_result': {
              updateSessionFromPayload(parsedEvent.payload);
              const successNote =
                parsedEvent.payload.message ??
                resolveDisplayText(
                  parsedEvent.payload.raw,
                  TOOL_RESULT_FALLBACK_MESSAGE,
                );

              recordThinkingUpdate(successNote, 'tool');

              if (!assistantMessageId) {
                pushAssistantMessage(successNote, 'tool', {ephemeral: true});
              }

              const productList = parsedEvent.payload.products ?? [];
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
                    content: '',
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
              updateSessionFromPayload(parsedEvent.payload);

              const errorText = parsedEvent.payload.message;
              capturedErrorMessage = errorText;
              recordThinkingUpdate(errorText, 'status');
              turnCompleted = true;
              syncThinkingMetadata();
              pushErrorBubble(errorText);
              setStreamError(errorText);
              controller.abort();
              return;
            }
            case 'turn_complete': {
              updateSessionFromPayload(parsedEvent.payload);
              turnCompleted = true;
              syncThinkingMetadata();
              setIsStreaming(false);
              return;
            }
            case 'message': {
              updateSessionFromPayload(parsedEvent.payload);
              const chunk = extractAssistantChunk(parsedEvent.payload.value);
              if (chunk === null) {
                return;
              }

              accumulatedContent += chunk;
              const contentSnapshot = accumulatedContent;
              let createdAssistantMessage = false;

              applyUpdate((conversation) => {
                const messages = [...conversation.messages];
                if (!assistantMessageId) {
                  assistantMessageId = generateId();
                  createdAssistantMessage = true;
                  messages.push({
                    id: assistantMessageId,
                    role: 'assistant',
                    content: contentSnapshot,
                    createdAt: new Date().toISOString(),
                    kind: 'text',
                    metadata:
                      thinkingUpdates.length > 0
                        ? {thinkingUpdates: [...thinkingUpdates]}
                        : undefined,
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
              if (createdAssistantMessage) {
                syncThinkingMetadata();
              }
              return;
            }
            case 'unknown': {
              logWarn('unknown SSE event', {
                event: parsedEvent.event,
                payload: parsedEvent.payload.raw,
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

        if (latestSnapshot) {
          const snapshot: ConversationRecord = latestSnapshot;
          const finalSnapshot: ConversationRecord = {
            ...snapshot,
            sessionId: resolvedSessionId ?? snapshot.sessionId,
            updatedAt: new Date().toISOString(),
            isPersisted:
              snapshot.isPersisted ||
              Boolean(resolvedSessionId ?? snapshot.sessionId),
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
        }

        if (!turnCompleted && !capturedErrorMessage) {
          const interruptionMessage = INTERRUPTED_ERROR_MESSAGE;
          capturedErrorMessage = interruptionMessage;
          recordThinkingUpdate(interruptionMessage, 'status');
          turnCompleted = true;
          syncThinkingMetadata();
          pushErrorBubble(interruptionMessage);
          setStreamError(interruptionMessage);
        }
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          if (capturedErrorMessage) {
            logWarn('streaming request aborted after server-side error', {
              conversationLocalId,
              conversationSessionId: resolvedSessionId ?? conversationSessionId,
            });
          } else {
            logInfo('streaming request aborted', {
              conversationLocalId,
              conversationSessionId: resolvedSessionId ?? conversationSessionId,
            });
          }
          return;
        }
        logError('streaming request error', {
          error,
          conversationLocalId,
          conversationSessionId: resolvedSessionId ?? conversationSessionId,
        });
        if (!capturedErrorMessage) {
          setStreamError(GENERIC_ERROR_MESSAGE);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
        logDebug('streaming request finished', {
          conversationLocalId,
          conversationSessionId: resolvedSessionId ?? conversationSessionId,
        });
      }
    },
    [
      endpoint,
      locale,
      setConversations,
      setIsStreaming,
      setStreamError,
      onThinkingUpdate,
    ],
  );

  return {streamAssistantResponse, abortStream};
}

function parseAssistantStreamEvent({
  event,
  data,
}: {
  event: string;
  data: string;
}): AssistantStreamEvent {
  const name = event || 'message';
  let payload: unknown = data;
  if (data) {
    try {
      payload = JSON.parse(data);
    } catch {
      payload = data;
    }
  }

  const session = extractSessionIdentifiers(payload);

  switch (name) {
    case 'turn_started':
      return {type: 'turn_started', payload: {...session, raw: payload}};
    case 'turn_complete':
      return {type: 'turn_complete', payload: {...session, raw: payload}};
    case 'status':
    case 'status_update':
      return {
        type: name,
        payload: {
          ...session,
          text: resolveDisplayText(payload, DEFAULT_STATUS_MESSAGE),
          traceId: extractTraceId(payload),
          raw: payload,
        },
      };
    case 'tool_invocation':
      return {
        type: 'tool_invocation',
        payload: {
          ...session,
          text: resolveDisplayText(payload, DEFAULT_TOOL_PROGRESS_MESSAGE),
          traceId: extractTraceId(payload),
          raw: payload,
        },
      };
    case 'tool_result': {
      const result = parseToolResultPayload(payload);
      return {
        type: 'tool_result',
        payload: {
          ...session,
          message: result.message,
          products: result.products,
          raw: payload,
        },
      };
    }
    case 'error':
      return {
        type: 'error',
        payload: {
          ...session,
          message: resolveDisplayText(payload, GENERIC_ERROR_MESSAGE),
          raw: payload,
        },
      };
    case 'message':
      return {
        type: 'message',
        payload: {
          ...session,
          value: payload,
          raw: payload,
        },
      };
    default:
      return {type: 'unknown', event: name, payload: {...session, raw: payload}};
  }
}

function extractSessionIdentifiers(value: unknown): SessionIdentifiers {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return {
      conversationSessionId:
        typeof record.conversationSessionId === 'string'
          ? record.conversationSessionId
          : null,
      sessionId:
        typeof record.sessionId === 'string' ? record.sessionId : null,
    };
  }
  return {conversationSessionId: null, sessionId: null};
}

function resolveDisplayText(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || fallback;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = ['message', 'content', 'status', 'detail', 'text'];
    for (const key of keys) {
      const candidate = record[key];
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
  }

  return fallback;
}

function extractTraceId(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidate = record.traceId;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}