import type {Product} from '@coveo/headless/commerce';
import {Image, Money, useOptimisticVariant} from '@shopify/hydrogen';
import {AddToCartButton} from '../AddToCartButton';
import {useAside} from '../Aside';
import {useState} from 'react';

import {StarIcon} from '@heroicons/react/20/solid';
import {NavLink} from '@remix-run/react';
import cx from '~/lib/cx';

interface ProductCardProps {
  product: Product;
}
export function ProductCard({product}: ProductCardProps) {
  return (
    <NavLink
      key={product.permanentid}
      to={`/products/${product.ec_item_group_id?.replace(/0/, '')}`}
      className="group"
    >
      <img
        alt={product.ec_name!}
        src={product.ec_images[0]}
        className="aspect-square w-full rounded-lg bg-gray-200 object-cover group-hover:opacity-75 xl:aspect-[7/8]"
      />
      <h3 className="mt-4 text-sm text-gray-700">{product.ec_name}</h3>
      <div className="flex">
        {Array.from(Array(5).keys()).map((i) => {
          return (
            <StarIcon
              height={20}
              fill={i < Math.floor(product.ec_rating!) ? '#fde047' : '#94a3b8'}
              key={i}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-lg font-medium">
        <div
          className={cx(
            'text-gray-900',
            product.ec_promo_price ? 'line-through text-gray-300' : '',
          )}
        >
          <Money
            data={{amount: product.ec_price?.toString(), currencyCode: 'USD'}}
          />
        </div>
        {product.ec_promo_price && (
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
  );
}
