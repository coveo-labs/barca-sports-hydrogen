import type {ReactNode} from 'react';
import {A2UIProductCard} from './A2UIProductCard';
import {ProductCarousel} from './ProductCarousel';
import {ComparisonTable} from './ComparisonTable';
import {ConversationAnswer} from './ConversationAnswer';
import {NextActionsBar} from './NextActionsBar';
import type {ComponentDefinition} from '~/lib/a2ui/surface-manager';
import {
  resolveComponentBindings,
  resolveTemplateData,
} from '~/lib/a2ui/data-binding-resolver';
import type {DataModelStore} from '~/lib/a2ui/data-model-store';

interface ComponentRendererProps {
  componentId: string;
  component: ComponentDefinition;
  dataModel: DataModelStore;
  onProductSelect?: (productId: string) => void;
  onSearchAction?: (query: string) => void;
  onFollowupAction?: (message: string) => void;
}

/**
 * Renders A2UI component definitions as React components
 * Maps catalog component IDs to actual React component implementations
 */
export function ComponentRenderer({
  componentId,
  component,
  dataModel,
  onProductSelect,
  onSearchAction,
  onFollowupAction,
}: ComponentRendererProps): ReactNode {
  const {catalogComponentId} = component;

  console.log('[ComponentRenderer] Rendering:', {
    componentId,
    catalogComponentId,
    componentKeys: Object.keys(component.component),
  });

  // Extract component properties from nested structure
  // Component format: {catalogComponentId: "Text", component: {"Text": {props...}}}
  const componentProps = (component.component as any)[catalogComponentId] || {};

  console.log('[ComponentRenderer] Component props:', componentProps);

  // Resolve all data bindings in the component properties
  const resolved = resolveComponentBindings(
    {catalogComponentId, component: componentProps} as any,
    dataModel,
  );

  console.log('[ComponentRenderer] Resolved bindings:', resolved);

  switch (catalogComponentId) {
    case 'ProductCard': {
      // Map Coveo product fields to ProductCard props
      const productData = (resolved as any).component || resolved;
      console.log('[ComponentRenderer] ProductCard data:', productData);

      return (
        <A2UIProductCard
          key={componentId}
          productId={(productData.ec_product_id as string) || componentId}
          name={(productData.ec_name as string) || ''}
          imageUrl={(productData.ec_image as string) || ''}
          price={(productData.ec_price as number) || 0}
          originalPrice={productData.ec_promo_price as number | undefined}
          currency={(productData.ec_currency as string) || 'USD'}
          rating={productData.ec_rating as number | undefined}
          url={(productData.ec_url as string) || '#'}
          colors={productData.ec_colors as string[] | undefined}
          selectedColor={productData.ec_selected_color as string | undefined}
          onSelect={() =>
            onProductSelect?.(
              (productData.ec_product_id as string) || componentId,
            )
          }
        />
      );
    }

    case 'ProductCarousel': {
      // Resolve template data for products array
      const productsProperty = componentProps?.products;
      console.log(
        '[ComponentRenderer] ProductCarousel productsProperty:',
        productsProperty,
      );
      const productsData = productsProperty?.dataBinding
        ? resolveTemplateData(productsProperty.dataBinding, dataModel)
        : productsProperty?.template
          ? resolveTemplateData(productsProperty as any, dataModel)
          : [];

      console.log('[ComponentRenderer] ProductCarousel resolved:', {
        headline: resolved.headline,
        productsCount: productsData.length,
        products: productsData,
      });

      return (
        <ProductCarousel
          key={componentId}
          headline={resolved.headline as string | undefined}
          products={productsData as any}
          onProductSelect={onProductSelect}
        />
      );
    }

    case 'ComparisonTable': {
      // Resolve template data for products array
      const productsProperty = componentProps?.products;
      const productsData = productsProperty?.dataBinding
        ? resolveTemplateData(productsProperty.dataBinding, dataModel)
        : productsProperty?.template
          ? resolveTemplateData(productsProperty as any, dataModel)
          : [];

      return (
        <ComparisonTable
          key={componentId}
          headline={resolved.headline as string | undefined}
          products={productsData as any}
          attributes={(resolved.attributes as string[]) || []}
          onProductSelect={onProductSelect}
        />
      );
    }

    case 'ConversationAnswer': {
      // Recursively render child components
      const childComponents = (component.children as any)?.children || [];
      const renderedChildren = Array.isArray(childComponents)
        ? childComponents.map((_: unknown) => null)
        : [];

      return (
        <ConversationAnswer key={componentId}>
          {renderedChildren}
        </ConversationAnswer>
      );
    }

    case 'NextActionsBar': {
      // Resolve template data for actions array
      const actionsProperty = componentProps?.actions;
      const actionsData = actionsProperty?.dataBinding
        ? resolveTemplateData(actionsProperty.dataBinding, dataModel)
        : actionsProperty?.template
          ? resolveTemplateData(actionsProperty as any, dataModel)
          : [];

      return (
        <NextActionsBar
          key={componentId}
          actions={actionsData as any}
          onSearchAction={onSearchAction}
          onFollowupAction={onFollowupAction}
        />
      );
    }

    case 'Text': {
      // Basic catalog Text component
      const text =
        (resolved.text as string) || (resolved.content as string) || '';
      const usageHint = (resolved.usageHint as string) || 'body';

      switch (usageHint) {
        case 'h1':
          return (
            <h1
              key={componentId}
              className="text-3xl font-bold text-gray-900 mb-4"
            >
              {text}
            </h1>
          );
        case 'h2':
          return (
            <h2
              key={componentId}
              className="text-2xl font-bold text-gray-900 mb-4"
            >
              {text}
            </h2>
          );
        case 'h3':
          return (
            <h3
              key={componentId}
              className="text-xl font-semibold text-gray-900 mb-3"
            >
              {text}
            </h3>
          );
        case 'caption':
          return (
            <p key={componentId} className="text-sm text-gray-500 mb-1">
              {text}
            </p>
          );
        case 'body':
        default:
          return (
            <p key={componentId} className="text-base text-gray-700 mb-2">
              {text}
            </p>
          );
      }
    }

    case 'Image': {
      const url = (resolved.url as string) || '';
      const usageHint = (resolved.usageHint as string) || 'mediumFeature';
      const alt = (resolved.alt as string) || '';

      const sizeClass =
        usageHint === 'mediumFeature' ? 'w-full h-48' : 'w-full';

      return (
        <img
          key={componentId}
          src={url}
          alt={alt}
          className={`${sizeClass} object-cover rounded-lg`}
        />
      );
    }

    case 'Button': {
      // Basic catalog Button component
      const text = (resolved.text as string) || '';
      const variant = (resolved.variant as string) || 'followup';
      const action = resolved.action as any;

      const handleClick = () => {
        if (action?.type === 'search' && action.query) {
          onSearchAction?.(action.query);
        } else if (action?.type === 'followup' && action.message) {
          onFollowupAction?.(action.message);
        }
      };

      return (
        <button
          key={componentId}
          onClick={handleClick}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm transition-colors
            ${
              variant === 'search'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300'
            }
          `}
        >
          {text}
        </button>
      );
    }

    case 'Column':
    case 'Row':
    case 'List':
    case 'Card':
      // Layout components are handled by SurfaceRenderer
      // They don't render themselves, just their children
      return null;

    default:
      console.warn(`Unknown component type: ${component.catalogComponentId}`);
      return null;
  }
}
