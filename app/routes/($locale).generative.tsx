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
  generateId,
  limitMessages,
} from '~/lib/generative-chat';
import {useAssistantStreaming} from '~/lib/use-assistant-streaming';
import {useConversationState} from '~/lib/use-conversation-state';
import {EmptyState} from '~/components/Generative/EmptyState';
import {AssistantHeader} from '~/components/Generative/AssistantHeader';
import {ChatInputFooter} from '~/components/Generative/ChatInputFooter';
import {ConversationSidebar} from '~/components/Generative/ConversationSidebar';
import {ConversationTranscript} from '~/components/Generative/ConversationTranscript';
import {useConversationScroll} from '~/lib/use-conversation-scroll';
import {useThinkingState} from '~/lib/use-thinking-state';
import {logDebug} from '~/lib/logger';

const STREAM_ENDPOINT = '/api/agentic/conversation';
const MAX_AUTO_RETRIES = 2;
const AUTO_RETRY_MESSAGE = 'continue';

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
  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);

  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const {streamAssistantResponse, abortStream} = useAssistantStreaming({
    locale,
    setConversations,
    setIsStreaming,
    setStreamError,
    endpoint: STREAM_ENDPOINT,
    onThinkingUpdate: (snapshot) => {
      setActiveSnapshot(snapshot);
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

  const {
    activeSnapshot: activeThinkingSnapshot,
    pendingSnapshot: pendingThinkingSnapshot,
    expandedByMessage: thinkingExpandedByMessage,
    setActiveSnapshot,
    clearActiveSnapshot,
    toggleMessageExpansion,
    togglePendingExpansion,
  } = useThinkingState({
    visibleMessages,
    isStreaming,
    latestStreamingAssistantId,
    activeConversationId,
  });

  const {
    containerRef: messageContainerRef,
    queueScrollToMessage,
    resetScrollState,
  } = useConversationScroll({
    messages,
    activeThinkingSnapshot,
  });

  useEffect(() => {
    resetScrollState();
  }, [activeConversationId, resetScrollState]);

  const handleToggleThinking = useCallback(
    (messageId: string, next: boolean) => {
      toggleMessageExpansion(messageId, next);
    },
    [toggleMessageExpansion],
  );

  const handleTogglePendingThinking = useCallback(
    (next: boolean) => {
      togglePendingExpansion(next);
    },
    [togglePendingExpansion],
  );

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

  const sendMessage = useCallback(
    async (messageText: string, options: {forceNew?: boolean} = {}) => {
      const trimmed = messageText.trim();
      if (!trimmed) {
        return;
      }

      // Reset retry count for new user messages (not for auto-retries)
      if (!isRetryingRef.current) {
        retryCountRef.current = 0;
      }

      clearActiveSnapshot();
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
      queueScrollToMessage(userMessage.id);

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
        sessionId: updated.sessionId,
        userMessage: trimmed,
        showInitialStatus: shouldShowInitialStatus,
      });
    },
    [
      activeConversationId,
      clearActiveSnapshot,
      conversations,
      streamAssistantResponse,
      setActiveConversationId,
      setConversations,
      setIsStreaming,
      setStreamError,
    ],
  );

  // Auto-retry on error: send "continue" to the agent up to MAX_AUTO_RETRIES times
  useEffect(() => {
    if (!streamError || isStreaming || isRetryingRef.current) {
      return;
    }

    if (retryCountRef.current >= MAX_AUTO_RETRIES) {
      logDebug('auto-retry limit reached', {
        retryCount: retryCountRef.current,
        maxRetries: MAX_AUTO_RETRIES,
      });
      return;
    }

    if (!activeConversation?.sessionId) {
      logDebug('cannot auto-retry: no session id');
      return;
    }

    const removeLastErrorMessage = () => {
      setConversations((prev) =>
        prev.map((conversation) => {
          if (conversation.localId !== activeConversationId) {
            return conversation;
          }
          const messages = [...conversation.messages];
          for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].kind === 'error') {
              messages.splice(i, 1);
              break;
            }
          }
          return {...conversation, messages};
        }),
      );
    };

    const performAutoRetry = async () => {
      retryCountRef.current += 1;
      isRetryingRef.current = true;

      logDebug('performing auto-retry', {
        attempt: retryCountRef.current,
        maxRetries: MAX_AUTO_RETRIES,
        conversationId: activeConversationId,
      });

      removeLastErrorMessage();
      setStreamError(null);

      try {
        await sendMessage(AUTO_RETRY_MESSAGE);
      } finally {
        isRetryingRef.current = false;
      }
    };

    // Small delay before retry to avoid rapid loops
    const timeoutId = setTimeout(() => {
      void performAutoRetry();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    streamError,
    isStreaming,
    activeConversation?.sessionId,
    activeConversationId,
    sendMessage,
    setConversations,
  ]);

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

  const handleSelectConversation = useCallback(
    (conversation: ConversationRecord) => {
      setActiveConversationId(conversation.localId);
      setStreamError(null);
    },
    [setActiveConversationId, setStreamError],
  );

  const handleSendMessage = useCallback(
    (message: string) => {
      void sendMessage(message);
    },
    [sendMessage],
  );

  const handleNewConversation = useCallback(() => {
    abortStream();
    setStreamError(null);
    setInputValue('');
    clearActiveSnapshot();

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
    clearActiveSnapshot,
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
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={handleNewConversation}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
      />
      <main className="flex flex-1 min-h-0 flex-col">
        <AssistantHeader
          isStreaming={isStreaming}
          onStop={handleStop}
          onNewConversation={handleNewConversation}
        />

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
                  <ConversationTranscript
                    visibleMessages={visibleMessages}
                    latestStreamingAssistantId={latestStreamingAssistantId}
                    activeThinkingSnapshot={activeThinkingSnapshot}
                    pendingThinkingSnapshot={pendingThinkingSnapshot}
                    latestUserMessageId={latestUserMessageId}
                    thinkingExpandedByMessage={thinkingExpandedByMessage}
                    onToggleThinking={handleToggleThinking}
                    onTogglePendingThinking={handleTogglePendingThinking}
                    onFollowUpClick={(message) => {
                      if (isStreaming) return;
                      setInputValue('');
                      void sendMessage(message);
                    }}
                  />
                </div>
              ) : null}
            </div>
          )}
          {hasVisibleMessages ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-slate-50 via-slate-50/80 to-transparent backdrop-blur-sm" />
          ) : null}
        </div>

        <ChatInputFooter
          streamError={streamError}
          inputValue={inputValue}
          isStreaming={isStreaming}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          onSendMessage={handleSendMessage}
        />
      </main>
    </div>
  );
}
