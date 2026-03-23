import type {Dispatch, SetStateAction} from 'react';
import type {ConversationRecord} from '~/lib/generative/chat';
import {sortConversations} from '~/lib/generative/chat';
import type {ConversationMessage} from '~/types/conversation';

type ConversationStateUpdaterOptions = {
  conversationLocalId: string;
  setConversations: Dispatch<SetStateAction<ConversationRecord[]>>;
};

type UpdateAssistantMessageOptions = {
  content?: string;
  kind?: ConversationMessage['kind'];
  metadata?: ConversationMessage['metadata'];
  sessionId?: string | null;
  updatedAt?: string;
};

export class ConversationStateUpdater {
  private conversationLocalId: string;
  private setConversations: Dispatch<SetStateAction<ConversationRecord[]>>;

  constructor({
    conversationLocalId,
    setConversations,
  }: ConversationStateUpdaterOptions) {
    this.conversationLocalId = conversationLocalId;
    this.setConversations = setConversations;
  }

  ensureAssistantMessage(
    message: ConversationMessage,
    updatedAt = message.createdAt,
  ) {
    this.applyUpdate((conversation) => {
      if (conversation.messages.some((entry) => entry.id === message.id)) {
        return conversation;
      }

      return {
        ...conversation,
        updatedAt,
        messages: [...conversation.messages, message],
      };
    });
  }

  appendAssistantMessage(message: ConversationMessage, updatedAt = message.createdAt) {
    this.applyUpdate((conversation) => ({
      ...conversation,
      updatedAt,
      messages: [...conversation.messages, message],
    }));
  }

  updateAssistantMessage(
    messageId: string,
    {
      content,
      kind,
      metadata,
      sessionId,
      updatedAt = new Date().toISOString(),
    }: UpdateAssistantMessageOptions,
  ) {
    this.applyUpdate((conversation) => {
      const messages = [...conversation.messages];
      const index = messages.findIndex((message) => message.id === messageId);
      if (index === -1) {
        return conversation;
      }

      messages[index] = {
        ...messages[index],
        ...(content !== undefined ? {content} : {}),
        ...(kind !== undefined ? {kind} : {}),
        ...(metadata !== undefined ? {metadata} : {}),
      };

      return {
        ...conversation,
        updatedAt,
        ...(sessionId !== undefined ? {sessionId} : {}),
        messages,
      };
    });
  }

  patchAssistantMetadata(
    messageId: string,
    metadata: ConversationMessage['metadata'] | undefined,
  ) {
    if (metadata === undefined) {
      return;
    }

    this.applyUpdate((conversation) => {
      const messages = [...conversation.messages];
      const index = messages.findIndex((message) => message.id === messageId);
      if (index === -1) {
        return conversation;
      }

      messages[index] = {
        ...messages[index],
        metadata,
      };

      return {
        ...conversation,
        messages,
      };
    });
  }

  updateConversationSession(sessionId: string) {
    this.applyUpdate((conversation) => ({
      ...conversation,
      sessionId,
    }));
  }

  finalizeConversation(sessionId: string | null) {
    const updatedAt = new Date().toISOString();

    this.applyUpdate((conversation) => {
      const nextSessionId = sessionId ?? conversation.sessionId;

      return {
        ...conversation,
        sessionId: nextSessionId,
        updatedAt,
        isPersisted: conversation.isPersisted || Boolean(nextSessionId),
      };
    });
  }

  private applyUpdate(
    mutator: (conversation: ConversationRecord) => ConversationRecord,
  ) {
    this.setConversations((prev) =>
      sortConversations(
        prev.map((conversation) =>
          conversation.localId === this.conversationLocalId
            ? mutator(conversation)
            : conversation,
        ),
      ),
    );
  }
}
