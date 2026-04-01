import {useMemo} from 'react';
import {MessageBubble} from '~/components/Generative/ResponseContent';
import {ThinkingStatusPanel} from '~/components/Generative/ThinkingStatusPanel';
import {
  useMessagesContext,
  useStreamingActions,
  useThinkingContext,
} from '~/lib/generative/context';
import {buildTranscriptItems} from '~/lib/generative/transcript/build-transcript-items';
import type {
  MessageTranscriptItem,
  PendingThinkingTranscriptItem,
} from '~/lib/generative/transcript/types';

export function ConversationTranscript() {
  const {visibleMessages, latestStreamingAssistantId, latestUserMessageId} =
    useMessagesContext();
  const {
    activeSnapshot: activeThinkingSnapshot,
    expandedByMessage: thinkingExpandedByMessage,
    onToggleThinking,
    onTogglePendingThinking,
  } = useThinkingContext();
  const {onSendMessage} = useStreamingActions();

  const renderedConversationItems = useMemo(
    () =>
      buildTranscriptItems({
        visibleMessages,
        latestStreamingAssistantId,
        activeThinkingSnapshot,
        latestUserMessageId,
        thinkingExpandedByMessage,
      }),
    [
      visibleMessages,
      latestStreamingAssistantId,
      activeThinkingSnapshot,
      latestUserMessageId,
      thinkingExpandedByMessage,
    ],
  );

  return (
    <>
      {renderedConversationItems.map((item) =>
        item.type === 'pending-thinking'
          ? renderPendingThinkingItem(item, onTogglePendingThinking)
          : renderMessageItem(item, onToggleThinking, onSendMessage),
      )}
    </>
  );
}

function renderPendingThinkingItem(
  item: PendingThinkingTranscriptItem,
  onTogglePendingThinking: (next: boolean) => void,
) {
  return (
    <div key={item.key} className="flex w-full flex-col gap-3">
      <div className="flex w-full">
        <ThinkingStatusPanel
          updates={item.updates}
          isStreaming={true}
          isExpanded={item.isExpanded}
          onToggle={() => onTogglePendingThinking(!item.isExpanded)}
        />
      </div>
    </div>
  );
}

function renderMessageItem(
  item: MessageTranscriptItem,
  onToggleThinking: (messageId: string, next: boolean) => void,
  onFollowUpClick?: (message: string) => void,
) {
  const messageBlock = (
    <div
      key={item.message.id}
      id={`message-${item.message.id}`}
      className="flex w-full flex-col gap-3"
    >
      {item.showThinkingPanel ? (
        <div className="flex w-full">
          <ThinkingStatusPanel
            updates={item.thinkingUpdates}
            isStreaming={false}
            isExpanded={item.isThinkingExpanded}
            onToggle={() =>
              onToggleThinking(item.message.id, !item.isThinkingExpanded)
            }
          />
        </div>
      ) : null}
      <MessageBubble
        message={item.message}
        isStreaming={item.isStreamingMessage}
        onFollowUpClick={onFollowUpClick}
      />
    </div>
  );

  return messageBlock;
}
