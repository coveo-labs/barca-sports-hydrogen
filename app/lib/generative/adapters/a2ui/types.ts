import type {ConversationMessage} from '~/types/conversation';
import type {AssistantStreamEvent} from '~/lib/generative/streaming';

export type StructuredResponseAdapter = {
  processEvent(event: AssistantStreamEvent): boolean;
  getMetadataPatch():
    | Partial<ConversationMessage['metadata']>
    | undefined;
  hasSyncedContent(): boolean;
};
