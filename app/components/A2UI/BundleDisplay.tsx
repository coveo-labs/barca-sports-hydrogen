import {useState} from 'react';
import {Money} from '@shopify/hydrogen';
import {NavLink} from 'react-router';
import type {SurfaceState} from '~/lib/a2ui/surface-manager';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BundleSlot {
  categoryLabel: string;
  /** surface ID of the per-slot product surface */
  surfaceRef: string;
}

interface Bundle {
  bundleId: string;
  label: string;
  description: string;
  slots: BundleSlot[];
}

interface BundleDisplayProps {
  title?: string;
  bundles: Bundle[];
  /** Full surface map so we can pull product data out of slot surfaces */
  surfaceMap: Map<string, SurfaceState>;
  isLoading?: boolean;
  onProductSelect?: (productId: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Given a slot surface, extract the first (and only) product from its
 * data-model's `/items` array.  Returns null if the surface or product
 * data is missing / not yet loaded.
 */
function extractProductFromSurface(
  surface: SurfaceState | undefined,
): ProductSlotData | null {
  if (!surface) return null;

  const items = surface.dataModel.get('/items');
  if (!Array.isArray(items) || items.length === 0) return null;

  const p = items[0] as Record<string, unknown>;
  if (!p) return null;

  // Prices are stored as strings by the data model builder (str(float(price)))
  const rawPrice = p.ec_price;
  if (rawPrice === undefined || rawPrice === null) return null;
  const price =
    typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice as string);
  if (isNaN(price)) return null;

  const rawPromoPrice = p.ec_promo_price;
  const originalPrice =
    rawPromoPrice !== undefined && rawPromoPrice !== null
      ? typeof rawPromoPrice === 'number'
        ? rawPromoPrice
        : parseFloat(rawPromoPrice as string)
      : undefined;

  return {
    productId: (p.ec_product_id as string) || '',
    name: (p.ec_name as string) || '',
    imageUrl: (p.ec_image as string) || '',
    price,
    originalPrice:
      originalPrice !== undefined && isNaN(originalPrice)
        ? undefined
        : originalPrice,
    currency: (p.ec_currency as string) || 'USD',
    rating: p.ec_rating as number | undefined,
    url: (p.ec_url as string) || '#',
  };
}

interface ProductSlotData {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating?: number;
  url: string;
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

const SKELETON_SLOTS = 3;
const SKELETON_TABS = 2;

function BundleDisplaySkeleton() {
  return (
    <div className="w-full flex flex-col gap-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm animate-pulse">
      {/* Header shimmer */}
      <div className="px-6 pt-6 pb-4">
        <div className="h-6 rounded bg-gray-200 w-48" />
      </div>

      {/* Tab bar shimmer */}
      <div className="flex border-b border-gray-200 px-6 gap-6 pb-0">
        {Array.from({length: SKELETON_TABS}).map((_, i) => (
          <div key={i} className="h-4 rounded bg-gray-200 w-24 mb-4" />
        ))}
      </div>

      {/* Description shimmer */}
      <div className="px-6 pt-4 pb-2">
        <div className="h-3.5 rounded bg-gray-200 w-3/4" />
      </div>

      {/* Slot cards shimmer — 3-column grid */}
      <div className="px-6 py-4 grid grid-cols-3 gap-4">
        {Array.from({length: SKELETON_SLOTS}).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            {/* Category label */}
            <div className="h-3 rounded bg-gray-200 w-20" />
            {/* Image */}
            <div className="aspect-square w-full rounded-lg bg-gray-200" />
            {/* Name */}
            <div className="h-3.5 rounded bg-gray-200 w-3/4" />
            {/* Price */}
            <div className="h-3.5 rounded bg-gray-200 w-1/3" />
            {/* Add to Cart button */}
            <div className="h-9 rounded-lg bg-gray-200 w-full mt-1" />
          </div>
        ))}
      </div>

      {/* Footer shimmer */}
      <div className="flex items-center justify-between px-6 py-4 mx-4 mb-4 rounded-xl bg-gray-100">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 rounded bg-gray-200 w-24" />
          <div className="h-3 rounded bg-gray-200 w-16" />
        </div>
        <div className="h-8 rounded bg-gray-200 w-20" />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SlotCard({
  categoryLabel,
  product,
  onProductSelect,
}: {
  categoryLabel: string;
  product: ProductSlotData | null;
  onProductSelect?: (productId: string) => void;
}) {
  if (!product) {
    // Skeleton while this specific slot's data loads
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {categoryLabel}
        </span>
        <div className="aspect-square w-full rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-3.5 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="h-9 bg-gray-100 rounded-lg animate-pulse w-full mt-1" />
      </div>
    );
  }

  const hasPromo =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;

