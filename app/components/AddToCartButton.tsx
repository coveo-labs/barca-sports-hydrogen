import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import {type FetcherWithComponents} from 'react-router';
import {useCart} from '~/lib/coveo/engine';
import type {CartReturn} from '~/routes/($locale).cart';
import type {ProductHandleData} from '~/routes/($locale).products.$handle';
import '~/types/gtm';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  redirectTo,
  product,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  redirectTo: string;
  product: Awaited<ReturnType<ProductHandleData>>['product'];
}) {
  const coveoCart = useCart();
  const currentQuantity =
    coveoCart.state.items.find((item) => item.productId === product.id)
      ?.quantity || 0;

  const quantityToAdd = lines[0].quantity!;
  const newQuantity = currentQuantity + quantityToAdd;

  // UNI-1358
  const productId = product.selectedVariant
    ? product.selectedVariant.id
    : product.id;

  return (
    <CartForm
      fetcherKey="add-to-cart"
      route="/cart"
      inputs={{lines}}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher: FetcherWithComponents<CartReturn>) => {
        return (
          <>
            <input
              name="analytics"
              type="hidden"
              value={JSON.stringify(analytics)}
            />
            <input name="redirectTo" type="hidden" value={redirectTo}></input>
            <button
              onClick={() => {
                coveoCart.methods?.updateItemQuantity({
                  name: product.title,
                  price: Number(product.selectedVariant?.price.amount),
                  productId,
                  quantity: newQuantity,
                });
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ecommerce: null}); // Clear the previous ecommerce object.
                window.dataLayer.push({
                  event: 'add_to_cart',
                  ecommerce: {
                    currency: 'USD',
                    value: Number(product.selectedVariant?.price.amount),
                    items: [
                      {
                        item_id: productId,
                        item_name: product.title,
                        price: Number(product.selectedVariant?.price.amount),
                        quantity: quantityToAdd,
                      },
                    ],
                  },
                });
              }}
              className="add-to-cart flex max-w-xs flex-1 items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:w-full"
              type="submit"
              disabled={disabled ?? fetcher.state !== 'idle'}
            >
              {children}
            </button>
          </>
        );
      }}
    </CartForm>
  );
}
