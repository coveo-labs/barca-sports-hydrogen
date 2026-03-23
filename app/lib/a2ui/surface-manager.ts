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

export type SerializableSurfaceState = {
  surfaceId: string;
  root: string | null;
  catalogId: string | null;
  components: Array<ComponentDefinition>;
  dataModelData: Record<string, unknown>;
  isRendered: boolean;
};

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
  return serialized;
}

export function deserializeSurface(
  serialized: SerializableSurfaceState,
): SurfaceState {
  const dataModel = new DataModelStore();
  if (
    serialized.dataModelData &&
    typeof serialized.dataModelData === 'object'
  ) {
    try {
      dataModel.setAll(serialized.dataModelData as Record<string, any>);
    } catch (error) {
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

  return surface;
}

export class SurfaceManager {
  private surfaces = new Map<string, SurfaceState>();

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

  hasSurface(surfaceId: string): boolean {
    return this.surfaces.has(surfaceId);
  }

  getAllSurfaces(): Map<string, SurfaceState> {
    return this.surfaces;
  }

  getAllSurfaceIds(): string[] {
    return Array.from(this.surfaces.keys());
  }

  deleteSurface(surfaceId: string): void {
    this.surfaces.delete(surfaceId);
  }

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

  surfaceUpdate(operation: {surfaceId: string; components: Array<any>}): void {
    const surface = this.getSurface(operation.surfaceId);

    for (const component of operation.components) {
      let catalogComponentId = 'unknown';
      if (component.component && typeof component.component === 'object') {
        const keys = Object.keys(component.component);
        if (keys.length > 0) {
          catalogComponentId = keys[0];
        }
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

  dataModelUpdate(operation: {
    surfaceId: string;
    contents: Array<{
      key: string;
      valueString?: string;
      valueNumber?: number;
      valueBoolean?: boolean;
      valueMap?: Array<any>;
    }>;
  }): void {
    const surface = this.getSurface(operation.surfaceId);
    surface.dataModel.update(operation.contents as any);
  }

  getComponent(
    surfaceId: string,
    componentId: string,
  ): ComponentDefinition | null {
    const surface = this.getSurface(surfaceId);
    return surface.components.get(componentId) || null;
  }

  getDataModel(surfaceId: string): DataModelStore {
    const surface = this.getSurface(surfaceId);
    return surface.dataModel;
  }

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
