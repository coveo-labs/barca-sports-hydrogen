import type {Product} from '@coveo/headless-react/ssr-commerce';
import type {SerializableSurfaceState} from '~/lib/a2ui/surface-manager';

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
  a2uiSurfaces?: Record<string, SerializableSurfaceState>;
}

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
  kind: ConversationMessageKind;
  ephemeral?: boolean;
  isAutoRetry?: boolean;
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
