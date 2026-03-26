import type {ReactNode} from 'react';
import {A2UIProductCard} from '../components/A2UIProductCard';
import {ProductCarousel} from '../components/ProductCarousel';
import {ComparisonTable} from '../components/ComparisonTable';
import {ComparisonSummary} from '../components/ComparisonSummary';
import {BundleDisplay} from '../components/BundleDisplay';
import {NextActionsBar} from '../components/NextActionsBar';
import {resolveTemplateData} from '~/lib/generative/a2ui/data-binding-resolver';
import type {ResponseComponentRendererProps} from './render-context';

export function renderProductCard({
  resolved,
  renderContext,
  interactionHandlers,
}: ResponseComponentRendererProps): ReactNode {
  const productData = (resolved as any).component || resolved;

  return (
    <A2UIProductCard
      key={renderContext.componentId}
      productId={(productData.ec_product_id as string) || renderContext.componentId}
      name={(productData.ec_name as string) || ''}
      brand={productData.ec_brand as string | undefined}
      imageUrl={(productData.ec_image as string) || ''}
      price={(productData.ec_price as number) || 0}
      originalPrice={productData.ec_promo_price as number | undefined}
      currency={(productData.ec_currency as string) || 'USD'}
      rating={productData.ec_rating as number | undefined}
      description={productData.ec_description as string | undefined}
      category={productData.ec_category as string | undefined}
      url={(productData.clickUri as string) || '#'}
      colors={productData.ec_colors as string[] | undefined}
      selectedColor={productData.ec_selected_color as string | undefined}
      onSelect={() =>
        interactionHandlers.onProductSelect?.(
          (productData.ec_product_id as string) || renderContext.componentId,
        )
      }
    />
  );
}

export function renderProductCarousel({
  componentProps,
  resolved,
  renderContext,
  interactionHandlers,
}: ResponseComponentRendererProps): ReactNode {
  const productsProperty = componentProps.products as
    | {dataBinding?: string}
    | undefined;
  const productsData = productsProperty?.dataBinding
    ? resolveTemplateData(productsProperty.dataBinding, renderContext.dataModel)
    : [];
  const resolvedProps = (resolved as any).component || resolved;
  const heading =
    (resolvedProps.heading as string | undefined) ??
    (resolvedProps.headline as string | undefined);

  return (
    <ProductCarousel
      key={renderContext.componentId}
      headline={heading}
      products={productsData as any}
      isLoading={Boolean(componentProps.isLoading) || renderContext.isSkeletonSurface}
      onProductSelect={interactionHandlers.onProductSelect}
    />
  );
}

export function renderComparisonTable({
  componentProps,
  resolved,
  renderContext,
  interactionHandlers,
}: ResponseComponentRendererProps): ReactNode {
  const resolvedProps = (resolved as any).component || resolved;
  const productsProperty = componentProps.products as
    | {dataBinding?: string}
    | undefined;
  const dataBindingPath = productsProperty?.dataBinding;
  const rawProducts: Record<string, unknown>[] = dataBindingPath
    ? (resolveTemplateData(dataBindingPath, renderContext.dataModel) as Record<
        string,
        unknown
      >[])
    : [];

  const mappedProducts = rawProducts.map((product) => {
    const regularPrice = Number(product.ec_price) || 0;
    const promoPrice =
      product.ec_promo_price != null ? Number(product.ec_promo_price) : null;
    const isOnSale = promoPrice !== null && promoPrice < regularPrice;

    return {
      productId: (product.ec_product_id as string) || '',
      name: (product.ec_name as string) || '',
      brand: (product.ec_brand as string) || undefined,
      imageUrl: (product.ec_image as string) || '',
      price: isOnSale ? promoPrice! : regularPrice,
      originalPrice: isOnSale ? regularPrice : undefined,
      currency: (product.ec_currency as string) || 'USD',
      rating: product.ec_rating != null ? Number(product.ec_rating) : undefined,
      description: (product.ec_description as string) || undefined,
      category: (product.ec_category as string) || undefined,
      url: (product.clickUri as string) || '#',
      ...product,
    };
  });

  const headline =
    (resolvedProps.heading as string | undefined) ??
    (resolvedProps.headline as string | undefined);

  return (
    <ComparisonTable
      key={renderContext.componentId}
      headline={headline}
      products={mappedProducts as any}
      attributes={(resolvedProps.attributes as string[]) || []}
      isLoading={Boolean(componentProps.isLoading) || renderContext.isSkeletonSurface}
      onProductSelect={interactionHandlers.onProductSelect}
    />
  );
}

export function renderComparisonSummary({
  resolved,
  renderContext,
}: ResponseComponentRendererProps): ReactNode {
  const resolvedProps = (resolved as any).component || resolved;
  const text =
    typeof resolvedProps.text === 'string'
      ? resolvedProps.text
      : ((resolvedProps.text as any)?.literalString ?? '');
  return <ComparisonSummary key={renderContext.componentId} text={text} />;
}

