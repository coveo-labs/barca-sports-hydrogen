import type {Product} from '@coveo/headless-react/ssr-commerce';
import {Money} from '@shopify/hydrogen';

import {StarIcon} from '@heroicons/react/20/solid';
import type {RootLoader} from '~/root';
import {Colors} from './Colors';
import {useState} from 'react';
import {NavLink, useRouteLoaderData} from 'react-router';

interface ProductCardProps {
  product: Product;
  onSelect?: () => void;
  className?: string;
  onSwapColor?: (color: string) => void;
  variant?: 'default' | 'compact';
}
export function ProductCard({
  product,
  onSelect,
  className = '',
  onSwapColor,
  variant = 'default',
}: ProductCardProps) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const hasPromo =
    (product.ec_promo_price && product.ec_promo_price < product.ec_price!) ||
    false;
  const [selectedColor, setSelectedColor] = useState(
    product.ec_color || 'Black',
  );
  const availableColors = Array.from(
    new Set(product.children?.map((c) => c.ec_color || '') || []),
  );
  const productImage =
    product.children?.find((c) => c.ec_color === selectedColor)?.ec_images[0] ||
    product.ec_images[0];
  const productLink = new URL(product.clickUri).pathname;
  const productName = (product.additionalFields?.ec_item_group_name ||
    product.ec_name ||
    '') as string;

  const onColorChange = (color: string) => {
    setSelectedColor(color);
    onSwapColor?.(color);
  };

  const isCompact = variant === 'compact';

  return (
    <div
      style={
        isCompact
          ? {width: '160px', minWidth: '160px', maxWidth: '160px'}
          : undefined
      }
    >
      <NavLink
        key={product.permanentid}
        data-product-id={product.permanentid}
        onClick={onSelect}
        to={`${productLink}?Color=${selectedColor}`}
        className={`${className} group`}
      >
        <img
          loading="lazy"
          width={isCompact ? 160 : 1024}
          height={isCompact ? 160 : 1024}
          alt={productName}
          src={productImage}
          className={
            isCompact
              ? 'aspect-square w-full rounded-lg bg-gray-200 object-cover group-hover:opacity-75'
              : 'aspect-square w-full rounded-lg bg-gray-200 object-cover group-hover:opacity-75'
          }
          style={isCompact ? {width: '160px', height: '160px'} : undefined}
        />
        <h3
          className={
            isCompact
              ? 'result-title mt-2 text-xs text-gray-700 line-clamp-2'
              : 'result-title mt-4 text-sm text-gray-700'
          }
        >
          {productName}
        </h3>
        <div className={isCompact ? 'flex mt-1' : 'flex'}>
          {Array.from(Array(5).keys()).map((i) => {
            return (
              <StarIcon
                height={isCompact ? 14 : 20}
                fill={
                  i < Math.floor(product.ec_rating!) ? '#fde047' : '#94a3b8'
                }
                key={i}
              />
            );
          })}
        </div>
        <div
          className={
            isCompact
              ? 'flex justify-between mt-0.5 text-sm font-medium'
              : 'flex justify-between mt-1 text-lg font-medium'
          }
        >
          <div
            className={
              hasPromo ? 'text-gray-400 line-through' : 'text-gray-900'
            }
          >
            <Money
              data={{
                amount: product.ec_price?.toString(),
                currencyCode: rootData?.locale.currency || 'USD',
              }}
            />
          </div>
          {hasPromo && (
            <div className={`text-gray-900`}>
              <Money
                data={{
                  amount: product.ec_promo_price?.toString(),
                  currencyCode: 'USD',
                }}
              />
            </div>
          )}
        </div>
      </NavLink>
      {!isCompact && (
        <Colors
          headline=""
          currentColor={selectedColor}
          availableColors={availableColors}
          onSelect={onColorChange}
        />
      )}
    </div>
  );
}
