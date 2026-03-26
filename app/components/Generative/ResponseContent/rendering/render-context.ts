import type {
  ComponentDefinition,
  SurfaceState,
} from '~/lib/a2ui/surface-manager';
import type {DataModelStore} from '~/lib/a2ui/data-model-store';

export type ResponseRenderContext = {
  surfaceId: string;
  componentId: string;
  catalogComponentId: string;
  dataModel: DataModelStore;
  surfaceMap?: Map<string, SurfaceState>;
  isSkeletonSurface: boolean;
};

export type ResponseInteractionHandlers = {
  onProductSelect?: (productId: string) => void;
  onSearchAction?: (query: string) => void;
  onFollowupAction?: (message: string) => void;
};

export type ResponseComponentRendererProps = {
  component: ComponentDefinition;
  componentProps: Record<string, unknown>;
  resolved: Record<string, unknown>;
  renderContext: ResponseRenderContext;
  interactionHandlers: ResponseInteractionHandlers;
};
