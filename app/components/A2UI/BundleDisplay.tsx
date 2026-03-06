import {useState} from 'react';
import {Money} from '@shopify/hydrogen';
import {NavLink} from 'react-router';
import type {SurfaceState} from '~/lib/a2ui/surface-manager';
import {A2UIAddToCartButton} from './A2UIAddToCartButton';
import {ProductDrawer} from './ProductDrawer';

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
  const rawEcPrice = p.ec_price;
  if (rawEcPrice === undefined || rawEcPrice === null) return null;
  const ecPrice =
    typeof rawEcPrice === 'number'
      ? rawEcPrice
      : parseFloat(rawEcPrice as string);
  if (isNaN(ecPrice)) return null;

  const rawPromoPrice = p.ec_promo_price;
  const ecPromoPrice =
    rawPromoPrice !== undefined && rawPromoPrice !== null
      ? typeof rawPromoPrice === 'number'
        ? rawPromoPrice
        : parseFloat(rawPromoPrice as string)
      : undefined;

  // price = what the customer pays now (promo if on sale, otherwise regular)
  // originalPrice = full price shown struck-through, only set when on promo
  const hasPromo = ecPromoPrice !== undefined && !isNaN(ecPromoPrice);
  const price = hasPromo ? ecPromoPrice! : ecPrice;
  const originalPrice = hasPromo ? ecPrice : undefined;

  return {
    productId: (p.ec_product_id as string) || '',
    name: (p.ec_name as string) || '',
    brand: (p.ec_brand as string) || undefined,
    imageUrl: (p.ec_image as string) || '',
    price,
    originalPrice,
    currency: (p.ec_currency as string) || 'USD',
    rating: p.ec_rating as number | undefined,
    description: (p.ec_description as string) || undefined,
    category: (p.ec_category as string) || undefined,
    url: (p.ec_url as string) || '#',
  };
}

interface ProductSlotData {
  productId: string;
  name: string;
  brand?: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  currency: string;
  rating?: number;
  description?: string;
  category?: string;
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

      {/* Slot cards shimmer — always 3-column grid */}
      <div className="px-6 py-4 grid grid-cols-4 gap-4">
        {Array.from({length: SKELETON_SLOTS}).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            {/* Category label */}
            <div className="h-3 rounded bg-gray-200 w-20" />
            {/* Image */}
            <div className="h-40 w-full rounded-lg bg-gray-200" />
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
  onImageClick,
}: {
  categoryLabel: string;
  product: ProductSlotData | null;
  onProductSelect?: (productId: string) => void;
  onImageClick?: (product: ProductSlotData) => void;
}) {
  if (!product) {
    // Skeleton while this specific slot's data loads
    return (
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
          {categoryLabel}
        </span>
        <div className="h-40 w-full rounded-lg bg-gray-100 animate-pulse" />
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
      <button
        type="button"
        onClick={() => onImageClick?.(product)}
        className="group relative block w-full text-left"
        data-product-id={product.productId}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full rounded-lg bg-gray-100 object-cover group-hover:opacity-90 transition-opacity"
        />
        <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
          In Stock
        </span>
      </button>

      {/* Product name */}
      <NavLink
        to={product.url}
        onClick={() => onProductSelect?.(product.productId)}
        className="hover:underline"
      >
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 mt-2">
          {product.name}
        </p>
      </NavLink>

      {/* Price */}
      <div className="flex items-baseline gap-1.5 mt-0.5">
        {hasPromo && (
          <span className="text-sm font-semibold text-gray-400 line-through">
            <Money
              data={{
                amount: product.originalPrice!.toString(),
                currencyCode: product.currency as any,
              }}
            />
          </span>
        )}
        <span className="text-sm font-semibold text-gray-900">
          <Money
            data={{
              amount: product.price.toString(),
              currencyCode: product.currency as any,
            }}
          />
        </span>
      </div>

      {/* Add to Cart button */}
      <A2UIAddToCartButton
        variant="outline"
        item={{
          merchandiseId: product.productId,
          name: product.name,
          price: product.price,
          currency: product.currency,
        }}
        className="mt-3"
      />
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
  const [drawerProduct, setDrawerProduct] = useState<ProductSlotData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = (product: ProductSlotData) => {
    setDrawerProduct(product);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

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
  // product.price is already the effective (sale or regular) price
  const total = slotProducts.reduce((sum, {product}) => {
    if (!product) return sum;
    return sum + product.price;
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

  return (
    <>
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

        {/* Slot cards — always 3-col grid, horizontal scroll for >3 slots */}
        <div className="overflow-x-auto -mx-6 px-6">
          <div
            className="grid grid-cols-4 gap-4"
            style={{
              minWidth:
                slotProducts.length > 4
                  ? `${slotProducts.length * 160}px`
                  : undefined,
            }}
          >
            {slotProducts.map(({categoryLabel, product}, idx) => (
              <SlotCard
                key={`${activeBundle.bundleId}-slot-${idx}`}
                categoryLabel={categoryLabel}
                product={product}
                onProductSelect={onProductSelect}
                onImageClick={openDrawer}
              />
            ))}
          </div>
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

      <ProductDrawer
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          productId={drawerProduct?.productId ?? ''}
          name={drawerProduct?.name ?? ''}
          brand={drawerProduct?.brand}
          imageUrl={drawerProduct?.imageUrl ?? ''}
          price={drawerProduct?.price ?? 0}
          originalPrice={drawerProduct?.originalPrice}
          currency={drawerProduct?.currency ?? 'USD'}
          description={drawerProduct?.description}
          category={drawerProduct?.category}
          rating={drawerProduct?.rating}
          productUrl={drawerProduct?.url ?? '#'}
        />
    </>
  );
}
