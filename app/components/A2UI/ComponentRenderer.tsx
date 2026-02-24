import type {ReactNode} from 'react';
import {A2UIProductCard} from './A2UIProductCard';
import {ProductCarousel} from './ProductCarousel';
import {ComparisonTable} from './ComparisonTable';
import {ComparisonSummary} from './ComparisonSummary';
import {BundleDisplay} from './BundleDisplay';
import {ConversationAnswer} from './ConversationAnswer';
import {NextActionsBar} from './NextActionsBar';
import type {
  ComponentDefinition,
  SurfaceState,
} from '~/lib/a2ui/surface-manager';
import {
  resolveComponentBindings,
  resolveTemplateData,
} from '~/lib/a2ui/data-binding-resolver';
import type {DataModelStore} from '~/lib/a2ui/data-model-store';

interface ComponentRendererProps {
  componentId: string;
  component: ComponentDefinition;
  dataModel: DataModelStore;
  /** Full surface map for cross-surface lookups (required for BundleDisplay) */
  surfaceMap?: Map<string, SurfaceState>;
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
  surfaceMap,
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
      // resolved is keyed as { component: resolvedProps } due to how
      // resolveComponentBindings is called with {catalogComponentId, component: componentProps}
      const resolvedProps = (resolved as any).component || resolved;

      // The LLM writes products as { componentId: "...", dataBinding: "/items" }
      // or { dataBinding: "/items" } — extract the dataBinding path either way.
      const productsProperty = componentProps?.products;
      const dataBindingPath: string | undefined = productsProperty?.dataBinding;
      const rawProducts: Record<string, unknown>[] = dataBindingPath
        ? (resolveTemplateData(dataBindingPath, dataModel) as Record<
            string,
            unknown
          >[])
        : [];

      // Map Coveo ec_* fields to the shape ComparisonTable expects.
      // Custom comparison attributes (standout, trade_off, best_for, etc.)
      // are passed through via the spread so they resolve via product[attr].
      const mappedProducts = rawProducts.map((p) => {
        const regularPrice = Number(p.ec_price) || 0;
        const promoPrice =
          p.ec_promo_price != null ? Number(p.ec_promo_price) : null;
        // Show promo price as the main price with original struck-through,
        // only when promo is genuinely lower than regular price.
        const isOnSale = promoPrice !== null && promoPrice < regularPrice;
        return {
          productId: (p.ec_product_id as string) || '',
          name: (p.ec_name as string) || '',
          imageUrl: (p.ec_image as string) || '',
          price: isOnSale ? promoPrice! : regularPrice,
          originalPrice: isOnSale ? regularPrice : undefined,
          currency: (p.ec_currency as string) || 'USD',
          rating: p.ec_rating != null ? Number(p.ec_rating) : undefined,
          url: (p.ec_url as string) || '#',
          // Spread all remaining keys so custom attributes (standout, trade_off,
          // best_for, etc.) are accessible as product[attr] in the table rows.
          ...p,
        };
      });

      // Accept both "heading" (what the LLM writes) and "headline" (legacy)
      const headline =
        (resolvedProps.heading as string | undefined) ??
        (resolvedProps.headline as string | undefined);

      return (
        <ComparisonTable
          key={componentId}
          headline={headline}
          products={mappedProducts as any}
          attributes={(resolvedProps.attributes as string[]) || []}
          onProductSelect={onProductSelect}
        />
      );
    }

    case 'ComparisonSummary': {
      const resolvedProps = (resolved as any).component || resolved;
      const text =
        typeof resolvedProps.text === 'string'
          ? resolvedProps.text
          : ((resolvedProps.text as any)?.literalString ?? '');
      return <ComparisonSummary key={componentId} text={text} />;
    }

    case 'BundleDisplay': {
      // bundles is an inline literal array in the component props —
      // no data binding needed; slot product data lives in separate surfaces.
      const bundles = componentProps?.bundles;
      const titleProp = componentProps?.title;
      // title may be a literalString binding or a plain string
      const title: string | undefined =
        typeof titleProp === 'string'
          ? titleProp
          : ((titleProp as any)?.literalString ?? undefined);

      console.log('[ComponentRenderer] BundleDisplay bundles:', bundles);

      if (!Array.isArray(bundles) || bundles.length === 0) {
        console.warn('[ComponentRenderer] BundleDisplay: no bundles found');
        return null;
      }

      return (
        <BundleDisplay
          key={componentId}
          title={title}
          bundles={bundles as any}
          surfaceMap={surfaceMap ?? new Map()}
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
