import type {
  ConversationMessage,
  ConversationSummary,
} from '~/types/conversation';
import {generateId} from './id';

export type ConversationRecord = {
  localId: string;
  sessionId: string | null;
  conversationToken: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
  isPersisted?: boolean;
};

export function mapSummaryToRecord(
  summary: ConversationSummary,
): ConversationRecord {
  const messages = (summary.messages ?? []).map((message) => ({
    ...message,
    kind: message.kind ?? 'text',
  })) as ConversationMessage[];

  return {
    localId: generateId(),
    sessionId: summary.id,
    conversationToken: summary.conversationToken ?? null,
    title: summary.title,
    createdAt: summary.createdAt,
    updatedAt: summary.updatedAt,
    messages,
    isPersisted: true,
  };
}

export function recordToSummary(
  record: ConversationRecord,
): ConversationSummary {
  return {
    id: record.sessionId ?? record.localId,
    conversationToken: record.conversationToken,
    title: record.title,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    messages: record.messages,
  };
}

export function createEmptyConversation(
  title: string,
  timestamp: string,
): ConversationRecord {
  const label = title.trim() || 'New conversation';
  return {
    localId: generateId(),
    sessionId: null,
    conversationToken: null,
    title: label,
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
    isPersisted: false,
  };
}
