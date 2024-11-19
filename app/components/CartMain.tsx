import {NavLink} from '@remix-run/react';
import {Money, useOptimisticCart} from '@shopify/hydrogen';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {RecommendationsState} from '@coveo/headless-react/ssr-commerce';
import {CheckIcon, QuestionMarkCircleIcon} from '@heroicons/react/20/solid';
import {CartLineRemoveButton} from './CartLineItem';
import {ProductCard} from './Coveo/ProductCard';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  recommendations: RecommendationsState;
};

/**
 * The main cart component that displays the cart items and summary.
 * It is used by both the /cart route and the cart aside dialog.
 */
export function CartMain({cart: originalCart, recommendations}: CartMainProps) {
  // The useOptimisticCart hook applies pending actions to the cart
  // so the user immediately sees feedback when they modify the cart.
  const cart = useOptimisticCart(originalCart);
  return (
    <main className="mx-auto max-w-2xl px-4 pb-24 pt-16 sm:px-6 lg:max-w-7xl lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
        Shopping Cart
      </h1>

      <div className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
        <section aria-labelledby="cart-heading" className="lg:col-span-7">
          <h2 id="cart-heading" className="sr-only">
            Items in your shopping cart
          </h2>

          <ul className="divide-y divide-gray-200 border-b border-t border-gray-200">
            {cart.lines.nodes.map((cartLine, productIdx) => (
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
                            to={`/product/${cartLine.merchandise.id}`}
                            className="font-medium text-gray-700 hover:text-gray-800"
                          >
                            {cartLine.merchandise.title}
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
                        {Array.from({length: 10}, (_, i) => i).map((i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>

                      <div className="absolute right-0 top-0">
                        <CartLineRemoveButton
                          disabled={!!cartLine.isOptimistic}
                          lineIds={[cartLine.id]}
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
                    amount: cart.cost?.subtotalAmount?.amount || '0',
                    currencyCode:
                      cart.cost?.subtotalAmount?.currencyCode || 'CAD',
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
              <dd className="text-sm font-medium text-gray-900">$5.00</dd>
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
                    amount: cart.cost?.totalTaxAmount?.amount || '0',
                    currencyCode:
                      cart.cost?.totalTaxAmount?.currencyCode || 'CAD',
                  }}
                />
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <dt className="text-base font-medium text-gray-900">
                Order total
              </dt>
              <dd className="text-base font-medium text-gray-900">$112.32</dd>
            </div>
          </dl>

          <div className="mt-6">
            <button
              type="submit"
              className="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50"
            >
              Checkout
            </button>
          </div>
        </section>
      </div>

      {/* Related products */}
      <section aria-labelledby="related-heading" className="mt-24">
        <h2 id="related-heading" className="text-lg font-medium text-gray-900">
          {recommendations.headline}
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
          {recommendations.products.map((relatedProduct) => (
            <ProductCard
              product={relatedProduct}
              key={relatedProduct.permanentid}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
