import {useMemo} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import {MessageBubble} from '~/components/Generative/MessageBubble';
import {ThinkingStatusPanel} from '~/components/Generative/ThinkingStatusPanel';
import type {ThinkingUpdateSnapshot} from '~/lib/generative/use-assistant-streaming';
import type {ConversationMessage} from '~/types/conversation';
import {PENDING_THINKING_KEY} from '~/lib/generative/thinking-constants';
import {registerProducts} from '~/lib/generative/product-index';
import {
  useMessagesContext,
  useStreamingActions,
  useThinkingContext,
} from '~/lib/generative/context';

export function ConversationTranscript() {
  const {visibleMessages, latestStreamingAssistantId, latestUserMessageId} =
    useMessagesContext();
  const {
    activeSnapshot: activeThinkingSnapshot,
    pendingSnapshot: pendingThinkingSnapshot,
    expandedByMessage: thinkingExpandedByMessage,
    onToggleThinking,
    onTogglePendingThinking,
  } = useThinkingContext();
  const {onSendMessage} = useStreamingActions();

  const renderedConversationItems = useMemo(
    () =>
      buildConversationItems({
        visibleMessages,
        latestStreamingAssistantId,
        activeThinkingSnapshot,
        pendingThinkingSnapshot,
        latestUserMessageId,
        thinkingExpandedByMessage,
        onToggleThinking,
        onTogglePendingThinking,
        onFollowUpClick: onSendMessage,
      }),
    [
      visibleMessages,
      latestStreamingAssistantId,
      activeThinkingSnapshot,
      pendingThinkingSnapshot,
      latestUserMessageId,
      thinkingExpandedByMessage,
      onToggleThinking,
      onTogglePendingThinking,
      onSendMessage,
    ],
  );

  return <>{renderedConversationItems}</>;
}

type BuildConversationItemsArgs = {
  visibleMessages: ConversationMessage[];
  latestStreamingAssistantId: string | null;
  activeThinkingSnapshot: ThinkingUpdateSnapshot | null;
  pendingThinkingSnapshot: ThinkingUpdateSnapshot | null;
  latestUserMessageId: string | null;
  thinkingExpandedByMessage: Record<string, boolean>;
  onToggleThinking: (messageId: string, next: boolean) => void;
  onTogglePendingThinking: (next: boolean) => void;
  onFollowUpClick?: (message: string) => void;
};

function buildConversationItems({
  visibleMessages,
  latestStreamingAssistantId,
  activeThinkingSnapshot,
  latestUserMessageId,
  thinkingExpandedByMessage,
  onToggleThinking,
  onTogglePendingThinking,
  onFollowUpClick,
}: BuildConversationItemsArgs) {
  const items: JSX.Element[] = [];
  const queuedProductItems: JSX.Element[] = [];
  const knownProducts = new Map<string, Product>();

  const isActivelyStreaming =
    activeThinkingSnapshot !== null && !activeThinkingSnapshot.isComplete;

  const latestUserMessageIndex = latestUserMessageId
    ? visibleMessages.findIndex((m) => m.id === latestUserMessageId)
    : -1;

  for (let i = 0; i < visibleMessages.length; i++) {
    const message = visibleMessages[i];
    const isCurrentTurnAssistant =
      message.role === 'assistant' &&
      latestUserMessageIndex !== -1 &&
      i > latestUserMessageIndex;

    processMessage({
      message,
      latestStreamingAssistantId,
      isActivelyStreaming,
      isCurrentTurnAssistant,
      thinkingExpandedByMessage,
      onToggleThinking,
      onFollowUpClick,
      items,
      queuedProductItems,
      knownProducts,
    });

    const shouldShowPendingPanel =
      message.role === 'user' &&
      message.id === latestUserMessageId &&
      isActivelyStreaming;

    if (shouldShowPendingPanel) {
      const pendingExpanded =
        thinkingExpandedByMessage[PENDING_THINKING_KEY] ?? false;
      items.push(
        createPendingPanel({
          key: 'thinking-pending',
          updates: activeThinkingSnapshot!.updates,
          isExpanded: pendingExpanded,
          onToggle: () => onTogglePendingThinking(!pendingExpanded),
        }),
      );
    }
  }

  flushQueuedProductItems(items, queuedProductItems);

  if (isActivelyStreaming && visibleMessages.length === 0) {
    const pendingExpanded =
      thinkingExpandedByMessage[PENDING_THINKING_KEY] ?? false;
    items.push(
      createPendingPanel({
        key: 'thinking-pending',
        updates: activeThinkingSnapshot!.updates,
        isExpanded: pendingExpanded,
        onToggle: () => onTogglePendingThinking(!pendingExpanded),
      }),
    );
  }

  return items;
}

