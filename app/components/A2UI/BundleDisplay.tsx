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
      <div className="px-5 pt-5 pb-3">
        <div className="h-5 rounded bg-gray-200 w-48" />
      </div>

      {/* Tab bar shimmer */}
      <div className="flex border-b border-gray-200 px-5 gap-2 pb-3 pt-1">
        {Array.from({length: SKELETON_TABS}).map((_, i) => (
          <div key={i} className="h-4 rounded bg-gray-200 w-20" />
        ))}
      </div>

      {/* Slot cards shimmer */}
      <div className="px-5 py-4 flex gap-4 overflow-x-auto pb-5">
        {Array.from({length: SKELETON_SLOTS}).map((_, i) => (
          <div key={i} className="flex flex-col gap-2 w-44 flex-none">
            {/* Category label shimmer */}
            <div className="h-3 rounded bg-gray-200 w-16" />
            {/* Image shimmer */}
            <div className="aspect-square w-full rounded-lg bg-gray-200" />
            {/* Name shimmer */}
            <div className="h-3 rounded bg-gray-200 w-3/4" />
            {/* Price shimmer */}
            <div className="h-3 rounded bg-gray-200 w-1/2" />
          </div>
        ))}
      </div>

      {/* Footer shimmer */}
      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex flex-col gap-1">
          <div className="h-4 rounded bg-gray-200 w-24" />
          <div className="h-3 rounded bg-gray-200 w-12" />
        </div>
        <div className="h-6 rounded bg-gray-200 w-16" />
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
    // Skeleton while data loads
    return (
      <div className="flex flex-col gap-2 w-44 flex-none">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
          {categoryLabel}
        </span>
        <div className="aspect-square w-full rounded-lg bg-gray-100 animate-pulse" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
      </div>
    );
  }

  const hasPromo =
    product.originalPrice !== undefined &&
    product.originalPrice > product.price;

  return (
    <div className="flex flex-col gap-2 w-44 flex-none">
      {/* Category label above card */}
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
        {categoryLabel}
      </span>

      <NavLink
        to={product.url}
        onClick={() => onProductSelect?.(product.productId)}
        className="group flex flex-col gap-1"
        data-product-id={product.productId}
      >
        {/* Product image + In Stock badge */}
        <div className="relative">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="aspect-square w-full rounded-lg bg-gray-100 object-cover group-hover:opacity-75"
          />
          <span className="absolute top-2 left-2 bg-green-100 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            In Stock
          </span>
        </div>

        {/* Product name */}
        <p className="text-sm text-gray-800 font-medium line-clamp-2 mt-1">
          {product.name}
        </p>

        {/* Price */}
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={
              hasPromo ? 'line-through text-gray-400' : 'text-gray-900'
            }
          >
            <Money
              data={{
                amount: product.price.toString(),
                currencyCode: product.currency as any,
              }}
            />
          </span>
          {hasPromo && (
            <span className="text-gray-900">
              <Money
                data={{
                  amount: product.originalPrice!.toString(),
                  currencyCode: product.currency as any,
                }}
              />
            </span>
          )}
        </div>
      </NavLink>
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

  console.log('[BundleDisplay] Rendering:', {
    title,
    bundleCount: bundles.length,
    activeIndex,
    activeBundleId: activeBundle.bundleId,
    slotCount: slotProducts.length,
    total,
  });

  return (
    <div className="w-full flex flex-col gap-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-5">
        {bundles.map((bundle, idx) => (
          <button
            key={bundle.bundleId}
            onClick={() => setActiveIndex(idx)}
            className={`
              relative pb-3 pt-1 px-4 text-sm font-medium transition-colors focus:outline-none
              ${
                idx === activeIndex
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }
            `}
          >
            {bundle.label}
            {/* Active underline */}
            {idx === activeIndex && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Active bundle content */}
      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Bundle description */}
        {activeBundle.description && (
          <p className="text-sm text-gray-600">{activeBundle.description}</p>
        )}

        {/* Slot cards – horizontal row */}
        <div className="flex gap-4 overflow-x-auto pb-1">
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
      <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">
            Bundle Total
          </span>
          <span className="text-xs text-gray-500">{itemCount} items</span>
        </div>
        {total > 0 && (
          <span className="text-lg font-bold text-gray-900">
            <Money
              data={{
                amount: total.toString(),
                currencyCode: currency as any,
              }}
            />
          </span>
        )}
      </div>
    </div>
  );
}
