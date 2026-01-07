import {useCallback} from 'react';
import type {Dispatch, MutableRefObject, SetStateAction} from 'react';
import type {ConversationMessage} from '~/types/conversation';
import {
  type ConversationRecord,
  createEmptyConversation,
  generateId,
} from '~/lib/generative/chat';
import {logDebug} from '~/lib/logger';

type UseSendMessageOptions = {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  setConversations: Dispatch<SetStateAction<ConversationRecord[]>>;
  setActiveConversationId: Dispatch<SetStateAction<string | null>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setStreamError: Dispatch<SetStateAction<string | null>>;
  clearActiveSnapshot: () => void;
  queueScrollToMessage: (messageId: string) => void;
  isRetryingRef: MutableRefObject<boolean>;
  resetRetryCount: () => void;
  sendMessageRef: MutableRefObject<((message: string) => Promise<void>) | null>;
  streamAssistantResponse: (args: {
    conversationLocalId: string;
    sessionId: string | null;
    userMessage: string;
    showInitialStatus?: boolean;
  }) => Promise<void>;
};

type SendMessageOptions = {
  forceNew?: boolean;
  isAutoRetry?: boolean;
};

export function useSendMessage({
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
}: UseSendMessageOptions) {
  const sendMessage = useCallback(
    async (messageText: string, options: SendMessageOptions = {}) => {
      const trimmed = messageText.trim();
      if (!trimmed) {
        return;
      }

      if (!isRetryingRef.current) {
        resetRetryCount();
      }

      clearActiveSnapshot();
      setStreamError(null);

      const {forceNew = false, isAutoRetry = false} = options;

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
        ...(isAutoRetry && {isAutoRetry: true}),
      };

      queueScrollToMessage(userMessage.id);

      const title =
        base.messages.length === 0
          ? trimmed.slice(0, 60) || base.title
          : base.title;

      const updated: ConversationRecord = {
        ...base,
        title,
        updatedAt: now,
        messages: [...base.messages, userMessage],
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
      isRetryingRef,
      resetRetryCount,
      queueScrollToMessage,
    ],
  );

  sendMessageRef.current = sendMessage;

  return {sendMessage};
}