type CreatePendingPanelArgs = {
  key: string;
  updates: ThinkingUpdateSnapshot['updates'];
  isExpanded: boolean;
  onToggle: () => void;
};

function createPendingPanel({
  key,
  updates,
  isExpanded,
  onToggle,
}: CreatePendingPanelArgs) {
  return (
    <div key={key} className="flex w-full flex-col gap-3">
      <div className="flex w-full">
        <ThinkingStatusPanel
          updates={updates}
          isStreaming={true}
          isExpanded={isExpanded}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}

type ProcessMessageArgs = {
  message: ConversationMessage;
  latestStreamingAssistantId: string | null;
  isActivelyStreaming: boolean;
  isCurrentTurnAssistant: boolean;
  thinkingExpandedByMessage: Record<string, boolean>;
  onToggleThinking: (messageId: string, next: boolean) => void;
  onFollowUpClick?: (message: string) => void;
  items: JSX.Element[];
  queuedProductItems: JSX.Element[];
  knownProducts: Map<string, Product>;
};

function processMessage({
  message,
  latestStreamingAssistantId,
  isActivelyStreaming,
  isCurrentTurnAssistant,
  thinkingExpandedByMessage,
  onToggleThinking,
  onFollowUpClick,
  items,
  queuedProductItems,
  knownProducts,
}: ProcessMessageArgs): void {
  const isAssistant = message.role === 'assistant';
  const isProductList = message.kind === 'products';
  const isStreamingMessage =
    isAssistant && message.id === latestStreamingAssistantId;

  registerProducts(knownProducts, message.metadata?.products);

  const metadataUpdates = message.metadata?.thinkingUpdates ?? [];
  const hideForCurrentTurn = isActivelyStreaming && isCurrentTurnAssistant;
  const shouldShowThinking =
    isAssistant && metadataUpdates.length > 0 && !hideForCurrentTurn;

  const storedExpansion = thinkingExpandedByMessage[message.id];
  const isExpanded = storedExpansion ?? false;

  const messageBlock = (
    <div
      key={message.id}
      id={`message-${message.id}`}
      className="flex w-full flex-col gap-3"
    >
      {shouldShowThinking ? (
        <div className="flex w-full">
          <ThinkingStatusPanel
            updates={metadataUpdates}
            isStreaming={false}
            isExpanded={isExpanded}
            onToggle={() => onToggleThinking(message.id, !isExpanded)}
          />
        </div>
      ) : null}
      <MessageBubble
        message={message}
        isStreaming={isStreamingMessage}
        productLookup={knownProducts}
        onFollowUpClick={onFollowUpClick}
      />
    </div>
  );

  if (isAssistant && isProductList) {
    queuedProductItems.push(messageBlock);
    return;
  }

  items.push(messageBlock);

  if (isAssistant) {
    flushQueuedProductItems(items, queuedProductItems);
  }
}

function flushQueuedProductItems(target: JSX.Element[], queue: JSX.Element[]) {
  if (!queue.length) {
    return;
  }
  target.push(...queue.splice(0, queue.length));
}
