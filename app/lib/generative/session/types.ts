import type {StructuredResponseAdapter} from '~/lib/generative/adapters/a2ui/types';
import type {ThinkingUpdateSnapshot, AssistantStreamEvent} from '~/lib/generative/streaming';
import type {ConversationMessage} from '~/types/conversation';
import type {ConversationStateUpdater} from './conversation-state-updater';

export type AssistantStreamSessionOptions = {
  initialSessionId: string | null;
  initialConversationToken: string | null;
  updater: ConversationStateUpdater;
  structuredResponseAdapter?: StructuredResponseAdapter;
  onThinkingUpdate?: (snapshot: ThinkingUpdateSnapshot) => void;
};

export type StreamHandlingResult = {
  abort?: boolean;
  complete?: boolean;
  error?: string;
};

export type StreamEventContext = {
  event: AssistantStreamEvent;
};

export type AssistantEphemeralMessageOptions = {
  metadata?: ConversationMessage['metadata'];
  ephemeral?: boolean;
};
