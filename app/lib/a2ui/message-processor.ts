/**
 * A2UI Message Processor
 * Main entry point for processing A2UI events from the agent
 */

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
  /** Track which surface IDs were introduced by each activity snapshot messageId. */
  private activitySurfaces = new Map<string, Set<string>>();

  constructor(eventHandler: A2UIEventHandler = {}) {
    this.surfaceManager = new SurfaceManager();
    this.eventHandler = eventHandler;
  }

  /**
   * Process an ACTIVITY_SNAPSHOT event
   */
  processActivitySnapshot(event: ActivitySnapshotEvent): void {
    try {
      const {operations} = event.content;

      // If replace: true and we have seen this messageId before, delete the
      // surfaces that were introduced by the previous snapshot for this id
      // before applying the new ops.  This is what makes skeleton replacement
      // work: the skeleton snapshot and the real snapshot share the same
      // messageId; when the real one arrives with replace: true we discard the
      // skeleton surface(s) and apply the real ops from scratch.
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

      // Track updated surface IDs
      const updatedSurfaces = this.extractUpdatedSurfaceIds(operations);
      this.updatedSurfaceIds = Array.from(updatedSurfaces);

      // Record which surfaces this messageId introduced (for future replace handling)
      const existing =
        this.activitySurfaces.get(event.messageId) ?? new Set<string>();
      for (const sid of updatedSurfaces) {
        existing.add(sid);
      }
      this.activitySurfaces.set(event.messageId, existing);

      // Notify handlers of updates
      for (const surfaceId of updatedSurfaces) {
        this.eventHandler.onSurfaceUpdate?.(surfaceId);
      }
    } catch (error) {
      this.eventHandler.onError?.(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Process a single A2UI operation
   */
  private processOperation(operation: A2UIOperation): void {
    this.surfaceManager.processOperation(operation);

    // Handle deleteSurface notifications
    if ('deleteSurface' in operation) {
      this.eventHandler.onSurfaceDelete?.(operation.deleteSurface.surfaceId);
    }
  }

  /**
   * Get the underlying surface manager
   */
  getSurfaceManager(): SurfaceManager {
    return this.surfaceManager;
  }

  /**
   * Extract surface IDs that were updated in operations
   */
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

  /**
   * Clear all surfaces (useful for cleanup)
   */
  clear(): void {
    const surfaces = this.surfaceManager.getAllSurfaces();
    for (const surfaceId of surfaces.keys()) {
      this.surfaceManager.deleteSurface(surfaceId);
      this.eventHandler.onSurfaceDelete?.(surfaceId);
    }
  }
}
