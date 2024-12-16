import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import {CartForm} from '@shopify/hydrogen';
import {XMarkIcon as XMarkIconMini} from '@heroicons/react/20/solid';
import {useCart} from '~/lib/coveo.engine';
import type {CartItem} from '@coveo/headless-react/ssr-commerce';

/**
 * A button that removes a line item from the cart. It is disabled
 * when the line item is new, and the server hasn't yet responded
 * that it was successfully added to the cart.
 */
export function CartLineRemoveButton({
  lineIds,
  disabled,
  cartItem,
}: {
  lineIds: string[];
  disabled: boolean;
  cartItem: CartItem;
}) {
  const coveoCart = useCart();
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button
        onClick={() => {
          coveoCart.methods?.updateItemQuantity(cartItem);
          /*setTimeout(() => {
            window.location.reload();
          }, 100);*/
        }}
        disabled={disabled}
        type="submit"
        className="-m-2 inline-flex p-2 text-gray-400 hover:text-gray-500"
      >
        <span className="sr-only">Remove</span>
        <XMarkIconMini aria-hidden="true" className="size-5" />
      </button>
    </CartForm>
  );
}

export function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}
