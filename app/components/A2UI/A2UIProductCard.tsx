import {Money} from '@shopify/hydrogen';
import {StarIcon} from '@heroicons/react/20/solid';
import {NavLink} from 'react-router';
import {A2UIAddToCartButton} from './A2UIAddToCartButton';

interface A2UIProductCardProps {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  rating?: number;
  url: string;
  colors?: string[];
  selectedColor?: string;
  onSelect?: () => void;
}

/**
 * A2UI-compatible ProductCard component
 * Receives data via A2UI data binding resolution
 */
export function A2UIProductCard({
  productId,
  name,
  imageUrl,
  price,
  originalPrice,
  currency = 'USD',
  rating,
  url,
  colors,
  selectedColor,
  onSelect,
}: A2UIProductCardProps) {
  if (price === undefined || price === null) {
    return (
      <div className="text-red-500 text-xs">Error: Invalid product data</div>
    );
  }

  // originalPrice is the pre-discount (higher) price; price is the sale price.
  // hasPromo is true when there is a lower sale price than the original.
  const hasPromo = originalPrice !== undefined && originalPrice > price;
  const displayRating = rating || 0;

  return (
    <div className="w-full">
      <NavLink
        data-product-id={productId}
        onClick={onSelect}
        to={url}
        className="group"
      >
        <img
          loading="lazy"
          width={1024}
          height={1024}
          alt={name}
          src={imageUrl}
          className="aspect-square w-full rounded-lg bg-gray-200 object-cover group-hover:opacity-75"
        />
        <h3 className="result-title mt-4 text-sm text-gray-700 line-clamp-2">
          {name}
        </h3>
        <div className="flex mt-1">
          {Array.from(Array(5).keys()).map((i) => (
            <StarIcon
              key={i}
              height={20}
              fill={i < Math.floor(displayRating) ? '#fde047' : '#94a3b8'}
            />
          ))}
        </div>
        <div className="flex justify-between items-center mt-1 text-sm font-medium">
          {/* Current (sale) price */}
          <div className="text-gray-900">
            <Money
              data={{
                amount: price.toString(),
                currencyCode: currency as any,
              }}
            />
          </div>
          {/* Original (pre-discount) price shown struck-through when on promo */}
          {hasPromo && (
            <div className="text-gray-400 line-through">
              <Money
                data={{
                  amount: originalPrice!.toString(),
                  currencyCode: currency as any,
                }}
              />
            </div>
          )}
        </div>
      </NavLink>
      {/* Add to Cart icon button — outside NavLink to avoid nested interactive elements */}
      <div className="flex justify-end -mt-6 relative z-10">
        <A2UIAddToCartButton
          variant="icon"
          item={{
            merchandiseId: productId,
            name,
            price,
            currency,
          }}
        />
      </div>
      {colors && colors.length > 0 && (
        <div className="flex gap-2 mt-3">
          {colors.map((color) => (
            <div
              key={color}
              className={`w-6 h-6 rounded-full border-2 ${
                selectedColor === color ? 'border-gray-900' : 'border-gray-300'
              }`}
              style={{backgroundColor: color.toLowerCase()}}
              title={color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
