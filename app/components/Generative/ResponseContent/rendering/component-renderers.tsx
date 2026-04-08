import type {ReactNode} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import {A2UIProductCard} from '../components/A2UIProductCard';
import {ProductCarousel} from '../components/ProductCarousel';
import {ComparisonTable} from '../components/ComparisonTable';
import {ComparisonSummary} from '../components/ComparisonSummary';
import {BundleDisplay} from '../components/BundleDisplay';
import {NextActionsBar} from '../components/NextActionsBar';
import {ProductResearchCard} from '../components/ProductResearchCard';
import {resolveTemplateData} from '~/lib/generative/a2ui/data-binding-resolver';
import {resolveProductId} from '~/lib/generative/product/product-identifier';
import type {ResponseComponentRendererProps} from './render-context';

type RenderableProductSource = {
  clickUri?: Product['clickUri'];
  ec_name?: Product['ec_name'];
  ec_description?: Product['ec_description'];
  ec_brand?: Product['ec_brand'];
  ec_category?: Product['ec_category'] | null;
  ec_price?: Product['ec_price'];
  ec_promo_price?: Product['ec_promo_price'];
  ec_rating?: Product['ec_rating'];
  ec_product_id?: Product['ec_product_id'];
};

type ComparisonSourceProduct = RenderableProductSource &
  Record<string, unknown> & {
    ec_image?: string | null;
    recommended?: boolean;
  };

type ProductCardSource = RenderableProductSource &
  Record<string, unknown> & {
    ec_image?: string | null;
    ec_colors?: string[] | null;
    ec_selected_color?: string | null;
  };

type ProductResearchSource = ProductCardSource;

function getPrimaryCategory(product: {ec_category?: string[] | null}) {
  return Array.isArray(product.ec_category) && product.ec_category.length > 0
    ? product.ec_category[0]
    : undefined;
}

export function renderProductCard({
  resolved,
  renderContext,
  interactionHandlers,
}: ResponseComponentRendererProps): ReactNode {
  const productData = ((resolved as any).component || resolved) as ProductCardSource;
  const productId = productData.ec_product_id || renderContext.componentId;
  const currency =
    typeof productData.ec_currency === 'string' && productData.ec_currency
      ? productData.ec_currency
      : 'USD';

  return (
    <A2UIProductCard
      key={renderContext.componentId}
      productId={productId}
      name={productData.ec_name || ''}
      brand={productData.ec_brand || undefined}
      imageUrl={productData.ec_image || ''}
      price={productData.ec_price || 0}
      originalPrice={productData.ec_promo_price || undefined}
      currency={currency}
      rating={productData.ec_rating || undefined}
      description={productData.ec_description || undefined}
      category={getPrimaryCategory(productData)}
      url={productData.clickUri || '#'}
      colors={productData.ec_colors || undefined}
      selectedColor={productData.ec_selected_color || undefined}
      onSelect={() => interactionHandlers.onProductSelect?.(productId)}
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
  const rawProducts: ComparisonSourceProduct[] = dataBindingPath
    ? (resolveTemplateData(
        dataBindingPath,
        renderContext.dataModel,
      ) as ComparisonSourceProduct[])
    : [];

  const mappedProducts = rawProducts.flatMap((product) => {
    const productId = resolveProductId(product);
    if (!productId) {
      return [];
    }

    const regularPrice = Number(product.ec_price) || 0;
    const promoPrice =
      product.ec_promo_price != null ? Number(product.ec_promo_price) : null;
    const isOnSale = promoPrice !== null && promoPrice < regularPrice;
    const currency =
      typeof product.ec_currency === 'string' && product.ec_currency
        ? product.ec_currency
        : 'USD';

    return [{
      productId,
      name: product.ec_name || '',
      brand: product.ec_brand || undefined,
      imageUrl: product.ec_image || '',
      price: isOnSale ? promoPrice! : regularPrice,
      originalPrice: isOnSale ? regularPrice : undefined,
      currency,
      rating: product.ec_rating != null ? Number(product.ec_rating) : undefined,
      description: product.ec_description || undefined,
      category: getPrimaryCategory(product),
      url: product.clickUri || '#',
      ...product,
    }];
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

export function renderProductResearchCard({
  componentProps,
  resolved,
  renderContext,
  interactionHandlers,
}: ResponseComponentRendererProps): ReactNode {
  const resolvedProps = (resolved as any).component || resolved;
  const items = resolveTemplateData('/items', renderContext.dataModel) as
    | ProductResearchSource[]
    | undefined;
  const productId =
    typeof resolvedProps.ec_product_id === 'string'
      ? resolvedProps.ec_product_id
      : '';
  const product =
    items?.find((item) => item.ec_product_id === productId) ??
    items?.[0] ??
    null;
  const summary =
    typeof resolvedProps.summary === 'string' ? resolvedProps.summary : '';
  const bullets = Array.isArray(resolvedProps.bullets)
    ? resolvedProps.bullets.filter(
        (bullet: unknown): bullet is string =>
          typeof bullet === 'string' && bullet.trim().length > 0,
      )
    : [];

  return (
    <ProductResearchCard
      key={renderContext.componentId}
      product={product}
      summary={summary}
      bullets={bullets}
      isLoading={Boolean(componentProps.isLoading) || renderContext.isSkeletonSurface}
      onProductSelect={interactionHandlers.onProductSelect}
    />
  );
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
  const action = (resolvedProps.action ?? componentProps.action) as
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
