import {type FetcherWithComponents} from '@remix-run/react';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import {useState} from 'react';
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
  const [addedProduct, setAddedProduct] = useState(false);
  const [fetcher, setFetcher] = useState<FetcherWithComponents<CartReturn>>();
  return (
    <CartForm route="/cart" inputs={{lines}} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<CartReturn>) => {
        setFetcher(fetcher);
        return (
          <>
            <input
              name="analytics"
              type="hidden"
              value={JSON.stringify(analytics)}
            />
            <input name="redirectTo" type="hidden" value={redirectTo}></input>
            <button
              className="flex max-w-xs flex-1 items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:w-full"
              type="submit"
              onClick={() => setAddedProduct(true)}
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
