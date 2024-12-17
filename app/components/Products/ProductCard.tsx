import type {Product} from '@coveo/headless-react/ssr-commerce';
import {Money} from '@shopify/hydrogen';

import {StarIcon} from '@heroicons/react/20/solid';
import {NavLink, useRouteLoaderData} from '@remix-run/react';
import type {RootLoader} from '~/root';
import {Colors} from './Colors';
import {useState} from 'react';

interface ProductCardProps {
  product: Product;
  onSelect?: () => void;
  className?: string;
}
export function ProductCard({
  product,
  onSelect,
  className = '',
}: ProductCardProps) {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const hasPromo =
    (product.ec_promo_price && product.ec_promo_price < product.ec_price!) ||
    false;
  const [selectedColor, setSelectedColor] = useState(
    product.ec_color || 'Black',
  );
  const availableColors = product.children?.map((c) => c.ec_color || '') || [];
  const productImage =
    product.children?.find((c) => c.ec_color === selectedColor)?.ec_images[0] ||
    product.ec_images[0];
  const productId = product.ec_item_group_id;

  return (
    <div>
      <NavLink
        key={product.permanentid}
        onClick={onSelect}
        to={`/products/${productId?.toUpperCase()}?Color=${selectedColor}`}
        className={`${className} group`}
      >
        <img
          loading="lazy"
          width={1024}
          height={1024}
          alt={product.ec_name!}
          src={productImage}
          className="aspect-square w-full rounded-lg bg-gray-200 object-cover group-hover:opacity-75"
        />
        <h3 className="result-title mt-4 text-sm text-gray-700">
          {product.ec_name}
        </h3>
        <div className="flex">
          {Array.from(Array(5).keys()).map((i) => {
            return (
              <StarIcon
                height={20}
                fill={
                  i < Math.floor(product.ec_rating!) ? '#fde047' : '#94a3b8'
                }
                key={i}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-lg font-medium">
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
      <Colors
        headline=""
        currentColor={selectedColor}
        availableColors={availableColors}
        onSelect={setSelectedColor}
      />
    </div>
  );
}
