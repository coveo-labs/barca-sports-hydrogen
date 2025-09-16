import { NavLink } from '@remix-run/react';
import { Money, useOptimisticCart } from '@shopify/hydrogen';
import type { CartApiQueryFragment } from 'storefrontapi.generated';
import { CheckIcon, QuestionMarkCircleIcon } from '@heroicons/react/20/solid';
import { CartLineRemoveButton } from './CartLineItem';
import { useCart } from '~/lib/coveo.engine';
import cx from '~/lib/cx';
import type { CartLine } from '@shopify/hydrogen/storefront-api-types';
import { mapShopifyMerchandiseToCoveoCartItem } from '~/lib/map.coveo.shopify';
import '~/types/gtm';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
};

export function CartMain({ cart: originalCart }: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);
  const coveoCart = useCart();
  const hasCartItems = coveoCart.state.totalQuantity > 0;

  const buildDataLayerForPurchase = (cart: any) => {
    if (!cart) {
      console.error("Failed to fetch cart object. Aborting tracking!")
      return
    }
    const purchaseDataLayerObject = {
      event: "purchase",
      ecommerce: {},
    }

    // Assigning the transaction_id
    const transaction_id = cart.id.split("key=")[1] || null
    purchaseDataLayerObject.ecommerce.transaction_id = transaction_id

    //Assigning the total value
    const value = cart.cost.totalAmount.amount || null
    purchaseDataLayerObject.ecommerce.value = value

    //Assigning transaction currency
    const currency = cart.cost.totalAmount.currencyCode || null
    purchaseDataLayerObject.ecommerce.currency = currency

    // Constructing the items array

    const items = []

    if (cart.lines.nodes) {
      cart.lines.nodes.forEach((node, index) => {
        items.push({
          item_id: node.merchandise.product.handle,
          item_name: node.merchandise.product.title,
          index: index,
          price: node.merchandise.price.amount,
          quantity: node.quantity,
        })
      })
    }

    purchaseDataLayerObject.ecommerce.items = items;

    return purchaseDataLayerObject;
  }
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
                      <select
                        defaultValue={cartLine.quantity}
                        id={`quantity-${productIdx}`}
                        name={`quantity-${productIdx}`}
                        className="max-w-full rounded-md border border-gray-300 py-1.5 text-left text-base/5 font-medium text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                      >
                        {Array.from({ length: 10 }, (_, i) => i).map((i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>

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
              onClick={(e) =>
                hasCartItems && cart
                  ? (
                    window.dataLayer = window.dataLayer || [],
                    window.dataLayer.push({ ecommerce: null }),
                    window.dataLayer.push(buildDataLayerForPurchase(cart)),
                    coveoCart.methods?.purchase({
                      id: cart?.id || '',
                      revenue: Number(cart?.cost?.totalAmount?.amount)
                    }))
                  : e.preventDefault()
              }
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
