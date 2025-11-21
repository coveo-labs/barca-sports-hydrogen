import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  data as reactRouterData,
  useLoaderData,
  useNavigate,
  useRouteLoaderData,
  useLocation,
  type LoaderFunctionArgs,
} from 'react-router';
import cx from '~/lib/cx';
import type {RootLoader} from '~/root';
import {
  type ConversationMessage,
  type ConversationSummary,
} from '~/types/conversation';
import {
  MAX_CONVERSATIONS,
  type ConversationRecord,
  createEmptyConversation,
  formatRelativeTime,
  generateId,
  limitMessages,
} from '~/lib/generative-chat';
import {
  useAssistantStreaming,
  type ThinkingUpdateSnapshot,
} from '~/lib/use-assistant-streaming';
import {useConversationState} from '~/lib/use-conversation-state';
import {EmptyState} from '~/components/Generative/EmptyState';
import {MessageBubble} from '~/components/Generative/MessageBubble';
import {ThinkingStatusPanel} from '~/components/Generative/ThinkingStatusPanel';
import {logDebug} from '~/lib/logger';

const STREAM_ENDPOINT = '/api/agentic/conversation';
const PENDING_THINKING_KEY = '__pending_thinking__';

export async function loader({request}: LoaderFunctionArgs) {
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

  return reactRouterData({
    conversations: [] as ConversationSummary[],
    activeConversationId: requestedConversationId ?? null,
    initialQuestion,
  });
}

