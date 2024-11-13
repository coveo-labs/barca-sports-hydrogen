/* eslint-disable jsx-a11y/mouse-events-have-key-events */
import type {Product} from '@coveo/headless/commerce';
import {Image, Money, useOptimisticVariant} from '@shopify/hydrogen';
import {AddToCartButton} from '../AddToCartButton';
import {useAside} from '../Aside';
import {useState} from 'react';

import {StarIcon} from '@heroicons/react/20/solid';

interface ProductCardProps {
  product: Product;
}
export function ProductCard({product}: ProductCardProps) {
  const [currentImg, setCurrentImg] = useState(product.ec_images[0]);
  const [hovered, setHovered] = useState(false);
  console.log(product);
  return (
    <div
      className="group relative p-8"
      onMouseOver={() => setHovered(true)}
      onMouseOut={() => setHovered(false)}
    >
      <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-md bg-gray-200 lg:aspect-none group-hover:opacity-75">
        <Image
          sizes="200"
          alt={product.ec_name!}
          src={currentImg}
          className="h-full w-full object-cover object-center lg:h-full lg:w-full"
        />
      </div>
      <div className="mt-4 flex justify-between">
        <div>
          <h3 className="text-sm text-gray-700">
            <a href={`/products/${product.ec_item_group_id}`}>
              <span aria-hidden="true" className="absolute inset-0" />
              {product.ec_name}
            </a>
          </h3>
          <p className="mt-1 text-sm text-gray-500">{product.ec_color}</p>
        </div>
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
      </div>
      <div className=" mt-4 flex justify-between">
        <div
          className={`text-lg font-medium ${
            product.ec_promo_price ? 'line-through' : ''
          }`}
        >
          <Money
            data={{amount: product.ec_price?.toString(), currencyCode: 'USD'}}
          />
        </div>
        {product.ec_promo_price && (
          <div className={`text-lg font-medium text-red-700`}>
            <Money
              data={{
                amount: product.ec_promo_price?.toString(),
                currencyCode: 'USD',
              }}
            />
          </div>
        )}
      </div>

      {product.children.length > 1 && (
        <div className="text-sm text-gray-700 mt-4">
          Also available in:
          <div className="flex justify-between">
            {product.children.map((child) => {
              if (child.ec_images[0] === currentImg) {
                return null;
              }
              return (
                <div
                  key={child.permanentid}
                  className="w-full overflow-hidden rounded-md bg-gray-200"
                >
                  <Image
                    sizes="200"
                    alt={child.ec_name!}
                    src={child.ec_images[0]}
                    className="h-full w-full object-cover object-center lg:h-full lg:w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
