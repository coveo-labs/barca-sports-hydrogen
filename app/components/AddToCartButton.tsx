import {useParams, type FetcherWithComponents} from '@remix-run/react';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import {useCart} from '~/lib/coveo.engine';
import type {CartReturn} from '~/routes/($locale).cart';
import type {ProductHandleData} from '~/routes/($locale).products.$handle';

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
  const coveoProductId = useParams().handle;

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
                  productId: coveoProductId!,
                  quantity: newQuantity,
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
