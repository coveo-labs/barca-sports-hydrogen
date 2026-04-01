import {PENDING_THINKING_KEY} from '~/lib/generative/view/use-thinking-state';
import type {ThinkingUpdateSnapshot} from '~/lib/generative/use-assistant-streaming';
import type {ConversationMessage} from '~/types/conversation';
import type {TranscriptItem} from './types';

type BuildTranscriptItemsArgs = {
  visibleMessages: ConversationMessage[];
  latestStreamingAssistantId: string | null;
  activeThinkingSnapshot: ThinkingUpdateSnapshot | null;
  latestUserMessageId: string | null;
  thinkingExpandedByMessage: Record<string, boolean>;
};

export function buildTranscriptItems({
  visibleMessages,
  latestStreamingAssistantId,
  activeThinkingSnapshot,
  latestUserMessageId,
  thinkingExpandedByMessage,
}: BuildTranscriptItemsArgs): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  const isActivelyStreaming =
    activeThinkingSnapshot !== null && !activeThinkingSnapshot.isComplete;
  const latestUserMessageIndex = latestUserMessageId
    ? visibleMessages.findIndex((message) => message.id === latestUserMessageId)
    : -1;

  for (let index = 0; index < visibleMessages.length; index += 1) {
    const message = visibleMessages[index];
    const isCurrentTurnAssistant =
      message.role === 'assistant' &&
      latestUserMessageIndex !== -1 &&
      index > latestUserMessageIndex;

    items.push(
      createMessageItem({
        message,
        latestStreamingAssistantId,
        isActivelyStreaming,
        isCurrentTurnAssistant,
        thinkingExpandedByMessage,
      }),
    );

    const shouldShowPendingPanel =
      message.role === 'user' &&
      message.id === latestUserMessageId &&
      isActivelyStreaming &&
      activeThinkingSnapshot !== null;

    if (shouldShowPendingPanel) {
      items.push(
        createPendingThinkingItem(
          activeThinkingSnapshot,
          thinkingExpandedByMessage,
        ),
      );
    }
  }

  if (isActivelyStreaming && visibleMessages.length === 0 && activeThinkingSnapshot) {
    items.push(
      createPendingThinkingItem(activeThinkingSnapshot, thinkingExpandedByMessage),
    );
  }

  return items;
}

function createMessageItem({
  message,
  latestStreamingAssistantId,
  isActivelyStreaming,
  isCurrentTurnAssistant,
  thinkingExpandedByMessage,
}: {
  message: ConversationMessage;
  latestStreamingAssistantId: string | null;
  isActivelyStreaming: boolean;
  isCurrentTurnAssistant: boolean;
  thinkingExpandedByMessage: Record<string, boolean>;
}): TranscriptItem {
  const isAssistant = message.role === 'assistant';
  const isStreamingMessage =
    isAssistant && message.id === latestStreamingAssistantId;
  const thinkingUpdates = message.metadata?.thinkingUpdates ?? [];
  const hideForCurrentTurn = isActivelyStreaming && isCurrentTurnAssistant;
  const showThinkingPanel =
    isAssistant && thinkingUpdates.length > 0 && !hideForCurrentTurn;

  return {
    type: 'message',
    message,
    isStreamingMessage,
    thinkingUpdates,
    showThinkingPanel,
    isThinkingExpanded: thinkingExpandedByMessage[message.id] ?? false,
  };
}

function createPendingThinkingItem(
  activeThinkingSnapshot: ThinkingUpdateSnapshot,
  thinkingExpandedByMessage: Record<string, boolean>,
): TranscriptItem {
  return {
    type: 'pending-thinking',
    key: 'thinking-pending',
    updates: activeThinkingSnapshot.updates,
    isExpanded: thinkingExpandedByMessage[PENDING_THINKING_KEY] ?? false,
  };
}
