import type {Product} from '@coveo/headless-react/ssr-commerce';
import type {ConversationThinkingUpdate} from '~/types/conversation';

export type SessionIdentifier = {
  sessionId: string | null;
};

export type StatusPayload = SessionIdentifier & {
  message: string;
};

export type ToolResultPayload = SessionIdentifier & {
  message: string;
  products: Product[];
};

export type ErrorPayload = SessionIdentifier & {
  message: string;
};

export type MessagePayload = SessionIdentifier & {
  message: string;
};

export type AssistantStreamEvent =
  | {type: 'turn_started'; payload: SessionIdentifier}
  | {type: 'turn_complete'; payload: SessionIdentifier}
  | {type: 'status'; payload: StatusPayload}
  | {type: 'status_update'; payload: StatusPayload}
  | {type: 'tool_invocation'; payload: StatusPayload}
  | {type: 'tool_result'; payload: ToolResultPayload}
  | {type: 'error'; payload: ErrorPayload}
  | {type: 'message'; payload: MessagePayload}
  | {type: 'unknown'; event: string; payload: SessionIdentifier & {message: unknown}};

export type ThinkingUpdateSnapshot = {
  updates: ConversationThinkingUpdate[];
  isComplete: boolean;
  messageId: string | null;
};

export type StreamArgs = {
  conversationLocalId: string;
  sessionId: string | null;
  userMessage: string;
  showInitialStatus?: boolean;
  onThinkingUpdate?: (snapshot: ThinkingUpdateSnapshot) => void;
};