  return (
    <div className="flex flex-col gap-0">
      {/* Category label */}
      <span className="text-xs font-medium text-gray-500 mb-2 truncate">
        {categoryLabel}
      </span>

      {/* Product image with In Stock badge */}
      <NavLink
        to={product.url}
        onClick={() => onProductSelect?.(product.productId)}
        className="group relative block"
        data-product-id={product.productId}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover:opacity-90 transition-opacity"
        />
        <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          In Stock
        </span>
      </NavLink>

      {/* Product name */}
      <p className="text-sm font-semibold text-gray-900 line-clamp-2 mt-2">
        {product.name}
      </p>

      {/* Price */}
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span
          className={`text-sm font-semibold ${hasPromo ? 'text-gray-400 line-through' : 'text-gray-900'}`}
        >
          <Money
            data={{
              amount: product.price.toString(),
              currencyCode: product.currency as any,
            }}
          />
        </span>
        {hasPromo && (
          <span className="text-sm font-semibold text-gray-900">
            <Money
              data={{
                amount: product.originalPrice!.toString(),
                currencyCode: product.currency as any,
              }}
            />
          </span>
        )}
      </div>

      {/* Add to Cart button */}
      <button
        type="button"
        className="mt-3 w-full py-2 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
      >
        Add to Cart
      </button>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function BundleDisplay({
  title = 'Recommended Bundles',
  bundles,
  surfaceMap,
  isLoading = false,
  onProductSelect,
}: BundleDisplayProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (isLoading && (!bundles || bundles.length === 0)) {
    return <BundleDisplaySkeleton />;
  }

  if (!bundles || bundles.length === 0) return null;

  const activeBundle = bundles[activeIndex];

  // Resolve product data for every slot in the active bundle
  const slotProducts = activeBundle.slots.map((slot) => ({
    categoryLabel: slot.categoryLabel,
    product: extractProductFromSurface(surfaceMap.get(slot.surfaceRef)),
  }));

  // Compute bundle total from resolved prices
  const total = slotProducts.reduce((sum, {product}) => {
    if (!product) return sum;
    // Use promo price if lower, otherwise regular price
    const effectivePrice =
      product.originalPrice !== undefined &&
      product.originalPrice < product.price
        ? product.originalPrice
        : product.price;
    return sum + effectivePrice;
  }, 0);

  const currency =
    slotProducts.find((s) => s.product)?.product?.currency || 'USD';
  const itemCount = slotProducts.filter((s) => s.product !== null).length;

  // Compute potential savings (sum of originalPrice - price where on promo)
  const savings = slotProducts.reduce((sum, {product}) => {
    if (!product) return sum;
    if (
      product.originalPrice !== undefined &&
      product.originalPrice > product.price
    ) {
      return sum + (product.originalPrice - product.price);
    }
    return sum;
  }, 0);

  console.log('[BundleDisplay] Rendering:', {
    title,
    bundleCount: bundles.length,
    activeIndex,
    activeBundleId: activeBundle.bundleId,
    slotCount: slotProducts.length,
    total,
  });

  return (
    <div className="w-full flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-0">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-6 mt-4">
        {bundles.map((bundle, idx) => (
          <button
            key={bundle.bundleId}
            onClick={() => setActiveIndex(idx)}
            className={`
              relative pb-3 px-0 mr-6 text-sm font-medium transition-colors focus:outline-none
              ${
                idx === activeIndex
                  ? 'text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {bundle.label}
            {idx === activeIndex && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-sm" />
            )}
          </button>
        ))}
      </div>

      {/* Active bundle content */}
      <div className="px-6 pt-4 pb-6 flex flex-col gap-4">
        {/* Bundle description */}
        {activeBundle.description && (
          <p className="text-sm text-gray-600">{activeBundle.description}</p>
        )}

        {/* Slot cards — responsive grid */}
        <div
          className={`grid gap-4 ${
            slotProducts.length === 2
              ? 'grid-cols-2'
              : slotProducts.length >= 3
                ? 'grid-cols-3'
                : 'grid-cols-1'
          }`}
        >
          {slotProducts.map(({categoryLabel, product}, idx) => (
            <SlotCard
              key={`${activeBundle.bundleId}-slot-${idx}`}
              categoryLabel={categoryLabel}
              product={product}
              onProductSelect={onProductSelect}
            />
          ))}
        </div>
      </div>

      {/* Bundle total footer */}
      <div className="mx-4 mb-4 flex items-center justify-between px-5 py-4 rounded-xl bg-indigo-50">
        <div className="flex flex-col">
          <span className="text-base font-bold text-gray-900">
            Bundle Total
          </span>
          <span className="text-xs text-gray-500 mt-0.5">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
            {savings > 0 && (
              <>
                {' \u2022 Save '}
                <span>
                  <Money
                    data={{
                      amount: savings.toString(),
                      currencyCode: currency as any,
                    }}
                  />
                </span>
              </>
            )}
          </span>
        </div>
        {total > 0 && (
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-gray-900">
              <Money
                data={{
                  amount: total.toString(),
                  currencyCode: currency as any,
                }}
              />
            </span>
            {savings > 0 && (
              <span className="text-xs font-semibold text-green-600 mt-0.5">
                <span>
                  <Money
                    data={{
                      amount: savings.toString(),
                      currencyCode: currency as any,
                    }}
                  />
                </span>
                {' savings'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
