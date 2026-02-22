import {A2UIProductCard} from './A2UIProductCard';

interface ProductCarouselProps {
  headline?: string;
  products: Array<Record<string, unknown>>;
  onProductSelect?: (productId: string) => void;
}

/**
 * Horizontal scrolling product carousel for A2UI
 * Displays a list of products in a scrollable container
 */
export function ProductCarousel({
  headline,
  products,
  onProductSelect,
}: ProductCarouselProps) {
  console.log('[ProductCarousel] Rendering with products:', products);

  return (
    <div className="w-full">
      {headline && (
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{headline}</h2>
      )}
      <div className="flex gap-6 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory">
        {products.map((product) => {
          // Map Coveo commerce fields to ProductCard props
          const productId = (product.ec_product_id as string) || '';
          return (
            <div key={productId} className="flex-none w-64 snap-start">
              <A2UIProductCard
                productId={productId}
                name={(product.ec_name as string) || ''}
                imageUrl={(product.ec_image as string) || ''}
                price={(product.ec_price as number) || 0}
                originalPrice={product.ec_promo_price as number | undefined}
                currency={(product.ec_currency as string) || 'USD'}
                rating={product.ec_rating as number | undefined}
                url={(product.ec_url as string) || '#'}
                colors={product.ec_colors as string[] | undefined}
                selectedColor={product.ec_selected_color as string | undefined}
                onSelect={() => onProductSelect?.(productId)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
