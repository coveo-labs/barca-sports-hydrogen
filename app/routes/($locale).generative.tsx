import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {FormEvent} from 'react';
import {
  data as reactRouterData,
  useLoaderData,
  useLocation,
  useNavigate,
  useRouteLoaderData,
  type LoaderFunctionArgs,
} from 'react-router';
import type {RootLoader} from '~/root';
import type {ConversationSummary} from '~/types/conversation';
import {
  MAX_CONVERSATIONS,
  type ConversationRecord,
  createEmptyConversation,
} from '~/lib/generative/chat';
import {useAssistantStreaming} from '~/lib/generative/use-assistant-streaming';
import {useConversationState} from '~/lib/generative/use-conversation-state';
import {useConversationUrlSync} from '~/lib/generative/use-conversation-url-sync';
import {useAutoRetry} from '~/lib/generative/use-auto-retry';
import {useMessageDerivation} from '~/lib/generative/use-message-derivation';
import {useSendMessage} from '~/lib/generative/use-send-message';
import {AssistantHeader} from '~/components/Generative/AssistantHeader';
import {ChatInputFooter} from '~/components/Generative/ChatInputFooter';
import {ConversationSidebar} from '~/components/Generative/ConversationSidebar';
import {ConversationTranscript} from '~/components/Generative/ConversationTranscript';
import {EmptyState} from '~/components/Generative/EmptyState';
import {MessageListContainer} from '~/components/Generative/MessageListContainer';
import {useConversationScroll} from '~/lib/generative/use-conversation-scroll';
import {useThinkingState} from '~/lib/generative/use-thinking-state';
import {GenerativeProvider} from '~/lib/generative/context';

const STREAM_ENDPOINT = '/api/agentic/conversation';

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

  useConversationUrlSync({
    activeConversationId,
    conversations,
    isHydrated,
  });

  const initialQueryHandledRef = useRef(false);

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

  const {
    activeConversation,
    messages,
    visibleMessages,
    latestUserMessageId,
    latestStreamingAssistantId,
  } = useMessageDerivation({
    conversations,
    activeConversationId,
    isStreaming,
  });

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

  const {isRetryingRef, resetRetryCount, sendMessageRef} = useAutoRetry({
    streamError,
    isStreaming,
    sessionId: activeConversation?.sessionId ?? null,
    conversationId: activeConversationId,
    setConversations,
    setStreamError,
  });

  const {sendMessage} = useSendMessage({
    conversations,
    activeConversationId,
    setConversations,
    setActiveConversationId,
    setIsStreaming,
    setStreamError,
    clearActiveSnapshot,
    queueScrollToMessage,
    isRetryingRef,
    resetRetryCount,
    sendMessageRef,
    streamAssistantResponse,
  });

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

  const handleSelectConversation = useCallback(
    (conversation: ConversationRecord) => {
      setActiveConversationId(conversation.localId);
      setStreamError(null);
    },
    [setActiveConversationId, setStreamError],
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

  const handleSuggestionClick = useCallback(
    (text: string) => {
      if (isStreaming) return;
      setInputValue('');
      void sendMessage(text);
    },
    [isStreaming, sendMessage],
  );

  return (
    <GenerativeProvider
      conversations={conversations}
      activeConversationId={activeConversationId}
      isStreaming={isStreaming}
      streamError={streamError}
      visibleMessages={visibleMessages}
      latestUserMessageId={latestUserMessageId}
      latestStreamingAssistantId={latestStreamingAssistantId}
      activeSnapshot={activeThinkingSnapshot}
      pendingSnapshot={pendingThinkingSnapshot}
      expandedByMessage={thinkingExpandedByMessage}
      onNewConversation={handleNewConversation}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation}
      onSendMessage={handleSuggestionClick}
      onStop={abortStream}
      onToggleThinking={toggleMessageExpansion}
      onTogglePendingThinking={togglePendingExpansion}
    >
      <div className="flex w-full flex-1 min-h-0 bg-slate-100 border border-slate-300 rounded-lg shadow-sm overflow-hidden">
        <ConversationSidebar />
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <AssistantHeader />

          <MessageListContainer
            containerRef={messageContainerRef}
            isEmpty={messages.length === 0}
            hasContent={visibleMessages.length > 0}
            emptyState={<EmptyState prompts={suggestedPrompts} />}
          >
            <ConversationTranscript />
          </MessageListContainer>

          <ChatInputFooter
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSubmit={handleSubmit}
          />
        </main>
      </div>
    </GenerativeProvider>
  );
}
