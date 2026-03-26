import {A2UIMessageProcessor} from '~/lib/generative/a2ui';
import {serializeSurface} from '~/lib/generative/a2ui/surface-manager';
import type {ConversationMessage} from '~/types/conversation';
import type {ActivitySnapshotEvent, AssistantStreamEvent} from '~/lib/generative/streaming';
import type {StructuredResponseAdapter} from './types';

type StreamA2UIAdapterOptions = {
  onError?: (error: string) => void;
};

export class StreamA2UIAdapter implements StructuredResponseAdapter {
  private processor: A2UIMessageProcessor;
  private hasProcessedActivitySnapshot = false;

  constructor(options: StreamA2UIAdapterOptions = {}) {
    this.processor = new A2UIMessageProcessor({
      onError: options.onError,
    });
  }

  processEvent(event: AssistantStreamEvent): boolean {
    if (event.type !== 'ACTIVITY_SNAPSHOT') {
      return false;
    }

    this.hasProcessedActivitySnapshot = true;
    this.processor.processActivitySnapshot(event as ActivitySnapshotEvent);
    return true;
  }

  getMetadataPatch():
    | Partial<ConversationMessage['metadata']>
    | undefined {
    const surfaceManager = this.processor.getSurfaceManager();
    const surfaceIds = surfaceManager.getAllSurfaceIds();

    if (surfaceIds.length === 0) {
      return this.hasProcessedActivitySnapshot
        ? {a2uiSurfaces: {}}
        : undefined;
    }

    const surfaces: NonNullable<ConversationMessage['metadata']>['a2uiSurfaces'] =
      {};

    for (const surfaceId of surfaceIds) {
      const surface = surfaceManager.getSurface(surfaceId);
      surfaces[surfaceId] = serializeSurface(surface);
    }

    return {a2uiSurfaces: surfaces};
  }

  hasSyncedContent(): boolean {
    return this.hasProcessedActivitySnapshot;
  }
}
