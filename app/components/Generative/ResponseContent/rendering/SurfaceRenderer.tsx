import type {ReactNode} from 'react';
import type {SurfaceState} from '~/lib/generative/a2ui/surface-manager';
import {ConversationAnswer} from '../components/ConversationAnswer';
import {ComponentRenderer} from './ComponentRenderer';
import type {ResponseInteractionHandlers} from './render-context';

interface SurfaceRendererProps {
  surface: SurfaceState;
  surfaceMap?: Map<string, SurfaceState>;
  onProductSelect?: (productId: string) => void;
  onSearchAction?: (query: string) => void;
  onFollowupAction?: (message: string) => void;
}

export function SurfaceRenderer({
  surface,
  surfaceMap,
  onProductSelect,
  onSearchAction,
  onFollowupAction,
}: SurfaceRendererProps): ReactNode {
  if (!surface.isRendered || !surface.root) {
    return null;
  }

  // Bundle slot surfaces (bundle-surface-*) are invisible — they exist only
  // in surfaceMap so BundleDisplay can pull product data out of them.
  // They must NOT be rendered as standalone surfaces in the chat.
  if (surface.surfaceId.startsWith('bundle-surface-')) {
    return null;
  }

  const interactionHandlers: ResponseInteractionHandlers = {
    onProductSelect,
    onSearchAction,
    onFollowupAction,
  };
  const isSkeletonSurface = surface.surfaceId.startsWith('skeleton-surface-');

  const renderComponent = (componentId: string): ReactNode => {
    const component = surface.components.get(componentId);
    if (!component) {
      return null;
    }

    const {catalogComponentId} = component;
    const componentProps =
      (component.component as any)[catalogComponentId] || {};

    if (catalogComponentId === 'Column') {
      const childIds = (componentProps.children as any)?.explicitList || [];
      const renderedChildren = childIds
        .map((childId: unknown) => renderComponent(String(childId)))
        .filter(Boolean);

      return (
        <div key={componentId} className="flex flex-col gap-4">
          {renderedChildren}
        </div>
      );
    }

    if (catalogComponentId === 'Row') {
      const childIds = (componentProps.children as any)?.explicitList || [];
      const renderedChildren = childIds
        .map((childId: unknown) => renderComponent(String(childId)))
        .filter(Boolean);

      return (
        <div key={componentId} className="flex flex-row gap-2 flex-wrap">
          {renderedChildren}
        </div>
      );
    }

    if (catalogComponentId === 'List') {
      const direction = (componentProps.direction as string) || 'vertical';
      const template = (componentProps.children as any)?.template;

      if (!template) {
        return null;
      }

      const dataPath = template.dataBinding;
      const templateComponentId = template.componentId;
      const items = surface.dataModel.get(dataPath);

      if (!Array.isArray(items)) {
        return null;
      }

      const containerClass =
        direction === 'horizontal'
          ? 'flex flex-row gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory'
          : 'flex flex-col gap-4';

      return (
        <div key={componentId} className={containerClass}>
          {items.map((_item, index) => {
            const itemComponent = surface.components.get(templateComponentId);
            if (!itemComponent) {
              return null;
            }

            const itemKey = `${templateComponentId}-${index}`;

            return (
              <div
                key={itemKey}
                className={
                  direction === 'horizontal' ? 'flex-none snap-start' : ''
                }
              >
                {renderComponent(templateComponentId)}
              </div>
            );
          })}
        </div>
      );
    }

    if (catalogComponentId === 'Card') {
      const childId = componentProps.child as string;
      const renderedChild = childId ? renderComponent(childId) : null;

      return (
        <div
          key={componentId}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
        >
          {renderedChild}
        </div>
      );
    }

    if (catalogComponentId === 'ConversationAnswer') {
      const childIds = (componentProps.children as any)?.explicitList || [];
      const renderedChildren = childIds
        .map((childId: unknown) => renderComponent(String(childId)))
        .filter(Boolean);

      return (
        <ConversationAnswer key={componentId}>
          {renderedChildren}
        </ConversationAnswer>
      );
    }

    return (
      <ComponentRenderer
        key={componentId}
        surfaceId={surface.surfaceId}
        componentId={componentId}
        component={component}
        dataModel={surface.dataModel}
        isSkeletonSurface={isSkeletonSurface}
        surfaceMap={surfaceMap}
        onProductSelect={interactionHandlers.onProductSelect}
        onSearchAction={interactionHandlers.onSearchAction}
        onFollowupAction={interactionHandlers.onFollowupAction}
      />
    );
  };

  const rootResult = renderComponent(surface.root);

  const templateComponentIds = new Set<string>();
  surface.components.forEach((comp) => {
    const props = (comp.component as any)[comp.catalogComponentId] || {};
    for (const val of Object.values(props)) {
      if (val && typeof val === 'object' && 'componentId' in (val as object)) {
        templateComponentIds.add((val as any).componentId as string);
      }
    }
  });

  const siblingNodes: ReactNode[] = [];
  const actionsNodes: ReactNode[] = [];

  surface.components.forEach((component, componentId) => {
    if (componentId === surface.root) return;
    if (templateComponentIds.has(componentId)) return;

    const node = (
      <ComponentRenderer
        key={componentId}
        surfaceId={surface.surfaceId}
        componentId={componentId}
        component={component}
        dataModel={surface.dataModel}
        isSkeletonSurface={isSkeletonSurface}
        surfaceMap={surfaceMap}
        onProductSelect={interactionHandlers.onProductSelect}
        onSearchAction={interactionHandlers.onSearchAction}
        onFollowupAction={interactionHandlers.onFollowupAction}
      />
    );

    if (component.catalogComponentId === 'NextActionsBar') {
      actionsNodes.push(node);
    } else {
      siblingNodes.push(node);
    }
  });

  if (siblingNodes.length === 0 && actionsNodes.length === 0) {
    return rootResult;
  }

  return (
    <div key={surface.surfaceId} className="flex flex-col gap-4 w-full">
      {rootResult}
      {siblingNodes}
      {actionsNodes}
    </div>
  );
}