export default function GenerativeShoppingAssistant() {
  const {
    conversations: initialSummaries,
    activeConversationId: loaderActiveId,
    initialQuestion,
  } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const navigate = useNavigate();
  const location = useLocation();
  const locale = rootData?.locale;

  const {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    isHydrated,
  } = useConversationState({
    initialSummaries,
    loaderActiveId,
  });

  const updateConversationQuery = useCallback(
    (sessionId: string | null) => {
      const searchParams = new URLSearchParams(location.search);
      const currentValue = searchParams.get('conversationId');

      if (sessionId) {
        if (currentValue === sessionId) {
          return;
        }
        searchParams.set('conversationId', sessionId);
      } else {
        if (!currentValue) {
          return;
        }
        searchParams.delete('conversationId');
      }

      const searchString = searchParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: searchString ? `?${searchString}` : '',
          hash: location.hash,
        },
        {replace: true},
      );
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  const initialQueryHandledRef = useRef(false);

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [activeThinkingSnapshot, setActiveThinkingSnapshot] =
    useState<ThinkingUpdateSnapshot | null>(null);
  const [thinkingExpandedByMessage, setThinkingExpandedByMessage] = useState<
    Record<string, boolean>
  >({});
  const clearThinkingUpdates = useCallback(() => {
    setActiveThinkingSnapshot(null);
  }, []);
  const pendingScrollMessageIdRef = useRef<string | null>(null);
  const suspendAutoScrollRef = useRef<boolean>(false);

  useEffect(() => {
    setActiveThinkingSnapshot(null);
    setThinkingExpandedByMessage({});
    pendingScrollMessageIdRef.current = null;
    suspendAutoScrollRef.current = false;
  }, [activeConversationId]);

  const {streamAssistantResponse, abortStream} = useAssistantStreaming({
    locale,
    setConversations,
    setIsStreaming,
    setStreamError,
    endpoint: STREAM_ENDPOINT,
    onThinkingUpdate: (snapshot) => {
      setActiveThinkingSnapshot(snapshot);
    },
  });

  useEffect(() => () => abortStream(), [abortStream]);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.localId === activeConversationId,
      ) ?? null,
    [conversations, activeConversationId],
  );

  const messages = activeConversation?.messages ?? [];
  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          !message.ephemeral ||
          (message.kind !== 'status' && message.kind !== 'tool'),
      ),
    [messages],
  );
  const hasVisibleMessages = visibleMessages.length > 0;
  const pendingThinkingSnapshot =
    activeThinkingSnapshot &&
    (!activeThinkingSnapshot.messageId ||
      !visibleMessages.some(
        (message) => message.id === activeThinkingSnapshot.messageId,
      ))
      ? activeThinkingSnapshot
      : null;
  const latestUserMessageId = useMemo(() => {
    for (let index = visibleMessages.length - 1; index >= 0; index -= 1) {
      const candidate = visibleMessages[index];
      if (!candidate) {
        continue;
      }
      if (candidate.role === 'user') {
        return candidate.id;
      }
    }
    return null;
  }, [visibleMessages]);

  const latestStreamingAssistantId = useMemo(() => {
    if (!isStreaming) {
      return null;
    }
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const candidate = messages[index];
      if (!candidate) {
        continue;
      }
      if (candidate.role !== 'assistant') {
        continue;
      }
      if (candidate.kind === 'status' || candidate.kind === 'tool') {
        continue;
      }
      return candidate.id;
    }
    return null;
  }, [isStreaming, messages]);

  useEffect(() => {
    if (!isStreaming) {
      setActiveThinkingSnapshot(null);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming) {
      return;
    }
    if (!latestStreamingAssistantId) {
      return;
    }
    setThinkingExpandedByMessage((prev) => {
      if (prev[latestStreamingAssistantId]) {
        return prev;
      }
      return {
        ...prev,
        [latestStreamingAssistantId]: true,
      };
    });
  }, [isStreaming, latestStreamingAssistantId]);

  useEffect(() => {
    if (!activeThinkingSnapshot) {
      return;
    }

    const messageId = activeThinkingSnapshot.messageId;
    if (!messageId) {
      setThinkingExpandedByMessage((prev) => {
        if (Object.prototype.hasOwnProperty.call(prev, PENDING_THINKING_KEY)) {
          return prev;
        }
        return {
          ...prev,
          [PENDING_THINKING_KEY]: true,
        };
      });
      return;
    }

    setThinkingExpandedByMessage((prev) => {
      const hasMessageEntry = Object.prototype.hasOwnProperty.call(
        prev,
        messageId,
      );

      if (hasMessageEntry) {
        if (Object.prototype.hasOwnProperty.call(prev, PENDING_THINKING_KEY)) {
          const {[PENDING_THINKING_KEY]: _ignored, ...rest} = prev;
          return rest;
        }
        return prev;
      }

      const {[PENDING_THINKING_KEY]: _ignored, ...rest} = prev;
      return {
        ...rest,
        [messageId]: true,
      };
    });
  }, [activeThinkingSnapshot]);

  useEffect(() => {
    if (activeThinkingSnapshot) {
      return;
    }
    setThinkingExpandedByMessage((prev) => {
      if (!(PENDING_THINKING_KEY in prev)) {
        return prev;
      }
      const {[PENDING_THINKING_KEY]: _ignored, ...rest} = prev;
      return rest;
    });
  }, [activeThinkingSnapshot]);

  const renderedConversationItems = useMemo(() => {
    const items: JSX.Element[] = [];
    const queuedProductItems: JSX.Element[] = [];

    const flushQueuedProducts = () => {
      if (!queuedProductItems.length) {
        return;
      }
      items.push(...queuedProductItems.splice(0, queuedProductItems.length));
    };

    visibleMessages.forEach((message) => {
      const isAssistant = message.role === 'assistant';
      const isProductList = message.kind === 'products';
      const kind = message.kind ?? 'text';
      const isLatestAssistant =
        isAssistant && message.id === latestStreamingAssistantId;
      const isStreamingMessage = isLatestAssistant;
      const showTrailingSpinner = isStreamingMessage && kind === 'text';

      const metadataUpdates = message.metadata?.thinkingUpdates ?? [];
      const isActiveSnapshotForMessage =
        activeThinkingSnapshot?.messageId === message.id;
      const updatesForMessage = isActiveSnapshotForMessage
        ? (activeThinkingSnapshot?.updates ?? [])
        : metadataUpdates;
      const hasThinkingUpdates = isAssistant && updatesForMessage.length > 0;
      const storedExpansion = thinkingExpandedByMessage[message.id];
      const isExpanded =
        storedExpansion !== undefined
          ? storedExpansion
          : Boolean(
              isActiveSnapshotForMessage && !activeThinkingSnapshot?.isComplete,
            );
      const messageDomId = `message-${message.id}`;

      const messageBlock = (
        <div
          key={message.id}
          id={messageDomId}
          className="flex w-full flex-col gap-3"
        >
          {hasThinkingUpdates ? (
            <div className="flex w-full">
              <ThinkingStatusPanel
                updates={updatesForMessage}
                isStreaming={Boolean(
                  isActiveSnapshotForMessage &&
                    !activeThinkingSnapshot?.isComplete,
                )}
                isExpanded={isExpanded}
                onToggle={() =>
                  setThinkingExpandedByMessage((prev) => ({
                    ...prev,
                    [message.id]: !isExpanded,
                  }))
                }
              />
            </div>
          ) : null}
          <MessageBubble
            message={message}
            isStreaming={isStreamingMessage}
            showTrailingSpinner={showTrailingSpinner}
          />
        </div>
      );

      if (isAssistant && isProductList) {
        queuedProductItems.push(messageBlock);
        return;
      }

      items.push(messageBlock);

      if (
        pendingThinkingSnapshot &&
        latestUserMessageId &&
        message.id === latestUserMessageId
      ) {
        const pendingExpanded =
          thinkingExpandedByMessage[PENDING_THINKING_KEY] ?? true;
        items.push(
          <div key="thinking-pending" className="flex w-full flex-col gap-3">
            <div className="flex w-full">
              <ThinkingStatusPanel
                updates={pendingThinkingSnapshot.updates}
                isStreaming={!pendingThinkingSnapshot.isComplete}
                isExpanded={pendingExpanded}
                onToggle={() =>
                  setThinkingExpandedByMessage((prev) => ({
                    ...prev,
                    [PENDING_THINKING_KEY]: !pendingExpanded,
                  }))
                }
              />
            </div>
          </div>,
        );
      }

      if (isAssistant) {
        flushQueuedProducts();
      }
    });

    flushQueuedProducts();

    if (
      pendingThinkingSnapshot &&
      latestUserMessageId === null &&
      visibleMessages.length === 0
    ) {
      const pendingExpanded =
        thinkingExpandedByMessage[PENDING_THINKING_KEY] ?? true;
      items.push(
        <div key="thinking-pending" className="flex w-full flex-col gap-3">
          <div className="flex w-full">
            <ThinkingStatusPanel
              updates={pendingThinkingSnapshot.updates}
              isStreaming={!pendingThinkingSnapshot.isComplete}
              isExpanded={pendingExpanded}
              onToggle={() =>
                setThinkingExpandedByMessage((prev) => ({
                  ...prev,
                  [PENDING_THINKING_KEY]: !pendingExpanded,
                }))
              }
            />
          </div>
        </div>,
      );
    }

    return items;
  }, [
    visibleMessages,
    latestStreamingAssistantId,
    activeThinkingSnapshot,
    pendingThinkingSnapshot,
    latestUserMessageId,
    thinkingExpandedByMessage,
  ]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    const active =
      conversations.find(
        (conversation) => conversation.localId === activeConversationId,
      ) ?? null;
    updateConversationQuery(active?.sessionId ?? null);
  }, [
    activeConversationId,
    conversations,
    isHydrated,
    updateConversationQuery,
  ]);

  const messageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messageContainerRef.current;
    if (!container) {
      return;
    }

    const targetId = pendingScrollMessageIdRef.current;
    if (targetId) {
      const element = document.getElementById(`message-${targetId}`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
        pendingScrollMessageIdRef.current = null;
      } else if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          const retryElement = document.getElementById(`message-${targetId}`);
          if (retryElement instanceof HTMLElement) {
            retryElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest',
            });
            pendingScrollMessageIdRef.current = null;
          }
        });
      }
    }

    if (suspendAutoScrollRef.current) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (suspendAutoScrollRef.current) {
      return;
    }
    const container = messageContainerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [activeThinkingSnapshot]);

  const sendMessage = useCallback(
    async (messageText: string, options: {forceNew?: boolean} = {}) => {
      const trimmed = messageText.trim();
      if (!trimmed) {
        return;
      }

      clearThinkingUpdates();
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

      const hasAssistantHistory = existing
        ? existing.messages.some((message) => message.role === 'assistant')
        : false;
      const shouldShowInitialStatus = !hasAssistantHistory;

      if (!existing) {
        logDebug('created new conversation', base);
      }

      const userMessage: ConversationMessage = {
        id: generateId(),
        role: 'user',
        content: trimmed,
        createdAt: now,
        kind: 'text',
      };

      // Hold auto-scroll so the new user turn stays pinned while the assistant replies.
      pendingScrollMessageIdRef.current = userMessage.id;
      suspendAutoScrollRef.current = true;

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

      logDebug('sending message', {
        localId: updated.localId,
        sessionId: updated.sessionId,
        text: trimmed,
      });

      setConversations((prev) => {
        const others = prev.filter(
          (conversation) => conversation.localId !== updated.localId,
        );
        const nextState = [updated, ...others];
        logDebug(
          'conversation state updated',
          nextState.map((conversation) => ({
            localId: conversation.localId,
            sessionId: conversation.sessionId,
            updatedAt: conversation.updatedAt,
            messageCount: conversation.messages.length,
          })),
        );
        return nextState;
      });

      setActiveConversationId(updated.localId);
      setIsStreaming(true);

      logDebug('invoking stream', {
        localId: updated.localId,
        sessionId: updated.sessionId,
      });

      await streamAssistantResponse({
        conversationLocalId: updated.localId,
        conversationSessionId: updated.sessionId,
        userMessage: trimmed,
        showInitialStatus: shouldShowInitialStatus,
      });
    },
    [
      activeConversationId,
      clearThinkingUpdates,
      conversations,
      streamAssistantResponse,
      setActiveConversationId,
      setConversations,
      setIsStreaming,
      setStreamError,
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

    const searchParams = new URLSearchParams(location.search);
    if (searchParams.has('q')) {
      searchParams.delete('q');
      const searchString = searchParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: searchString ? `?${searchString}` : '',
          hash: location.hash,
        },
        {replace: true},
      );
    }

    void sendMessage(question, {forceNew: true});
  }, [
    initialQuestion,
    isHydrated,
    location.hash,
    location.pathname,
    location.search,
    navigate,
    sendMessage,
  ]);

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
    abortStream();
  }, [abortStream]);

  const handleNewConversation = useCallback(() => {
    abortStream();
    setStreamError(null);
    setInputValue('');
    clearThinkingUpdates();

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
  }, [
    abortStream,
    clearThinkingUpdates,
    setActiveConversationId,
    setConversations,
    setInputValue,
    setStreamError,
  ]);

  const handleDeleteConversation = useCallback(
    (conversation: ConversationRecord) => {
      if (isStreaming && conversation.localId === activeConversationId) {
        abortStream();
      }

      const meta = {nextActive: null as ConversationRecord | null};
      setConversations((prev) => {
        const filtered = prev.filter(
          (item) => item.localId !== conversation.localId,
        );
        meta.nextActive = filtered[0] ?? null;
        return filtered;
      });

      if (activeConversationId === conversation.localId) {
        setActiveConversationId(meta.nextActive?.localId ?? null);
      }
    },
    [
      abortStream,
      activeConversationId,
      isStreaming,
      setActiveConversationId,
      setConversations,
    ],
  );

  const suggestedPrompts = useMemo(
    () => [
      'Suggest a paddleboarding accessory kit for beginners',
      'What safety gear do I need for a twilight kayak tour?',
      'Compare waterproof deck bags for a weekend surf trip',
      'Build a surf travel checklist with board protection and repairs',
    ],
    [],
  );

  return (
    <div className="flex w-full flex-1 min-h-0 bg-slate-100">
      <aside className="hidden w-80 min-h-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur lg:flex">
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
                        'group flex w-full items-start gap-2 rounded-xl transition',
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
                        }}
                        className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl px-4 py-3 text-left"
                      >
                        <span className="break-words text-sm font-medium leading-snug">
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
      <main className="flex flex-1 min-h-0 flex-col">
        <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Barca water sports assistant
              </h1>
              <p className="text-sm text-slate-500">
                Find surf, paddle, and kayak accessories tailored to your next
                session.
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
          className={cx(
            'relative flex-1 overflow-y-auto bg-slate-50 px-4 pt-6 sm:px-6 lg:px-10',
            hasVisibleMessages ? 'pb-32' : 'pb-24',
          )}
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
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
              {hasVisibleMessages ? (
                <div className="flex w-full flex-col gap-5">
                  {renderedConversationItems}
                </div>
              ) : null}
            </div>
          )}
          {hasVisibleMessages ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent backdrop-blur-sm" />
          ) : null}
        </div>

        <footer className="sticky bottom-0 z-20 border-t border-slate-200 bg-white px-4 py-4 shadow-lg sm:px-6 lg:px-10">
          {streamError && (
            <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {streamError}
            </div>
          )}
          <form
            onSubmit={handleSubmit}
            className="mx-auto flex max-w-5xl flex-col gap-3"
          >
            <div className="rounded-2xl border border-slate-300 bg-white px-4 py-2 shadow-sm focus-within:border-indigo-500 focus-within:shadow-md">
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ask about boards, fins, safety gear, or travel prep..."
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
