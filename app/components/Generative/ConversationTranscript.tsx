import {useMemo} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import {MessageBubble} from '~/components/Generative/MessageBubble';
import {ThinkingStatusPanel} from '~/components/Generative/ThinkingStatusPanel';
import type {ThinkingUpdateSnapshot} from '~/lib/use-assistant-streaming';
import type {ConversationMessage} from '~/types/conversation';
import {PENDING_THINKING_KEY} from '~/lib/thinking-constants';
import {registerProducts} from '~/lib/product-index';

export {PENDING_THINKING_KEY} from '~/lib/thinking-constants';

interface ConversationTranscriptProps {
  visibleMessages: ConversationMessage[];
  latestStreamingAssistantId: string | null;
  activeThinkingSnapshot: ThinkingUpdateSnapshot | null;
  pendingThinkingSnapshot: ThinkingUpdateSnapshot | null;
  latestUserMessageId: string | null;
  thinkingExpandedByMessage: Record<string, boolean>;
  onToggleThinking: (messageId: string, next: boolean) => void;
  onTogglePendingThinking: (next: boolean) => void;
}

export function ConversationTranscript({
  visibleMessages,
  latestStreamingAssistantId,
  activeThinkingSnapshot,
  pendingThinkingSnapshot,
  latestUserMessageId,
  thinkingExpandedByMessage,
  onToggleThinking,
  onTogglePendingThinking,
}: Readonly<ConversationTranscriptProps>) {
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
};

function buildConversationItems({
  visibleMessages,
  latestStreamingAssistantId,
  activeThinkingSnapshot,
  pendingThinkingSnapshot,
  latestUserMessageId,
  thinkingExpandedByMessage,
  onToggleThinking,
  onTogglePendingThinking,
}: BuildConversationItemsArgs) {
  const items: JSX.Element[] = [];
  const queuedProductItems: JSX.Element[] = [];
  const knownProducts = new Map<string, Product>();

  for (const message of visibleMessages) {
    processMessage({
      message,
      latestStreamingAssistantId,
      activeThinkingSnapshot,
      pendingThinkingSnapshot,
      latestUserMessageId,
      thinkingExpandedByMessage,
      onToggleThinking,
      onTogglePendingThinking,
      items,
      queuedProductItems,
      knownProducts,
    });
  }

  flushQueuedProductItems(items, queuedProductItems);

  if (
    pendingThinkingSnapshot &&
    latestUserMessageId === null &&
    visibleMessages.length === 0
  ) {
    const pendingExpanded =
      thinkingExpandedByMessage[PENDING_THINKING_KEY] ?? false;
    items.push(
      createPendingPanel({
        key: 'thinking-pending',
        updates: pendingThinkingSnapshot.updates,
        isExpanded: pendingExpanded,
        onToggle: () => onTogglePendingThinking(!pendingExpanded),
        isStreaming: !pendingThinkingSnapshot.isComplete,
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
  isStreaming: boolean;
};

function createPendingPanel({
  key,
  updates,
  isExpanded,
  onToggle,
  isStreaming,
}: CreatePendingPanelArgs) {
  return (
    <div key={key} className="flex w-full flex-col gap-3">
      <div className="flex w-full">
        <ThinkingStatusPanel
          updates={updates}
          isStreaming={isStreaming}
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
  activeThinkingSnapshot: ThinkingUpdateSnapshot | null;
  pendingThinkingSnapshot: ThinkingUpdateSnapshot | null;
  latestUserMessageId: string | null;
  thinkingExpandedByMessage: Record<string, boolean>;
  onToggleThinking: (messageId: string, next: boolean) => void;
  onTogglePendingThinking: (next: boolean) => void;
  items: JSX.Element[];
  queuedProductItems: JSX.Element[];
  knownProducts: Map<string, Product>;
};

function processMessage({
  message,
  latestStreamingAssistantId,
  activeThinkingSnapshot,
  pendingThinkingSnapshot,
  latestUserMessageId,
  thinkingExpandedByMessage,
  onToggleThinking,
  onTogglePendingThinking,
  items,
  queuedProductItems,
  knownProducts,
}: ProcessMessageArgs) {
  const isAssistant = message.role === 'assistant';
  const isProductList = message.kind === 'products';
  const kind = message.kind ?? 'text';
  const isStreamingMessage =
    isAssistant && message.id === latestStreamingAssistantId;
  const showTrailingSpinner = isStreamingMessage && kind === 'text';

  registerProducts(knownProducts, message.metadata?.products);

  const metadataUpdates = message.metadata?.thinkingUpdates ?? [];
  const isActiveSnapshotForMessage =
    activeThinkingSnapshot?.messageId === message.id;
  const updatesForMessage = isActiveSnapshotForMessage
    ? (activeThinkingSnapshot?.updates ?? [])
    : metadataUpdates;
  const hasThinkingUpdates = isAssistant && updatesForMessage.length > 0;
  const storedExpansion = thinkingExpandedByMessage[message.id];
  const isExpanded = storedExpansion ?? false;

  const messageBlock = (
    <div
      key={message.id}
      id={`message-${message.id}`}
      className="flex w-full flex-col gap-3"
    >
      {hasThinkingUpdates ? (
        <div className="flex w-full">
          <ThinkingStatusPanel
            updates={updatesForMessage}
            isStreaming={Boolean(
              isActiveSnapshotForMessage && !activeThinkingSnapshot?.isComplete,
            )}
            isExpanded={isExpanded}
            onToggle={() => onToggleThinking(message.id, !isExpanded)}
          />
        </div>
      ) : null}
      <MessageBubble
        message={message}
        isStreaming={isStreamingMessage}
        showTrailingSpinner={showTrailingSpinner}
        productLookup={knownProducts}
      />
    </div>
  );

  if (isAssistant && isProductList) {
    queuedProductItems.push(messageBlock);
    return;
  }

  items.push(messageBlock);

  maybeAddPendingPanel({
    pendingThinkingSnapshot,
    latestUserMessageId,
    messageId: message.id,
    thinkingExpandedByMessage,
    onTogglePendingThinking,
    items,
  });

  if (isAssistant) {
    flushQueuedProductItems(items, queuedProductItems);
  }
}

type MaybeAddPendingPanelArgs = {
  pendingThinkingSnapshot: ThinkingUpdateSnapshot | null;
  latestUserMessageId: string | null;
  messageId: string;
  thinkingExpandedByMessage: Record<string, boolean>;
  onTogglePendingThinking: (next: boolean) => void;
  items: JSX.Element[];
};

function maybeAddPendingPanel({
  pendingThinkingSnapshot,
  latestUserMessageId,
  messageId,
  thinkingExpandedByMessage,
  onTogglePendingThinking,
  items,
}: MaybeAddPendingPanelArgs) {
  if (
    !pendingThinkingSnapshot ||
    !latestUserMessageId ||
    messageId !== latestUserMessageId
  ) {
    return;
  }

  const pendingExpanded =
    thinkingExpandedByMessage[PENDING_THINKING_KEY] ?? false;

  items.push(
    createPendingPanel({
      key: 'thinking-pending',
      updates: pendingThinkingSnapshot.updates,
      isExpanded: pendingExpanded,
      onToggle: () => onTogglePendingThinking(!pendingExpanded),
      isStreaming: !pendingThinkingSnapshot.isComplete,
    }),
  );
}

function flushQueuedProductItems(target: JSX.Element[], queue: JSX.Element[]) {
  if (!queue.length) {
    return;
  }
  target.push(...queue.splice(0, queue.length));
}
