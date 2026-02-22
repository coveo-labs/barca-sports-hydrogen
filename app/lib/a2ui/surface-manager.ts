/**
 * Surface Manager
 * Manages A2UI surfaces with their component buffers and data models
 */

import {DataModelStore} from './data-model-store';
import type {A2UIOperation} from '~/lib/generative/streaming';

export type ComponentDefinition = {
  id: string;
  catalogComponentId: string;
  component: Record<string, unknown>;
  children?: Record<string, unknown>;
};

export type SurfaceState = {
  surfaceId: string;
  root: string | null;
  catalogId: string | null;
  components: Map<string, ComponentDefinition>;
  dataModel: DataModelStore;
  isRendered: boolean;
};

/**
 * Serializable version of SurfaceState for React state storage
 */
export type SerializableSurfaceState = {
  surfaceId: string;
  root: string | null;
  catalogId: string | null;
  components: Array<ComponentDefinition>;
  dataModelData: Record<string, unknown>;
  isRendered: boolean;
};

/**
 * Convert SurfaceState to serializable format
 */
export function serializeSurface(
  surface: SurfaceState,
): SerializableSurfaceState {
  const serialized: SerializableSurfaceState = {
    surfaceId: surface.surfaceId,
    root: surface.root,
    catalogId: surface.catalogId,
    components: Array.from(surface.components.values()),
    dataModelData: surface.dataModel.getAll(),
    isRendered: surface.isRendered,
  };
  console.log('[serializeSurface] Serialized surface:', {
    surfaceId: serialized.surfaceId,
    componentCount: serialized.components.length,
    dataModelKeys: Object.keys(serialized.dataModelData),
    isRendered: serialized.isRendered,
  });
  return serialized;
}

/**
 * Convert serializable format back to SurfaceState
 */
export function deserializeSurface(
  serialized: SerializableSurfaceState,
): SurfaceState {
  console.log('[deserializeSurface] Input:', serialized);

  const dataModel = new DataModelStore();
  // Reconstruct data model from serialized data
  if (
    serialized.dataModelData &&
    typeof serialized.dataModelData === 'object'
  ) {
    try {
      const dataEntries = Object.entries(serialized.dataModelData).map(
        ([key, value]) => ({
          key,
          value,
        }),
      );
      console.log('[deserializeSurface] Data entries:', dataEntries);
      if (dataEntries.length > 0) {
        dataModel.update(dataEntries as any);
      }
    } catch (error) {
      console.error(
        '[deserializeSurface] Error processing dataModelData:',
        error,
      );
    }
  }

  const components = new Map<string, ComponentDefinition>();
  if (Array.isArray(serialized.components)) {
    for (const component of serialized.components) {
      if (component && component.id) {
        components.set(component.id, component);
      }
    }
  }

  const surface: SurfaceState = {
    surfaceId: serialized.surfaceId || 'unknown',
    root: serialized.root || null,
    catalogId: serialized.catalogId || null,
    components,
    dataModel,
    isRendered: serialized.isRendered ?? false,
  };

  console.log('[deserializeSurface] Output:', {
    surfaceId: surface.surfaceId,
    root: surface.root,
    componentCount: surface.components.size,
    dataModelKeys: Object.keys(surface.dataModel.getAll()),
  });

  return surface;
}

export class SurfaceManager {
  private surfaces = new Map<string, SurfaceState>();

  /**
   * Get or create a surface
   */
  getSurface(surfaceId: string): SurfaceState {
    if (!this.surfaces.has(surfaceId)) {
      this.surfaces.set(surfaceId, {
        surfaceId,
        root: null,
        catalogId: null,
        components: new Map(),
        dataModel: new DataModelStore(),
        isRendered: false,
      });
    }
    return this.surfaces.get(surfaceId)!;
  }

  /**
   * Check if surface exists
   */
  hasSurface(surfaceId: string): boolean {
    return this.surfaces.has(surfaceId);
  }

  /**
   * Get all surfaces
   */
  getAllSurfaces(): Map<string, SurfaceState> {
    return this.surfaces;
  }

  /**
   * Get all surface IDs
   */
  getAllSurfaceIds(): string[] {
    return Array.from(this.surfaces.keys());
  }

  /**
   * Delete a surface
   */
  deleteSurface(surfaceId: string): void {
    this.surfaces.delete(surfaceId);
  }

  /**
   * Process beginRendering operation
   */
  beginRendering(operation: {
    surfaceId: string;
    root: string;
    catalogId?: string;
  }): void {
    const surface = this.getSurface(operation.surfaceId);
    surface.root = operation.root;
    surface.catalogId = operation.catalogId || null;
    surface.isRendered = true;
  }

  /**
   * Process surfaceUpdate operation
   */
  surfaceUpdate(operation: {surfaceId: string; components: Array<any>}): void {
    const surface = this.getSurface(operation.surfaceId);

    for (const component of operation.components) {
      // Extract catalogComponentId from the component data
      // Component structure: {id: "foo", component: {"ComponentName": {...props}}}
      let catalogComponentId = 'unknown';
      if (component.component && typeof component.component === 'object') {
        const keys = Object.keys(component.component);
        if (keys.length > 0) {
          catalogComponentId = keys[0]; // First key is the component type
        } else {
          console.error('Component has empty component object:', component);
        }
      } else {
        console.error('Component missing component property:', component);
      }

      const componentDef: ComponentDefinition = {
        id: component.id,
        catalogComponentId,
        component: component.component || {},
        children: component.children,
      };
      surface.components.set(component.id, componentDef);
    }
  }

  /**
   * Process dataModelUpdate operation
   */
  dataModelUpdate(operation: {
    surfaceId: string;
    data: Array<{
      key: string;
      value?: any;
      valueString?: string;
      valueNumber?: number;
      valueBoolean?: boolean;
      valueMap?: Array<any>;
      valueList?: Array<any>;
    }>;
  }): void {
    const surface = this.getSurface(operation.surfaceId);
    surface.dataModel.update(operation.data as any);
  }

  /**
   * Get component by ID from a surface
   */
  getComponent(
    surfaceId: string,
    componentId: string,
  ): ComponentDefinition | null {
    const surface = this.getSurface(surfaceId);
    return surface.components.get(componentId) || null;
  }

  /**
   * Get data model for a surface
   */
  getDataModel(surfaceId: string): DataModelStore {
    const surface = this.getSurface(surfaceId);
    return surface.dataModel;
  }

  /**
   * Process any A2UI operation
   */
  processOperation(operation: A2UIOperation): void {
    if ('beginRendering' in operation) {
      this.beginRendering(operation.beginRendering);
    } else if ('surfaceUpdate' in operation) {
      this.surfaceUpdate(operation.surfaceUpdate);
    } else if ('dataModelUpdate' in operation) {
      this.dataModelUpdate(operation.dataModelUpdate);
    } else if ('deleteSurface' in operation) {
      this.deleteSurface(operation.deleteSurface.surfaceId);
    }
  }
}
