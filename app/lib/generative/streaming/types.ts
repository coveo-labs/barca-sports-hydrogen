import type {Product} from '@coveo/headless-react/ssr-commerce';
import type {ConversationThinkingUpdate} from '~/types/conversation';

export type SessionIdentifier = {
  sessionId: string | null;
};

export type RunStartedEvent = {
  type: 'RUN_STARTED';
  threadId: string;
  runId: string;
  parentRunId?: string;
  input?: unknown;
};

export type RunFinishedEvent = {
  type: 'RUN_FINISHED';
  threadId: string;
  runId: string;
  result?: unknown;
};

export type RunErrorEvent = {
  type: 'RUN_ERROR';
  message: string;
  code?: string;
};

export type TextMessageStartEvent = {
  type: 'TEXT_MESSAGE_START';
  messageId: string;
  role: 'assistant';
};

export type TextMessageContentEvent = {
  type: 'TEXT_MESSAGE_CONTENT';
  messageId: string;
  delta: string;
};

export type TextMessageEndEvent = {
  type: 'TEXT_MESSAGE_END';
  messageId: string;
};

export type TextMessageChunkEvent = {
  type: 'TEXT_MESSAGE_CHUNK';
  messageId?: string;
  role?: 'developer' | 'system' | 'assistant' | 'user';
  delta?: string;
};

export type ToolCallStartEvent = {
  type: 'TOOL_CALL_START';
  toolCallId: string;
  toolCallName: string;
  parentMessageId?: string;
};

export type ToolCallArgsEvent = {
  type: 'TOOL_CALL_ARGS';
  toolCallId: string;
  delta: string;
};

export type ToolCallEndEvent = {
  type: 'TOOL_CALL_END';
  toolCallId: string;
};

export type ToolCallResultEvent = {
  type: 'TOOL_CALL_RESULT';
  messageId: string;
  toolCallId: string;
  content: string;
  role?: 'tool';
};

export type CustomEvent = {
  type: 'CUSTOM';
  name: string;
  value: unknown;
};

export type UnknownEvent = {
  type: 'UNKNOWN';
  event: string;
  payload: unknown;
};

export type ToolResultPayload = {
  message?: string;
  products?: Product[];
};

export type AssistantStreamEvent =
  | RunStartedEvent
  | RunFinishedEvent
  | RunErrorEvent
  | TextMessageStartEvent
  | TextMessageContentEvent
  | TextMessageEndEvent
  | TextMessageChunkEvent
  | ToolCallStartEvent
  | ToolCallArgsEvent
  | ToolCallEndEvent
  | ToolCallResultEvent
  | CustomEvent
  | UnknownEvent;

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
