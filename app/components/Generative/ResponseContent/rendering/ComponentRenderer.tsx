import type {ReactNode} from 'react';
import type {
  ComponentDefinition,
  SurfaceState,
} from '~/lib/generative/a2ui/surface-manager';
import {resolveComponentBindings} from '~/lib/generative/a2ui/data-binding-resolver';
import type {DataModelStore} from '~/lib/generative/a2ui/data-model-store';
import {responseComponentRegistry} from './component-registry';
import type {
  ResponseInteractionHandlers,
  ResponseRenderContext,
} from './render-context';

interface ComponentRendererProps {
  surfaceId: string;
  componentId: string;
  component: ComponentDefinition;
  dataModel: DataModelStore;
  isSkeletonSurface?: boolean;
  surfaceMap?: Map<string, SurfaceState>;
  onProductSelect?: (productId: string) => void;
  onSearchAction?: (query: string) => void;
  onFollowupAction?: (message: string) => void;
}

export function ComponentRenderer({
  surfaceId,
  componentId,
  component,
  dataModel,
  isSkeletonSurface = false,
  surfaceMap,
  onProductSelect,
  onSearchAction,
  onFollowupAction,
}: ComponentRendererProps): ReactNode {
  const {catalogComponentId} = component;
  const componentProps = (component.component as any)[catalogComponentId] || {};
  const resolved = resolveComponentBindings(
    {catalogComponentId, component: componentProps} as any,
    dataModel,
  );
  const renderContext: ResponseRenderContext = {
    surfaceId,
    componentId,
    catalogComponentId,
    dataModel,
    surfaceMap,
    isSkeletonSurface,
  };
  const interactionHandlers: ResponseInteractionHandlers = {
    onProductSelect,
    onSearchAction,
    onFollowupAction,
  };
  const renderer = responseComponentRegistry[catalogComponentId];

  if (!renderer) {
    return null;
  }

  return renderer({
    component,
    componentProps,
    resolved,
    renderContext,
    interactionHandlers,
  });
}
