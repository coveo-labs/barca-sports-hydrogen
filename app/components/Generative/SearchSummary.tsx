import {useCallback, useEffect, useState, useMemo} from 'react';
import type {FormEvent} from 'react';
import {ChevronDownIcon, ChevronUpIcon} from '@heroicons/react/20/solid';
import {SparklesIcon} from '@heroicons/react/24/outline';
import {useRouteLoaderData} from 'react-router';
import type {RootLoader} from '~/root';
import {createEmptyConversation, type ConversationRecord} from '~/lib/generative/chat';
import {useAssistantStreaming} from '~/lib/generative/use-assistant-streaming';
import {useMessageDerivation} from '~/lib/generative/use-message-derivation';
import {useThinkingState} from '~/lib/generative/use-thinking-state';
import {useConversationScroll} from '~/lib/generative/use-conversation-scroll';
import {ProductChip} from '~/components/Products/ProductChip';
import {CarouselSkeleton} from '~/components/Generative/Skeletons';
import {MessageBubble} from '~/components/Generative/MessageBubble';
import {ThinkingStatusPanel} from '~/components/Generative/ThinkingStatusPanel';
import {registerProducts} from '~/lib/generative/product-index';
import {PENDING_THINKING_KEY} from '~/lib/generative/thinking-constants';
import type {Product} from '@coveo/headless-react/ssr-commerce';

interface SearchSummaryProps {
  searchQuery: string;
}

