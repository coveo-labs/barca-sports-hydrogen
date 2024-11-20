import {Money} from '@shopify/hydrogen';
import type {ProductFragment} from 'storefrontapi.generated';

export function Description({product}: {product: ProductFragment}) {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">
        {product.title}
      </h1>

      <div className="mt-3">
        <h2 className="sr-only">Product information</h2>
        <div className="text-3xl tracking-tight text-gray-900">
          <Money data={product.selectedVariant?.price || {}} />
        </div>
      </div>
      <div className="mt-6">
        <h3 className="sr-only">Description</h3>

        <div
          dangerouslySetInnerHTML={{__html: product.descriptionHtml}}
          className="space-y-6 text-base text-gray-700"
        />
      </div>
    </>
  );
}
