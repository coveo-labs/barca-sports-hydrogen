import {SparklesIcon} from '@heroicons/react/20/solid';
import {A2UIProductCard} from './A2UIProductCard';
import {ProductCardSkeleton} from './Skeletons';

type ProductResearchItem = {
  clickUri?: string;
  ec_name?: string | null;
  ec_description?: string | null;
  ec_brand?: string | null;
  ec_category?: string[] | string | null;
  ec_price?: number | null;
  ec_promo_price?: number | null;
  ec_rating?: number | null;
  ec_product_id?: string | null;
  ec_image?: string | null;
  ec_currency?: string | null;
  ec_colors?: string[] | null;
  ec_selected_color?: string | null;
};

interface ProductResearchCardProps {
  product: ProductResearchItem | null;
  summary?: string;
  bullets?: string[];
  isLoading?: boolean;
  onProductSelect?: (productId: string) => void;
}

function getPrimaryCategory(product: ProductResearchItem | null) {
  if (!product) {
    return undefined;
  }

  if (Array.isArray(product.ec_category) && product.ec_category.length > 0) {
    return product.ec_category[0];
  }

  return typeof product.ec_category === 'string'
    ? product.ec_category
    : undefined;
}

function ProductResearchCardSkeleton() {
  return (
    <div className="grid w-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
        <ProductCardSkeleton />
      </div>
      <div className="flex flex-col gap-4">
        <div className="animate-pulse rounded-[24px] border border-indigo-100 bg-indigo-50/70 p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-indigo-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-40 rounded bg-indigo-200" />
              <div className="h-4 w-64 rounded bg-indigo-100" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full rounded bg-indigo-100" />
            <div className="h-4 w-full rounded bg-indigo-100" />
            <div className="h-4 w-5/6 rounded bg-indigo-100" />
          </div>
        </div>
        <div className="animate-pulse space-y-4 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-36 rounded bg-slate-200" />
          <div className="space-y-3">
            {Array.from({length: 5}).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-indigo-300" />
                <div className="h-4 w-full rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductResearchCard({
  product,
  summary,
  bullets = [],
  isLoading = false,
  onProductSelect,
}: ProductResearchCardProps) {
  const hasProduct = Boolean(product?.ec_product_id);
  const hasSummary = Boolean(summary?.trim());
  const featureBullets = bullets.filter((bullet) => bullet.trim().length > 0);

  if (isLoading && !hasProduct && !hasSummary && featureBullets.length === 0) {
    return <ProductResearchCardSkeleton />;
  }

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="w-full lg:max-w-[320px]">
        {hasProduct && product ? (
          <div className="rounded-[24px] border border-slate-200 bg-white mt-1 p-4 shadow-sm">
            <A2UIProductCard
              productId={product.ec_product_id || ''}
              name={product.ec_name || ''}
              brand={product.ec_brand || undefined}
              imageUrl={product.ec_image || ''}
              price={Number(product.ec_promo_price ?? product.ec_price) || 0}
              originalPrice={
                product.ec_promo_price != null
                  ? Number(product.ec_price) || undefined
                  : undefined
              }
              currency={product.ec_currency || 'USD'}
              rating={
                product.ec_rating != null
                  ? Number(product.ec_rating)
                  : undefined
              }
              description={product.ec_description || undefined}
              category={getPrimaryCategory(product)}
              url={product.clickUri || '#'}
              colors={product.ec_colors || undefined}
              selectedColor={product.ec_selected_color || undefined}
              onSelect={() =>
                product.ec_product_id &&
                onProductSelect?.(product.ec_product_id)
              }
            />
          </div>
        ) : isLoading ? (
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <ProductCardSkeleton />
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {hasSummary ? (
          <section className="rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-indigo-50 to-white mt-1 p-4 shadow-sm">
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[18px] font-semibold tracking-tight text-slate-900">
                  Product Summary
                </h3>
                <p className="text-[12px] text-slate-500">
                  Generated based on product specs
                </p>
              </div>
            </div>
            <p className="text-[14px] leading-6 text-slate-700">{summary}</p>
          </section>
        ) : null}

        {featureBullets.length > 0 ? (
          <section className="px-1 pt-2">
            <h4 className="text-[18px] font-semibold tracking-tight text-slate-900">
              Key Features
            </h4>
            <ul className="mt-4 space-y-4">
              {featureBullets.map((bullet, index) => (
                <li
                  key={`${index}-${bullet}`}
                  className="flex items-start gap-3 text-[14px] leading-3 text-slate-700"
                >
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
