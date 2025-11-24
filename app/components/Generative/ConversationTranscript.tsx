import {useMemo} from 'react';
import {MessageBubble} from '~/components/Generative/MessageBubble';
import {ThinkingStatusPanel} from '~/components/Generative/ThinkingStatusPanel';
import type {ThinkingUpdateSnapshot} from '~/lib/use-assistant-streaming';
import type {ConversationMessage} from '~/types/conversation';
import {PENDING_THINKING_KEY} from '~/lib/thinking-constants';

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
}: ConversationTranscriptProps) {
  const renderedConversationItems = useMemo(() => {
    const items: JSX.Element[] = [];
    const queuedProductItems: JSX.Element[] = [];

    const flushQueuedProducts = () => {
      if (!queuedProductItems.length) {
        return;
      }
      items.push(...queuedProductItems.splice(0, queuedProductItems.length));
    };

    const createPendingPanel = (
      key: string,
      updates: ThinkingUpdateSnapshot['updates'],
      isExpanded: boolean,
      onToggle: () => void,
      isStreaming: boolean,
    ) => (
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
                onToggle={() => onToggleThinking(message.id, !isExpanded)}
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
          createPendingPanel(
            'thinking-pending',
            pendingThinkingSnapshot.updates,
            pendingExpanded,
            () => onTogglePendingThinking(!pendingExpanded),
            !pendingThinkingSnapshot.isComplete,
          ),
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
        createPendingPanel(
          'thinking-pending',
          pendingThinkingSnapshot.updates,
          pendingExpanded,
          () => onTogglePendingThinking(!pendingExpanded),
          !pendingThinkingSnapshot.isComplete,
        ),
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
    onToggleThinking,
    onTogglePendingThinking,
  ]);

  return <>{renderedConversationItems}</>;
}
