import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import {type FetcherWithComponents} from 'react-router';
import {ShoppingCartIcon} from '@heroicons/react/24/outline';
import {useCart} from '~/lib/coveo/engine';
import type {CartReturn} from '~/routes/($locale).cart';
import '~/types/gtm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface A2UICartItem {
  /** Shopify variant GID — doubles as Coveo productId (ec_product_id) */
  merchandiseId: string;
  name: string;
  price: number;
  currency?: string;
  quantity?: number;
}

/**
 * Visual variants:
 *  - "icon"    — small cart icon only; used in A2UIProductCard price row
 *  - "full"    — full-width pill button; used in ComparisonTable
 *  - "outline" — full-width outlined button; used in BundleDisplay SlotCard
 */
export type A2UIAddToCartVariant = 'icon' | 'full' | 'outline';

interface A2UIAddToCartButtonProps {
  item: A2UICartItem;
  variant?: A2UIAddToCartVariant;
  /** Extra className merged onto the button */
  className?: string;
  /** Whether the button should be forced disabled (e.g. product not yet loaded) */
  disabled?: boolean;
  /** Optional label override — only rendered for 'full' and 'outline' variants */
  label?: string;
  /** Whether the button should be highlighted (recommended product in ComparisonTable) */
  highlighted?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns an onClick handler that:
 * 1. Syncs the new quantity to the Coveo cart engine
 * 2. Pushes an add_to_cart GTM dataLayer event
 *
 * Call this once per item and pass the returned handler to the button's onClick.
 */
export function useA2UIAddToCart(item: A2UICartItem) {
  const coveoCart = useCart();
  const qty = item.quantity ?? 1;

  return function handleAddToCart() {
    // ── Coveo cart sync ──────────────────────────────────────────────────────
    const currentQuantity =
      coveoCart.state.items.find((i) => i.productId === item.merchandiseId)
        ?.quantity ?? 0;
    const newQuantity = currentQuantity + qty;

    coveoCart.methods?.updateItemQuantity({
      name: item.name,
      price: item.price,
      productId: item.merchandiseId,
      quantity: newQuantity,
    });

    // ── GTM dataLayer ────────────────────────────────────────────────────────
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ecommerce: null}); // clear previous ecommerce object
    window.dataLayer.push({
      event: 'add_to_cart',
      ecommerce: {
        currency: item.currency ?? 'USD',
        value: item.price,
        items: [
          {
            item_id: item.merchandiseId,
            item_name: item.name,
            price: item.price,
            quantity: qty,
          },
        ],
      },
    });
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * A2UI Add-to-Cart button.
 *
 * Wraps Shopify's CartForm (LinesAdd action) and delegates all side-effects
 * (Coveo cart sync + GTM analytics) to `useA2UIAddToCart`.
 *
 * Use the `variant` prop to control visual appearance:
 *  - "icon"    → small cart icon (A2UIProductCard price row)
 *  - "full"    → full-width indigo/gray pill (ComparisonTable)
 *  - "outline" → full-width outlined (BundleDisplay SlotCard)
 */
export function A2UIAddToCartButton({
  item,
  variant = 'full',
  className = '',
  disabled = false,
  label = 'Add to Cart',
  highlighted = false,
}: A2UIAddToCartButtonProps) {
  const handleAddToCart = useA2UIAddToCart(item);

  // selectedVariant is required by useOptimisticCart to:
  // 1. Optimistically update totalQuantity (drives the header cart badge)
  // 2. Detect duplicate lines and merge quantities instead of adding a new line
  const lines: OptimisticCartLineInput[] = [
    {
      merchandiseId: item.merchandiseId,
      quantity: item.quantity ?? 1,
      selectedVariant: {id: item.merchandiseId},
    },
  ];

  return (
    <CartForm
      fetcherKey={`add-to-cart-${item.merchandiseId}`}
      route="/cart"
      inputs={{lines}}
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher: FetcherWithComponents<CartReturn>) => {
        const isSubmitting = fetcher.state !== 'idle';
        const isDisabled = disabled || isSubmitting;

        if (variant === 'icon') {
          return (
            <button
              type="submit"
              onClick={handleAddToCart}
              disabled={isDisabled}
              aria-label="Add to cart"
              className={`
                flex items-center justify-center rounded-full p-1.5
                text-gray-400 hover:text-indigo-600 hover:bg-indigo-50
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
                ${className}
              `.trim()}
            >
              <ShoppingCartIcon className="h-5 w-5" />
            </button>
          );
        }

        if (variant === 'outline') {
          return (
            <button
              type="submit"
              onClick={handleAddToCart}
              disabled={isDisabled}
              className={`
                w-full py-2 px-4 rounded-lg border border-gray-300
                text-sm font-medium text-gray-700 bg-white
                hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed
                transition-colors
                ${className}
              `.trim()}
            >
              {isSubmitting ? 'Adding…' : label}
            </button>
          );
        }

        // variant === 'full'
        return (
          <button
            type="submit"
            onClick={handleAddToCart}
            disabled={isDisabled}
            className={`
              w-full py-2 px-4 rounded-full text-sm font-semibold transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed
              ${
                highlighted
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-900 text-white hover:bg-gray-700'
              }
              ${className}
            `.trim()}
          >
            {isSubmitting ? 'Adding…' : label}
          </button>
        );
      }}
    </CartForm>
  );
}