export function SearchSummary({searchQuery}: SearchSummaryProps) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const locale = rootData?.locale;

  const [isExpanded, setIsExpanded] = useState(false);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState(searchQuery);
  const [inputValue, setInputValue] = useState('');

  const {
    visibleMessages,
    activeConversation,
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
    resetScrollState,
  } = useConversationScroll({
    messages: isExpanded ? visibleMessages : [],
    activeThinkingSnapshot: isExpanded ? activeThinkingSnapshot : null,
  });

  useEffect(() => {
    if (!isExpanded) {
      return;
    }
    resetScrollState();

    const container = messageContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [activeConversationId, isExpanded, resetScrollState, messageContainerRef]);

  const {streamAssistantResponse, abortStream} = useAssistantStreaming({
    locale,
    setConversations,
    setIsStreaming,
    setStreamError,
    endpoint: '/api/agentic/conversation',
    onThinkingUpdate: (snapshot) => {
      setActiveSnapshot(snapshot);
    },
  });

  // Find the latest assistant message with products
  const latestAssistantMessage = [...visibleMessages]
    .reverse()
    .find((msg) => msg.role === 'assistant');

  const products = latestAssistantMessage?.metadata?.products ?? [];
  const hasContent = visibleMessages.length > 0;

  // Check if we're actively thinking (has thinking snapshot and no products yet)
  const isActivelyThinking =
    activeThinkingSnapshot !== null &&
    !activeThinkingSnapshot.isComplete &&
    products.length === 0;

  const isActivelyStreaming =
    activeThinkingSnapshot !== null && !activeThinkingSnapshot.isComplete;

  const latestUserMessageId = useMemo(() => {
    for (let i = visibleMessages.length - 1; i >= 0; i--) {
      if (visibleMessages[i]?.role === 'user') {
        return visibleMessages[i]?.id ?? null;
      }
    }
    return null;
  }, [visibleMessages]);

  const latestUserIndex = useMemo(() => {
    return latestUserMessageId
      ? visibleMessages.findIndex((msg) => msg.id === latestUserMessageId)
      : -1;
  }, [latestUserMessageId, visibleMessages]);

  // Create product lookup map
  const productLookup = useMemo(() => {
    const map = new Map<string, Product>();
    if (products.length > 0) {
      registerProducts(map, products as Product[]);
    }
    return map;
  }, [products]);

  // Initialize or reinitialize conversation when query changes
  useEffect(() => {
    if (!searchQuery) return;

    // If query changed, reset everything
    if (searchQuery !== currentQuery) {
      setConversations([]);
      setActiveConversationId(null);
      setIsExpanded(false);
      setStreamError(null);
      setCurrentQuery(searchQuery);
      setInputValue('');
      clearActiveSnapshot();
      return; // Exit and let effect re-run with new query
    }

    const timestamp = new Date().toISOString();
    const conversation = createEmptyConversation(searchQuery, timestamp);

    setConversations([conversation]);
    setActiveConversationId(conversation.localId);

    // Send the search query as a message
    const sendQuery = async () => {
      const timestamp = new Date().toISOString();
      const userMessage = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: searchQuery,
        timestamp,
        createdAt: timestamp,
        kind: undefined,
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.localId === conversation.localId
            ? {...conv, messages: [...conv.messages, userMessage]}
            : conv,
        ),
      );

      await streamAssistantResponse({
        conversationLocalId: conversation.localId,
        userMessage: searchQuery,
        sessionId: conversation.sessionId,
      });
    };

    void sendQuery();

    return () => {
      abortStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, currentQuery]);

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const sendFollowUpMessage = useCallback(
    async (message: string) => {
      if (!message || !activeConversation) return;

      const timestamp = new Date().toISOString();
      const userMessage = {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: message,
        timestamp,
        createdAt: timestamp,
        kind: undefined,
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.localId === activeConversation.localId
            ? {...conv, messages: [...conv.messages, userMessage]}
            : conv,
        ),
      );

      setInputValue('');

      await streamAssistantResponse({
        conversationLocalId: activeConversation.localId,
        userMessage: message,
        sessionId: activeConversation.sessionId,
      });
    },
    [activeConversation, setConversations, streamAssistantResponse],
  );

  const handleFollowUpSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = inputValue.trim();
      if (!value) return;

      await sendFollowUpMessage(value);
    },
    [inputValue, sendFollowUpMessage],
  );

  const handleFollowUpClick = useCallback(
    (message: string) => {
      void sendFollowUpMessage(message);
    },
    [sendFollowUpMessage],
  );

  // Show loading state immediately on mount
  if (!hasContent) {
    return (
      <div className="bg-white pb-8">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="h-5 w-5 text-indigo-600 animate-pulse" />
              <h3 className="text-lg font-semibold text-gray-900">
                AI Summary
              </h3>
            </div>
            <CarouselSkeleton />
          </div>
        </div>
      </div>
    );
  }

  // Don't render if there's an error
  if (streamError) {
    return null;
  }

  return (
    <div className="bg-white pb-8">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 overflow-hidden">
          {/* Header with toggle and inline product chips */}
          <div className="px-6 py-4">
            <div className="w-full flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <SparklesIcon className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-medium text-gray-900">
                    Intent Recommendations
                  </h3>
                  {isActivelyThinking && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </div>

                {/* Inline product chips - shown when collapsed */}
                {!isExpanded && products.length > 0 && (
                  <div className="flex gap-2 flex-wrap min-w-0 ml-4">
                    {products.slice(0, 4).map((product: Product) => (
                      <ProductChip key={product.ec_product_id} product={product} />
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleToggle}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
                aria-expanded={isExpanded}
              >
                {isExpanded ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>

          {/* Expanded state: Show full conversation with chat input */}
          {isExpanded && (
            <div className="bg-white">
              {/* Messages */}
              <div
                ref={messageContainerRef}
                className="px-6 py-4 space-y-4 max-h-[600px] overflow-y-auto"
              >
                {visibleMessages.map((message, index) => {
                  const isAssistant = message.role === 'assistant';
                  const isStreamingMessage =
                    isAssistant && message.id === latestStreamingAssistantId;
                  const isCurrentTurnAssistant =
                    isAssistant && latestUserIndex !== -1 && index > latestUserIndex;

                  const metadataUpdates = message.metadata?.thinkingUpdates ?? [];
                  const hideForCurrentTurn =
                    isActivelyStreaming && isCurrentTurnAssistant;
                  const shouldShowThinking =
                    isAssistant && metadataUpdates.length > 0 && !hideForCurrentTurn;

                  const storedExpansion = thinkingExpandedByMessage[message.id];
                  const isExpanded = storedExpansion ?? false;

                  const shouldShowPendingPanel =
                    message.role === 'user' &&
                    message.id === latestUserMessageId &&
                    isActivelyStreaming &&
                    pendingThinkingSnapshot?.updates?.length;

                  return (
                    <div key={message.id} className="flex w-full flex-col gap-3">
                      {shouldShowThinking ? (
                        <div className="flex w-full">
                          <ThinkingStatusPanel
                            updates={metadataUpdates}
                            isStreaming={false}
                            isExpanded={isExpanded}
                            onToggle={() =>
                              toggleMessageExpansion(message.id, !isExpanded)
                            }
                          />
                        </div>
                      ) : null}
                      <MessageBubble
                        message={message}
                        isStreaming={isStreamingMessage}
                        productLookup={productLookup}
                        onFollowUpClick={handleFollowUpClick}
                      />
                      {shouldShowPendingPanel ? (
                        <div className="flex w-full">
                          <ThinkingStatusPanel
                            updates={pendingThinkingSnapshot!.updates}
                            isStreaming={true}
                            isExpanded={
                              thinkingExpandedByMessage[PENDING_THINKING_KEY] ??
                              false
                            }
                            onToggle={() =>
                              togglePendingExpansion(
                                !(
                                  thinkingExpandedByMessage[
                                    PENDING_THINKING_KEY
                                  ] ?? false
                                ),
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {/* Chat input footer */}
              <div className="border-t border-slate-200 bg-gray-50 px-6 py-4">
                {streamError && (
                  <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    {streamError}
                  </div>
                )}
                <form onSubmit={handleFollowUpSubmit} className="flex flex-col gap-3">
                  <div className="relative rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:shadow-md">
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Ask a follow-up question..."
                      className="block w-full resize-none rounded-2xl border-0 px-4 py-3 pr-12 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
                      rows={2}
                      disabled={isStreaming}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (!isStreaming && inputValue.trim()) {
                            handleFollowUpSubmit(e as any);
                          }
                        }
                      }}
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      {isStreaming ? (
                        <button
                          type="button"
                          onClick={abortStream}
                          className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                        >
                          Stop
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={!inputValue.trim()}
                          className="inline-flex items-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Send
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Press Enter to send your follow-up
                  </p>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
