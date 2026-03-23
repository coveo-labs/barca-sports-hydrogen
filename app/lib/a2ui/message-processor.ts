import {SurfaceManager} from './surface-manager';
import type {
  ActivitySnapshotEvent,
  A2UIOperation,
} from '~/lib/generative/streaming';

export type A2UIEventHandler = {
  onSurfaceUpdate?: (surfaceId: string) => void;
  onSurfaceDelete?: (surfaceId: string) => void;
  onError?: (error: string) => void;
};

export class A2UIMessageProcessor {
  private surfaceManager: SurfaceManager;
  private eventHandler: A2UIEventHandler;
  private updatedSurfaceIds: string[] = [];
  private activitySurfaces = new Map<string, Set<string>>();

  constructor(eventHandler: A2UIEventHandler = {}) {
    this.surfaceManager = new SurfaceManager();
    this.eventHandler = eventHandler;
  }

  processActivitySnapshot(event: ActivitySnapshotEvent): void {
    try {
      const {operations} = event.content;

      if (event.replace && this.activitySurfaces.has(event.messageId)) {
        const previousSurfaces = this.activitySurfaces.get(event.messageId)!;
        for (const surfaceId of previousSurfaces) {
          this.surfaceManager.deleteSurface(surfaceId);
          this.eventHandler.onSurfaceDelete?.(surfaceId);
        }
        this.activitySurfaces.delete(event.messageId);
      }

      for (const operation of operations) {
        this.processOperation(operation);
      }

      const updatedSurfaces = this.extractUpdatedSurfaceIds(operations);
      this.updatedSurfaceIds = Array.from(updatedSurfaces);

      const existing =
        this.activitySurfaces.get(event.messageId) ?? new Set<string>();
      for (const sid of updatedSurfaces) {
        existing.add(sid);
      }
      this.activitySurfaces.set(event.messageId, existing);

      for (const surfaceId of updatedSurfaces) {
        this.eventHandler.onSurfaceUpdate?.(surfaceId);
      }
    } catch (error) {
      this.eventHandler.onError?.(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private processOperation(operation: A2UIOperation): void {
    this.surfaceManager.processOperation(operation);

    if ('deleteSurface' in operation) {
      this.eventHandler.onSurfaceDelete?.(operation.deleteSurface.surfaceId);
    }
  }

  getSurfaceManager(): SurfaceManager {
    return this.surfaceManager;
  }

  private extractUpdatedSurfaceIds(operations: A2UIOperation[]): Set<string> {
    const surfaceIds = new Set<string>();

    for (const operation of operations) {
      if ('beginRendering' in operation) {
        surfaceIds.add(operation.beginRendering.surfaceId);
      } else if ('surfaceUpdate' in operation) {
        surfaceIds.add(operation.surfaceUpdate.surfaceId);
      } else if ('dataModelUpdate' in operation) {
        surfaceIds.add(operation.dataModelUpdate.surfaceId);
      }
    }

    return surfaceIds;
  }

  clear(): void {
    const surfaces = this.surfaceManager.getAllSurfaces();
    for (const surfaceId of surfaces.keys()) {
      this.surfaceManager.deleteSurface(surfaceId);
      this.eventHandler.onSurfaceDelete?.(surfaceId);
    }
  }
}
