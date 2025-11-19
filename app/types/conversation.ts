import type {Product} from '@coveo/headless-react/ssr-commerce';

export type ConversationRole = 'user' | 'assistant' | 'system' | 'tool';

export type ConversationMessageKind =
  | 'text'
  | 'status'
  | 'tool'
  | 'products'
  | 'error';

export interface ConversationMessageMetadata {
  products?: Product[];
}

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: string;
  kind?: ConversationMessageKind;
  ephemeral?: boolean;
  metadata?: ConversationMessageMetadata;
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
}

export const CONVERSATIONS_SESSION_KEY = 'agentic:conversations';
