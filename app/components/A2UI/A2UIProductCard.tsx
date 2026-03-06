import {NavLink} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import {StarIcon} from '@heroicons/react/20/solid';
import {useState} from 'react';
import {A2UIAddToCartButton} from './A2UIAddToCartButton';
import {ProductDrawer} from './ProductDrawer';

interface A2UIProductCardProps {
  productId: string;
  name: string;
  brand?: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  rating?: number;
  description?: string;
  category?: string;
  url: string;
  colors?: string[];
  selectedColor?: string;
  onSelect?: () => void;
}

/**
 * A2UI-compatible ProductCard component
 * Receives data via A2UI data binding resolution (ec_* fields from data model).
 */
export function A2UIProductCard({
  productId,
  name,
  brand,
  imageUrl,
  price,
  originalPrice,
  currency = 'USD',
  rating,
  description,
  category,
  url,
  colors,
  selectedColor,
  onSelect,
}: A2UIProductCardProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCardClick = () => {
    onSelect?.();
    setIsDrawerOpen(true);
  };

  if (price === undefined || price === null) {
    return (
      <div className="text-red-500 text-xs">Error: Invalid product data</div>
    );
  }

  // originalPrice is the pre-discount (higher) price; price is the sale price.
  // hasPromo is true when there is a lower sale price than the original.
  const hasPromo = originalPrice !== undefined && originalPrice > price;

  return (
    <div className="w-full">
      <button
        type="button"
        data-product-id={productId}
        onClick={handleCardClick}
        className="group w-full text-left"
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
        <div className="flex justify-between items-center mt-1 text-sm font-medium">
          {/* Current (sale) price */}
          <div className="text-gray-900">
            <Money
              data={{
                amount: price.toString(),
                currencyCode: currency as CurrencyCode,
              }}
            />
          </div>
          {/* Original (pre-discount) price shown struck-through when on promo */}
          {hasPromo && (
            <div className="text-gray-400 line-through">
              <Money
                data={{
                  amount: originalPrice!.toString(),
                  currencyCode: currency as CurrencyCode,
                }}
              />
            </div>
          )}
        </div>
      </button>
      {/* Add to Cart icon button — outside card button to avoid nested interactive elements */}
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

      <ProductDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        productId={productId}
        name={name}
        brand={brand}
        imageUrl={imageUrl}
        price={price}
        originalPrice={originalPrice}
        currency={currency}
        description={description}
        category={category}
        productUrl={url}
      />
    </div>
  );
}
