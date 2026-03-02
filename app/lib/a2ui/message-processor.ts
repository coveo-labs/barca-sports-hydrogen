/**
 * A2UI Message Processor
 * Main entry point for processing A2UI events from the agent
 */

import {SurfaceManager} from './surface-manager';
import type {
  ActivitySnapshotEvent,
  StateSnapshotEvent,
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
    console.log('[A2UI Processor] Processing ACTIVITY_SNAPSHOT:', {
      messageId: event.messageId,
      replace: event.replace,
      operationCount: event.content.operations?.length || 0,
      operations: event.content.operations,
    });

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
        console.log(
          '[A2UI Processor] replace: true — removing previous surfaces for messageId',
          event.messageId,
          Array.from(previousSurfaces),
        );
        for (const surfaceId of previousSurfaces) {
          this.surfaceManager.deleteSurface(surfaceId);
          this.eventHandler.onSurfaceDelete?.(surfaceId);
        }
        this.activitySurfaces.delete(event.messageId);
      }

      for (const operation of operations) {
        console.log('[A2UI Processor] Processing operation:', operation);
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

      console.log(
        '[A2UI Processor] Updated surfaces:',
        Array.from(updatedSurfaces),
      );
      console.log('[A2UI Processor] Surface manager state:', {
        surfaceIds: this.surfaceManager.getAllSurfaceIds(),
        surfaces: Array.from(this.surfaceManager.getAllSurfaces().values()).map(
          (s) => ({
            surfaceId: s.surfaceId,
            isRendered: s.isRendered,
            root: s.root,
            componentCount: s.components.size,
          }),
        ),
      });

      // Notify handlers of updates
      for (const surfaceId of updatedSurfaces) {
        this.eventHandler.onSurfaceUpdate?.(surfaceId);
      }
    } catch (error) {
      console.error(
        '[A2UI Processor] Error processing ACTIVITY_SNAPSHOT:',
        error,
      );
      this.eventHandler.onError?.(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  /**
   * Process a STATE_SNAPSHOT event
   * (Currently not used for surface rendering, but included for completeness)
   */
  processStateSnapshot(event: StateSnapshotEvent): void {
    // State snapshots are primarily for agent-side state management
    // Not directly used for A2UI rendering in this implementation
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
