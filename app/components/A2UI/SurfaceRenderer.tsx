import type {ReactNode} from 'react';
import type {SurfaceState} from '~/lib/a2ui/surface-manager';
import {ConversationAnswer} from './ConversationAnswer';
import {ComponentRenderer} from './ComponentRenderer';

interface SurfaceRendererProps {
  surface: SurfaceState;
  /** Full surface map for cross-surface lookups (e.g. BundleDisplay slot surfaces) */
  surfaceMap?: Map<string, SurfaceState>;
  onProductSelect?: (productId: string) => void;
  onSearchAction?: (query: string) => void;
  onFollowupAction?: (message: string) => void;
}

/**
 * Renders a complete A2UI surface with all its components
 * Recursively renders component tree starting from root
 */
export function SurfaceRenderer({
  surface,
  surfaceMap,
  onProductSelect,
  onSearchAction,
  onFollowupAction,
}: SurfaceRendererProps): ReactNode {
  if (!surface.isRendered || !surface.root) {
    // Surface not ready to render yet (waiting for beginRendering)
    return null;
  }

  // Bundle slot surfaces (bundle-surface-*) are invisible — they exist only
  // in surfaceMap so BundleDisplay can pull product data out of them.
  // They must NOT be rendered as standalone surfaces in the chat.
  if (surface.surfaceId.startsWith('bundle-surface-')) {
    return null;
  }

  const renderComponent = (componentId: string): ReactNode => {
    const component = surface.components.get(componentId);
    if (!component) {
      return null;
    }

    const {catalogComponentId} = component;
    const componentProps =
      (component.component as any)[catalogComponentId] || {};

    // Handle layout components that have children
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

      // Get data for template
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
          {items.map((item, index) => {
            // Render template component with item context
            const itemComponent = surface.components.get(templateComponentId);
            if (!itemComponent) {
              return null;
            }

            // Create a scoped data path for this item
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

    // Handle ConversationAnswer (custom catalog)
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

    // Render leaf components (Text, Image, Button, ProductCard, etc.)
    return (
      <ComponentRenderer
        key={componentId}
        componentId={componentId}
        component={component}
        dataModel={surface.dataModel}
        surfaceMap={surfaceMap}
        onProductSelect={onProductSelect}
        onSearchAction={onSearchAction}
        onFollowupAction={onFollowupAction}
      />
    );
  };

  // Start rendering from root component
  const rootResult = renderComponent(surface.root);

  // Collect the set of component IDs that are referenced as template sub-components
  // (i.e. used as `componentId` in a dataBinding on another component's props).
  // These should never be rendered as standalone surface-level components.
  const templateComponentIds = new Set<string>();
  surface.components.forEach((comp) => {
    const props = (comp.component as any)[comp.catalogComponentId] || {};
    // Walk top-level prop values and collect any `componentId` references
    for (const val of Object.values(props)) {
      if (val && typeof val === 'object' && 'componentId' in (val as object)) {
        templateComponentIds.add((val as any).componentId as string);
      }
    }
  });

  // Render surface-level sibling components that are not the root and not
  // template sub-components, in the order they appear in the surface.
  // NextActionsBar is rendered last regardless of declaration order.
  const siblingNodes: ReactNode[] = [];
  const actionsNodes: ReactNode[] = [];

  surface.components.forEach((component, componentId) => {
    if (componentId === surface.root) return;
    if (templateComponentIds.has(componentId)) return;

    const node = (
      <ComponentRenderer
        key={componentId}
        componentId={componentId}
        component={component}
        dataModel={surface.dataModel}
        surfaceMap={surfaceMap}
        onProductSelect={onProductSelect}
        onSearchAction={onSearchAction}
        onFollowupAction={onFollowupAction}
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