export function renderBundleDisplay({
  componentProps,
  renderContext,
  interactionHandlers,
}: ResponseComponentRendererProps): ReactNode {
  const bundles = componentProps.bundles;
  const titleProp = componentProps.title;
  const title: string | undefined =
    typeof titleProp === 'string'
      ? titleProp
      : ((titleProp as any)?.literalString ?? undefined);

  if (!Array.isArray(bundles) || bundles.length === 0) {
    const isLoading =
      Boolean(componentProps.isLoading) || renderContext.isSkeletonSurface;
    if (!isLoading) {
      return null;
    }

    return (
      <BundleDisplay
        key={renderContext.componentId}
        title={title}
        bundles={[]}
        surfaceMap={renderContext.surfaceMap ?? new Map()}
        isLoading={true}
        onProductSelect={interactionHandlers.onProductSelect}
      />
    );
  }

  return (
    <BundleDisplay
      key={renderContext.componentId}
      title={title}
      bundles={bundles as any}
      surfaceMap={renderContext.surfaceMap ?? new Map()}
      isLoading={Boolean(componentProps.isLoading) || renderContext.isSkeletonSurface}
      onProductSelect={interactionHandlers.onProductSelect}
    />
  );
}

export function renderNextActionsBar({
  componentProps,
  renderContext,
  interactionHandlers,
}: ResponseComponentRendererProps): ReactNode {
  const actionsProperty = componentProps.actions as
    | {dataBinding?: string}
    | undefined;
  const actionsData = actionsProperty?.dataBinding
    ? resolveTemplateData(actionsProperty.dataBinding, renderContext.dataModel)
    : [];

  return (
    <NextActionsBar
      key={renderContext.componentId}
      actions={actionsData as any}
      isLoading={Boolean(componentProps.isLoading) || renderContext.isSkeletonSurface}
      onSearchAction={interactionHandlers.onSearchAction}
      onFollowupAction={interactionHandlers.onFollowupAction}
    />
  );
}

export function renderText({
  resolved,
  renderContext,
}: ResponseComponentRendererProps): ReactNode {
  const resolvedProps = (resolved as any).component || resolved;
  const text =
    (resolvedProps.text as string) || (resolvedProps.content as string) || '';
  const usageHint = (resolvedProps.usageHint as string) || 'body';

  switch (usageHint) {
    case 'h1':
      return (
        <h1
          key={renderContext.componentId}
          className="text-3xl font-bold text-gray-900 mb-4"
        >
          {text}
        </h1>
      );
    case 'h2':
      return (
        <h2
          key={renderContext.componentId}
          className="text-2xl font-bold text-gray-900 mb-4"
        >
          {text}
        </h2>
      );
    case 'h3':
      return (
        <h3
          key={renderContext.componentId}
          className="text-xl font-semibold text-gray-900 mb-3"
        >
          {text}
        </h3>
      );
    case 'caption':
      return (
        <p key={renderContext.componentId} className="text-sm text-gray-500 mb-1">
          {text}
        </p>
      );
    case 'body':
    default:
      return (
        <p key={renderContext.componentId} className="text-base text-gray-700 mb-2">
          {text}
        </p>
      );
  }
}

export function renderImage({
  resolved,
  renderContext,
}: ResponseComponentRendererProps): ReactNode {
  const resolvedProps = (resolved as any).component || resolved;
  const url = (resolvedProps.url as string) || '';
  const usageHint = (resolvedProps.usageHint as string) || 'mediumFeature';
  const alt = (resolvedProps.alt as string) || '';
  const sizeClass = usageHint === 'mediumFeature' ? 'w-full h-48' : 'w-full';

  return (
    <img
      key={renderContext.componentId}
      src={url}
      alt={alt}
      className={`${sizeClass} object-cover rounded-lg`}
    />
  );
}

export function renderButton({
  componentProps,
  resolved,
  renderContext,
  interactionHandlers,
}: ResponseComponentRendererProps): ReactNode {
  const resolvedProps = (resolved as any).component || resolved;
  const text = (resolvedProps.text as string) || '';
  const variant = (resolvedProps.variant as string) || 'followup';
  const action = componentProps.action as
    | {type?: string; query?: string; message?: string}
    | undefined;

  const handleClick = () => {
    if (action?.type === 'search' && action.query) {
      interactionHandlers.onSearchAction?.(action.query);
    } else if (action?.type === 'followup' && action.message) {
      interactionHandlers.onFollowupAction?.(action.message);
    }
  };

  return (
    <button
      key={renderContext.componentId}
      type="button"
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
        variant === 'search'
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300'
      }`}
    >
      {text}
    </button>
  );
}
