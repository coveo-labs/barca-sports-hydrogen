import {Money, useOptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {CheckIcon, QuestionMarkCircleIcon} from '@heroicons/react/20/solid';
import {CartLineRemoveButton, CartLineUpdateButton} from './CartLineItem';
import {useCart, useEngine} from '~/lib/coveo/engine';
import cx from '~/lib/cx';
import type {CartLine} from '@shopify/hydrogen/storefront-api-types';
import {mapShopifyMerchandiseToCoveoCartItem} from '~/lib/coveo/map.coveo.shopify';
import '~/types/gtm';
import {NavLink} from 'react-router';
import {useEffect, useRef, useState} from 'react';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
};

/**
 * A quantity selector that updates the cart line quantity when changed.
 * Uses standard CartForm API with a controlled select element and form submission.
 */
function CartLineQuantitySelector({
  lineId,
  quantity,
  productIdx,
}: {
  lineId: string;
  quantity: number;
  productIdx: number;
}) {
  const [selectedQuantity, setSelectedQuantity] = useState(quantity);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  // Sync state with prop when quantity changes externally (e.g., optimistic updates)
  useEffect(() => {
    setSelectedQuantity(quantity);
  }, [quantity]);

  // Submit form after state update completes
  useEffect(() => {
    if (pendingSubmit && formRef.current) {
      formRef.current.requestSubmit();
      setPendingSubmit(false);
    }
  }, [pendingSubmit, selectedQuantity]);

  const handleQuantityChange = (newQuantity: number) => {
    // Validate the parsed quantity
    if (!Number.isInteger(newQuantity) || newQuantity < 1 || newQuantity > 10) {
      console.error('Invalid quantity:', newQuantity);
      return;
    }
    setSelectedQuantity(newQuantity);
    setPendingSubmit(true);
  };

  return (
    <CartLineUpdateButton lines={[{id: lineId, quantity: selectedQuantity}]}>
      <select
        ref={(el) => {
          formRef.current = el?.form || null;
        }}
        value={selectedQuantity}
        id={`quantity-${productIdx}`}
        name={`quantity-${productIdx}`}
        className="max-w-full rounded-md border border-gray-300 py-1.5 text-left text-base/5 font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
        onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
      >
        {Array.from({length: 10}, (_, i) => i).map((i) => (
          <option key={i + 1} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
    </CartLineUpdateButton>
  );
}

export function CartMain({cart: originalCart}: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);
  const coveoCart = useCart();
  const engine = useEngine();
  const hasCartItems = (coveoCart.state as any)?.totalQuantity > 0;

  // Sync Coveo cart with Shopify cart whenever cart changes
  useEffect(() => {
    if (!cart?.lines.nodes || !coveoCart.methods) return;

    cart.lines.nodes.forEach((node) => {
      (coveoCart.methods as any)?.updateItemQuantity?.({
        name: node.merchandise.product.title,
        price: Number(node.merchandise.price.amount),
        productId: node.merchandise.id,
        quantity: node.quantity,
      });
    });
  }, [cart?.lines.nodes, coveoCart.methods]);

  const buildDataLayerForPurchase = (cart: any) => {
    if (!cart) {
      console.error('Failed to fetch cart object. Aborting tracking!');
      return;
    }
    const purchaseDataLayerObject = {
      event: 'purchase' as const,
      ecommerce: {
        transaction_id: cart.id?.split('key=')[1] || null,
        value: Number(cart.cost?.totalAmount?.amount) || null,
        currency: cart.cost?.totalAmount?.currencyCode || 'USD',
        items: [] as Array<{
          item_id: string;
          item_name: string;
          index: number;
          price: string;
          quantity: number;
        }>,
      },
    };

    if (cart.lines?.nodes) {
      cart.lines.nodes.forEach((node: any, index: number) => {
        purchaseDataLayerObject.ecommerce.items.push({
          // UNI-1358
          item_id: node.merchandise.id,
          item_name: node.merchandise.product.title,
          index,
          price: node.merchandise.price.amount,
          quantity: node.quantity,
        });
      });
    }

    return purchaseDataLayerObject;
  };

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Shopping Cart
      </h1>

      <div className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
        <section aria-labelledby="cart-heading" className="lg:col-span-7">
          <h2 id="cart-heading" className="sr-only">
            Items in your shopping cart
          </h2>

          <ul className="divide-y divide-gray-200 border-b border-t border-gray-200">
            {cart?.lines.nodes.map((cartLine, productIdx) => (
              <li key={cartLine.id} className="flex py-6 sm:py-10">
                <div className="shrink-0">
                  <img
                    alt={cartLine.merchandise.image?.altText!}
                    src={cartLine.merchandise.image?.url}
                    className="size-24 rounded-md object-cover sm:size-48"
                  />
                </div>

                <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                  <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                    <div>
                      <div className="flex justify-between">
                        <h3 className="text-sm">
                          <NavLink
                            to={`/products/${cartLine.merchandise.product.handle}`}
                            className="font-medium text-gray-700 hover:text-gray-800"
                          >
                            {cartLine.merchandise.product.title}
                          </NavLink>
                        </h3>
                      </div>
                      <div className="mt-1 flex text-sm">
                        <p className="text-gray-500">
                          {
                            cartLine.merchandise.selectedOptions.find(
                              (opt) => opt.name === 'Color',
                            )?.value
                          }
                        </p>
                        <p className="ml-4 border-l border-gray-200 pl-4 text-gray-500">
                          {
                            cartLine.merchandise.selectedOptions.find(
                              (opt) => opt.name === 'Size',
                            )?.value
                          }
                        </p>
                      </div>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {cartLine.merchandise.price.amount}
                      </p>
                    </div>

                    <div className="mt-4 sm:mt-0 sm:pr-9">
                      <label
                        htmlFor={`quantity-${productIdx}`}
                        className="sr-only"
                      >
                        Quantity, {cartLine.quantity}
                      </label>
                      <CartLineQuantitySelector
                        lineId={cartLine.id}
                        quantity={cartLine.quantity}
                        productIdx={productIdx}
                      />

                      <div className="absolute right-0 top-0">
                        <CartLineRemoveButton
                          disabled={false}
                          lineIds={[cartLine.id]}
                          cartItem={{
                            ...mapShopifyMerchandiseToCoveoCartItem(
                              cartLine as CartLine,
                            ),
                            quantity: 0,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 flex space-x-2 text-sm text-gray-700">
                    <CheckIcon
                      aria-hidden="true"
                      className="size-5 shrink-0 text-green-500"
                    />

                    <span>In stock</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Order summary */}
        <section
          aria-labelledby="summary-heading"
          className="mt-16 rounded-lg bg-gray-50 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
        >
          <h2
            id="summary-heading"
            className="text-lg font-medium text-gray-900"
          >
            Order summary
          </h2>

          <dl className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-gray-600">Subtotal</dt>
              <dd className="text-sm font-medium text-gray-900">
                <Money
                  data={{
                    amount: cart?.cost?.subtotalAmount?.amount || '0',
                    currencyCode:
                      cart?.cost?.subtotalAmount?.currencyCode || 'CAD',
                  }}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <dt className="flex items-center text-sm text-gray-600">
                <span>Shipping estimate</span>
                <NavLink
                  to="#"
                  className="ml-2 shrink-0 text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">
                    Learn more about how shipping is calculated
                  </span>
                  <QuestionMarkCircleIcon
                    aria-hidden="true"
                    className="size-5"
                  />
                </NavLink>
              </dt>
              <dd className="text-sm font-medium text-gray-900">
                <Money
                  data={{
                    amount: '0',
                    currencyCode:
                      cart?.cost?.totalAmount?.currencyCode || 'CAD',
                  }}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <dt className="flex text-sm text-gray-600">
                <span>Tax estimate</span>
                <NavLink
                  to="#"
                  className="ml-2 shrink-0 text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">
                    Learn more about how tax is calculated
                  </span>
                  <QuestionMarkCircleIcon
                    aria-hidden="true"
                    className="size-5"
                  />
                </NavLink>
              </dt>
              <dd className="text-sm font-medium text-gray-900">
                <Money
                  data={{
                    amount: cart?.cost?.totalTaxAmount?.amount || '0',
                    currencyCode:
                      cart?.cost?.totalTaxAmount?.currencyCode || 'CAD',
                  }}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <dt className="text-base font-medium text-gray-900">
                Order total
              </dt>
              <dd className="text-base font-medium text-gray-900">
                <Money
                  data={{
                    amount: cart?.cost?.totalAmount?.amount || '0',
                    currencyCode:
                      cart?.cost?.totalAmount?.currencyCode || 'CAD',
                  }}
                />
              </dd>
            </div>
          </dl>

          <div className="mt-6">
            <NavLink
              onClick={(e) => {
                if (!hasCartItems || !cart) {
                  e.preventDefault();
                  return;
                }

                // Push to dataLayer for GTM
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ecommerce: null});
                const purchaseData = buildDataLayerForPurchase(cart);
                if (purchaseData) {
                  window.dataLayer.push(purchaseData);
                }

                // Track purchase in Coveo using relay.emit directly
                // This bypasses the cart controller state and uses Shopify cart data
                // using coveoCart.methods?.purchase() was only sending invalid data (no products - sync issue?)
                if (engine?.relay) {
                  const currency =
                    cart.cost?.totalAmount?.currencyCode || 'CAD';
                  const products = cart.lines.nodes.map((node) => ({
                    product: {
                      productId: node.merchandise.product.id,
                      name: node.merchandise.product.title,
                      price: Number(node.merchandise.price.amount),
                    },
                    quantity: node.quantity >= 1 ? node.quantity : 1,
                  }));
                  const revenue = Number(cart.cost?.totalAmount?.amount || 0);

                  engine.relay.emit('ec.purchase', {
                    currency,
                    products,
                    transaction: {
                      id: cart.id || `order-${Date.now()}`,
                      revenue,
                    },
                  });
                }
              }}
              to={cart?.checkoutUrl || ''}
              className={cx(
                'checkout block w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3',
                'text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none',
                'focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50',
                !hasCartItems
                  ? 'pointer-events-none opacity-10 checkout-disabled'
                  : '',
              )}
            >
              Checkout
            </NavLink>
          </div>
        </section>
      </div>
    </div>
  );
}
