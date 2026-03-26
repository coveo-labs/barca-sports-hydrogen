import type {ThinkingUpdateSnapshot} from '~/lib/generative/use-assistant-streaming';
import type {ConversationMessage} from '~/types/conversation';

export type PendingThinkingTranscriptItem = {
  type: 'pending-thinking';
  key: string;
  updates: ThinkingUpdateSnapshot['updates'];
  isExpanded: boolean;
};

export type MessageTranscriptItem = {
  type: 'message';
  message: ConversationMessage;
  isStreamingMessage: boolean;
  thinkingUpdates: ThinkingUpdateSnapshot['updates'];
  showThinkingPanel: boolean;
  isThinkingExpanded: boolean;
};

export type TranscriptItem =
  | PendingThinkingTranscriptItem
  | MessageTranscriptItem;
