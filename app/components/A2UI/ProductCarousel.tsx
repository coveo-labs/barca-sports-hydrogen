import {A2UIProductCard} from './A2UIProductCard';

interface ProductCarouselProps {
  headline?: string;
  products: Array<Record<string, unknown>>;
  isLoading?: boolean;
  onProductSelect?: (productId: string) => void;
}

/** Number of placeholder cards to render while skeleton is loading */
const SKELETON_CARD_COUNT = 4;

/**
 * A single shimmer placeholder card that matches the dimensions of A2UIProductCard:
 * - w-64, flex-none, snap-start wrapper (set by parent)
 * - aspect-square image area
 * - product name line
 * - 5-star rating row
 * - price row
 */
function SkeletonCard() {
  return (
    <div className="flex-none w-64 snap-start animate-pulse">
      {/* Image placeholder — explicit h-64 matches aspect-square on w-64 card */}
      <div className="h-64 w-full rounded-lg bg-gray-200" />
      {/* mt-4 matches real card h3 margin; no px padding to match real card */}
      <div className="mt-4 space-y-2">
        {/* Product name — two lines to match line-clamp-2 */}
        <div className="h-4 rounded bg-gray-200 w-4/5" />
        <div className="h-4 rounded bg-gray-200 w-3/5" />
        {/* Rating row — five 20×20px blocks matching StarIcon height=20 */}
        <div className="flex gap-0.5 mt-1">
          {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="h-5 w-5 rounded bg-gray-200" />
          ))}
        </div>
        {/* Price row */}
        <div className="h-4 rounded bg-gray-200 w-1/3" />
      </div>
    </div>
  );
}

/**
 * Horizontal scrolling product carousel for A2UI.
 * When `isLoading` is true and `products` is empty, renders shimmer
 * placeholder cards so the UI shows progressive content immediately
 * while the LLM is still generating the real product layout.
 */
export function ProductCarousel({
  headline,
  products,
  isLoading = false,
  onProductSelect,
}: ProductCarouselProps) {
  const showSkeleton = isLoading && products.length === 0;

  return (
    <div className="w-full">
      {headline && (
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{headline}</h2>
      )}
      {!headline && showSkeleton && (
        /* Headline placeholder while skeleton is visible */
        <div className="h-6 rounded bg-gray-200 w-48 mb-4 animate-pulse" />
      )}
      <div className="flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory">
        {showSkeleton
          ? Array.from({length: SKELETON_CARD_COUNT}).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          : products.map((product) => {
              const productId = (product.ec_product_id as string) || '';
              return (
                <div key={productId} className="flex-none w-64 snap-start">
                  <A2UIProductCard
                    productId={productId}
                    name={(product.ec_name as string) || ''}
                    brand={product.ec_brand as string | undefined}
                    imageUrl={(product.ec_image as string) || ''}
                    price={((product.ec_promo_price ?? product.ec_price) as number) || 0}
                    originalPrice={product.ec_promo_price != null ? (product.ec_price as number) : undefined}
                    currency={(product.ec_currency as string) || 'USD'}
                    rating={product.ec_rating as number | undefined}
                    description={product.ec_description as string | undefined}
                    category={product.ec_category as string | undefined}
                    url={(product.ec_url as string) || '#'}
                    colors={product.ec_colors as string[] | undefined}
                    selectedColor={
                      product.ec_selected_color as string | undefined
                    }
                    onSelect={() => onProductSelect?.(productId)}
                  />
                </div>
              );
            })}
      </div>
    </div>
  );
}
