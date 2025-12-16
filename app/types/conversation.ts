import type {Product} from '@coveo/headless-react/ssr-commerce';

export type ConversationRole = 'user' | 'assistant' | 'system' | 'tool';

export type ConversationMessageKind =
  | 'text'
  | 'status'
  | 'tool'
  | 'products'
  | 'error';

export type ConversationThinkingUpdateKind = 'status' | 'tool';

export interface ConversationThinkingUpdate {
  id: string;
  text: string;
  kind: ConversationThinkingUpdateKind;
  timestamp: string;
}

export interface ConversationMessageMetadata {
  products?: Product[];
  thinkingUpdates?: ConversationThinkingUpdate[];
}

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
  kind: ConversationMessageKind;
  ephemeral?: boolean;
  metadata?: ConversationMessageMetadata;
}

/**
 * Serialized conversation format used for localStorage persistence.
 * Use `mapSummaryToRecord` and `recordToSummary` in generative-chat.ts
 * to convert between this and `ConversationRecord`.
 */
export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

export const CONVERSATIONS_SESSION_KEY = 'agentic:conversations';
