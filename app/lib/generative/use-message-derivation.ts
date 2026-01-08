import {useMemo} from 'react';
import type {ConversationMessage} from '~/types/conversation';
import type {ConversationRecord} from '~/lib/generative/chat';

const EMPTY_MESSAGES: ConversationMessage[] = [];

type UseMessageDerivationOptions = {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  isStreaming: boolean;
};

type UseMessageDerivationReturn = {
  activeConversation: ConversationRecord | null;
  messages: ConversationMessage[];
  visibleMessages: ConversationMessage[];
  hasVisibleMessages: boolean;
  latestUserMessageId: string | null;
  latestStreamingAssistantId: string | null;
};

export function useMessageDerivation({
  conversations,
  activeConversationId,
  isStreaming,
}: UseMessageDerivationOptions): UseMessageDerivationReturn {
  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.localId === activeConversationId,
      ) ?? null,
    [conversations, activeConversationId],
  );

  const messages = activeConversation?.messages ?? EMPTY_MESSAGES;

  const visibleMessages = useMemo(
    () =>
      messages.filter((message) => {
        // Hide auto-retry messages from the UI
        if (message.isAutoRetry) {
          return false;
        }
        return (
          !message.ephemeral ||
          (message.kind !== 'status' && message.kind !== 'tool')
        );
      }),
    [messages],
  );

  const hasVisibleMessages = visibleMessages.length > 0;

  const latestUserMessageId = useMemo(() => {
    for (let index = visibleMessages.length - 1; index >= 0; index -= 1) {
      const candidate = visibleMessages[index];
      if (candidate?.role === 'user') {
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
      if (candidate?.role !== 'assistant') {
        continue;
      }
      if (candidate.kind === 'status' || candidate.kind === 'tool') {
        continue;
      }
      return candidate.id;
    }
    return null;
  }, [isStreaming, messages]);

  return {
    activeConversation,
    messages,
    visibleMessages,
    hasVisibleMessages,
    latestUserMessageId,
    latestStreamingAssistantId,
  };
}
