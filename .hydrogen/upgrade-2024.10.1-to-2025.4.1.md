# Hydrogen upgrade guide: 2024.10.1 to 2025.4.1

----

## Features

### Add support for `v3_routeConfig` future flag. [#2722](https://github.com/Shopify/hydrogen/pull/2722)

#### Step: 1. Update your `vite.config.ts`. [#2722](https://github.com/Shopify/hydrogen/pull/2722)

[docs](https://remix.run/docs/en/main/start/future-flags#v3_routeconfig)
[#2722](https://github.com/Shopify/hydrogen/pull/2722)
export default defineConfig({
 plugins: [
   hydrogen(),
   oxygen(),
   remix({
     presets: [hydrogen.v3preset()],  // Update this to hydrogen.v3preset()
     future: {
       v3_fetcherPersist: true,
       v3_relativeSplatPath: true,
       v3_throwAbortReason: true,
       v3_lazyRouteDiscovery: true,
       v3_singleFetch: true,
       v3_routeConfig: true, // add this flag
     },
   }),
   tsconfigPaths(),
 ],

#### Step: 2. Update your `package.json` and install the new packages. Make sure to match the Remix version along with other Remix npm packages and ensure the versions are 2.16.1 or above. [#2722](https://github.com/Shopify/hydrogen/pull/2722)

[docs](https://remix.run/docs/en/main/start/future-flags#v3_routeconfig)
[#2722](https://github.com/Shopify/hydrogen/pull/2722)
"devDependencies": {
  ...
  "@remix-run/fs-routes": "^2.16.1",
  "@remix-run/route-config": "^2.16.1",

#### Step: 3. Add a `routes.ts` file. This is your new Remix route configuration file. [#2722](https://github.com/Shopify/hydrogen/pull/2722)

[docs](https://remix.run/docs/en/main/start/future-flags#v3_routeconfig)
[#2722](https://github.com/Shopify/hydrogen/pull/2722)
import {flatRoutes} from '@remix-run/fs-routes';
import {type RouteConfig} from '@remix-run/route-config';
import {hydrogenRoutes} from '@shopify/hydrogen';

export default hydrogenRoutes([
  ...(await flatRoutes()),
  // Manual route definitions can be added to this array, in addition to or instead of using the `flatRoutes` file-based routing convention.
  // See https://remix.run/docs/en/main/guides/routing for more details
]) satisfies RouteConfig;

### Enable Remix `v3_singleFetch` future flag [#2708](https://github.com/Shopify/hydrogen/pull/2708)

#### Step: 1. In your `vite.config.ts`, add the single fetch future flag [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
+  declare module "@remix-run/server-runtime" {
+    interface Future {
+     v3_singleFetch: true;
+    }
+  }

  export default defineConfig({
    plugins: [
      hydrogen(),
      oxygen(),
      remix({
        presets: [hydrogen.preset()],
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_lazyRouteDiscovery: true,
+         v3_singleFetch: true,
        },
      }),
      tsconfigPaths(),
    ],
```

#### Step: 2. In your `entry.server.tsx`, add `nonce` to the `<RemixServer>` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
const body = await renderToReadableStream(
 <NonceProvider>
   <RemixServer
     context={remixContext}
     url={request.url}
+     nonce={nonce}
   />
 </NonceProvider>,
```

#### Step: 3. Update the shouldRevalidate function in root.tsx [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
-  defaultShouldRevalidate,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

-  return defaultShouldRevalidate;
+  return false;
};
```

#### Step: 4. Update `cart.tsx` to add a headers export and update to `data` import usage [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
    import {
  -  json,
  +  data,
      type LoaderFunctionArgs,
      type ActionFunctionArgs,
      type HeadersFunction
    } from '@shopify/remix-oxygen';
  + export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;

    export async function action({request, context}: ActionFunctionArgs) {
      ...
  -   return json(
  +   return data(
        {
          cart: cartResult,
          errors,
          warnings,
          analytics: {
            cartId,
          },
        },
        {status, headers},
      );
    }

    export async function loader({context}: LoaderFunctionArgs) {
      const {cart} = context;
 -    return json(await cart.get());
 +    return await cart.get();
    }
 ```

#### Step: 5. Deprecate `json` and `defer` import usage from `@shopify/remix-oxygen` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
- import {json} from "@shopify/remix-oxygen";

  export async function loader({}: LoaderFunctionArgs) {
    let tasks = await fetchTasks();
-   return json(tasks);
+   return tasks;
  }
```

```diff
- import {defer} from "@shopify/remix-oxygen";

  export async function loader({}: LoaderFunctionArgs) {
    let lazyStuff = fetchLazyStuff();
    let tasks = await fetchTasks();
-   return defer({ tasks, lazyStuff });
+   return { tasks, lazyStuff };
  }
```


#### Step: 6. If you were using the second parameter of json/defer to set a custom status or headers on your response, you can continue doing so via the new data API: [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
-  import {json} from "@shopify/remix-oxygen";
+  import {data, type HeadersFunction} from "@shopify/remix-oxygen";

+  /**
+   * If your loader or action is returning a response with headers,
+   * make sure to export a headers function that merges your headers
+   * on your route. Otherwise, your headers may be lost.
+   * Remix doc: https://remix.run/docs/en/main/route/headers
+   **/
+  export const headers: HeadersFunction = ({loaderHeaders}) => loaderHeaders;

  export async function loader({}: LoaderFunctionArgs) {
    let tasks = await fetchTasks();
-    return json(tasks, {
+    return data(tasks, {
      headers: {
        "Cache-Control": "public, max-age=604800"
      }
    });
  }
```


#### Step: 7. If you are using legacy customer account flow or multipass, there are a couple more files that requires updating: [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
+ export const headers: HeadersFunction = ({loaderHeaders}) => loaderHeaders;
```


#### Step: 8. In `routes/account_.register.tsx`, add a `headers` export for `actionHeaders` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
+ export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;
```


#### Step: 9. If you are using multipass, in `routes/account_.login.multipass.tsx` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
+ export const headers: HeadersFunction = ({actionHeaders}) => actionHeaders;
```


#### Step: 10. Update all `json` response wrapper to `remixData` [#2708](https://github.com/Shopify/hydrogen/pull/2708)

[docs](https://remix.run/docs/en/main/guides/single-fetch)
[#2708](https://github.com/Shopify/hydrogen/pull/2708)
```diff
import {
- json,
+ data as remixData,
} from '@shopify/remix-oxygen';

-  return json(
+  return remixData(
    ...
  );
```

### B2B methods and props are now stable [#2736](https://github.com/Shopify/hydrogen/pull/2736)

#### Step: 1. Search for anywhere using `UNSTABLE_getBuyer` and `UNSTABLE_setBuyer` is update accordingly [#2736](https://github.com/Shopify/hydrogen/pull/2736)

[#2736](https://github.com/Shopify/hydrogen/pull/2736)
```diff
- customerAccount.UNSTABLE_getBuyer();
+ customerAccount.getBuyer()

- customerAccount.UNSTABLE_setBuyer({
+ customerAccount.setBuyer({
    companyLocationId,
  });
```

#### Step: 2. Update `createHydrogenContext` to remove the `unstableB2b` option [#2736](https://github.com/Shopify/hydrogen/pull/2736)

[#2736](https://github.com/Shopify/hydrogen/pull/2736)
```diff
  const hydrogenContext = createHydrogenContext({
    env,
    request,
    cache,
    waitUntil,
    session,
    i18n: {language: 'EN', country: 'US'},
-    customerAccount: {
-      unstableB2b: true,
-    },
    cart: {
      queryFragment: CART_QUERY_FRAGMENT,
    },
  });
```

### Add `language` support to `createCustomerAccountClient` and `createHydrogenContext` [#2746](https://github.com/Shopify/hydrogen/pull/2746)

#### Step: 1. If present, the provided `language` will be used to set the `uilocales` property in the Customer Account API request. This will allow the API to return localized data for the provided language. [#2746](https://github.com/Shopify/hydrogen/pull/2746)

[#2746](https://github.com/Shopify/hydrogen/pull/2746)
```ts
// Optional: provide language data to the constructor
const customerAccount = createCustomerAccountClient({
  // ...
  language,
});
```

#### Step: 2. Calls to `login()` will use the provided `language` without having to pass it explicitly via `uiLocales`; however, if the `login()` method is already using its `uilocales` property, the `language` parameter coming from the context/constructor will be ignored. If nothing is explicitly passed, `login()` will default to `context.i18n.language`. [#2746](https://github.com/Shopify/hydrogen/pull/2746)

[#2746](https://github.com/Shopify/hydrogen/pull/2746)
```ts
export async function loader({request, context}: LoaderFunctionArgs) {
  return context.customerAccount.login({
    uiLocales: 'FR', // will be used instead of the one coming from the context
  });
}
```

### Turn on Remix future flag v3_lazyRouteDiscovery [#2702](https://github.com/Shopify/hydrogen/pull/2702)

#### Add the following line to your vite.config.ts and test your app.
[#2702](https://github.com/Shopify/hydrogen/pull/2702)
```diff
export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    remix({
      presets: [hydrogen.preset()],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
+        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
```

----

----

## Fixes

### Fix the customer account implementation to clear all session data on logout [#2843](https://github.com/Shopify/hydrogen/pull/2843)

#### You can opt out and keep custom data in the session by passing the `keepSession` option to logout
[#2843](https://github.com/Shopify/hydrogen/pull/2843)
```js
export async function action({context}: ActionFunctionArgs) {
  return context.customerAccount.logout({
    keepSession: true
  });
}
```

### Deprecate `<VariantSelector /> [#2837](https://github.com/Shopify/hydrogen/pull/2837)

#### Step: 1. Update the SFAPI product query to request the new required fields encodedVariantExistence and encodedVariantAvailability. This will allow the product form to determine which variants are available for selection. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
+    encodedVariantExistence
+    encodedVariantAvailability
    options {
      name
      optionValues {
        name
+        firstSelectableVariant {
+          ...ProductVariant
+        }
+        swatch {
+          color
+          image {
+            previewImage {
+              url
+            }
+          }
+        }
      }
    }
-    selectedVariant: selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
+    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
+      ...ProductVariant
+    }
+    adjacentVariants (selectedOptions: $selectedOptions) {
+      ...ProductVariant
+    }
-    variants(first: 1) {
-      nodes {
-        ...ProductVariant
-      }
-    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;
```

#### Step: 2. Remove the `VARIANTS_QUERY` and related logic from `loadDeferredData`, as querying all variants is no longer necessary. Simplifies the function to return an empty object. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
function loadDeferredData({context, params}: LoaderFunctionArgs) {
+  // Put any API calls that is not critical to be available on first page render
+  // For example: product reviews, product recommendations, social feeds.
-  // In order to show which variants are available in the UI, we need to query
-  // all of them. But there might be a *lot*, so instead separate the variants
-  // into it's own separate query that is deferred. So there's a brief moment
-  // where variant options might show as available when they're not, but after
-  // this deferred query resolves, the UI will update.
-  const variants = context.storefront
-    .query(VARIANTS_QUERY, {
-      variables: {handle: params.handle!},
-    })
-    .catch((error) => {
-      // Log query errors, but don't throw them so the page can still render
-      console.error(error);
-      return null;
-    });

+  return {}
-  return {
-    variants,
-  };
}
```

#### Step: 3. Update the `Product` component to use `getAdjacentAndFirstAvailableVariants` for determining the selected variant, improving handling of adjacent and available variants. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
+  getAdjacentAndFirstAvailableVariants,
} from '@shopify/hydrogen';

export default function Product() {
+  const {product} = useLoaderData<typeof loader>();
-  const {product, variants} = useLoaderData<typeof loader>();

+  // Optimistically selects a variant with given available variant information
+  const selectedVariant = useOptimisticVariant(
+    product.selectedOrFirstAvailableVariant,
+    getAdjacentAndFirstAvailableVariants(product),
+  );
-  const selectedVariant = useOptimisticVariant(
-    product.selectedVariant,
-    variants,
-  );
```

#### Step: 4. Automatically update the URL with search parameters based on the selected product variant's options when no search parameters are present, ensuring the URL reflects the current selection without triggering navigation. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getAdjacentAndFirstAvailableVariants,
+  mapSelectedProductOptionToObject,
} from '@shopify/hydrogen';

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

+  // Sets the search param to the selected variant without navigation
+  // only when no search params are set in the url
+  useEffect(() => {
+    const searchParams = new URLSearchParams(
+      mapSelectedProductOptionToObject(
+        selectedVariant.selectedOptions || [],
+      ),
+    );

+    if (window.location.search === '' && searchParams.toString() !== '') {
+      window.history.replaceState(
+        {},
+        '',
+        `${location.pathname}?${searchParams.toString()}`,
+      );
+    }
+  }, [
+    JSON.stringify(selectedVariant.selectedOptions),
+  ]);
```

#### Step: 5. Retrieve the product options array using `getProductOptions`, enabling efficient handling of product variants and their associated options. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
+  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  mapSelectedProductOptionToObject,
} from '@shopify/hydrogen';

export default function Product() {
  const {product} = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useEffect(() => {
    // ...
  }, [
    JSON.stringify(selectedVariant.selectedOptions),
  ]);

+  // Get the product options array
+  const productOptions = getProductOptions({
+    ...product,
+    selectedOrFirstAvailableVariant: selectedVariant,
+  });
```

#### Step: 6. Remove `Await` and `Suspense` from `ProductForm` as there are no longer any asynchronous queries to wait for, simplifying the component structure. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
export default function Product() {
  ...
  return (
    ...
+        <ProductForm
+          productOptions={productOptions}
+          selectedVariant={selectedVariant}
+        />
-        <Suspense
-          fallback={
-            <ProductForm
-              product={product}
-              selectedVariant={selectedVariant}
-              variants={[]}
-            />
-          }
-        >
-          <Await
-            errorElement="There was a problem loading product variants"
-            resolve={variants}
-          >
-            {(data) => (
-              <ProductForm
-                product={product}
-                selectedVariant={selectedVariant}
-                variants={data?.product?.variants.nodes || []}
-              />
-            )}
-          </Await>
-        </Suspense>
```

#### Step: 7. Refactor `ProductForm` to handle combined listing products and variants efficiently. It uses links for different product URLs and buttons for variant updates, improving SEO and user experience. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```tsx
import {Link, useNavigate} from '@remix-run/react';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';

export function ProductForm({
  productOptions,
  selectedVariant,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  return (
    <div className="product-form">
      {productOptions.map((option) => (
        <div className="product-options" key={option.name}>
          <h5>{option.name}</h5>
          <div className="product-options-grid">
            {option.optionValues.map((value) => {
              const {
                name,
                handle,
                variantUriQuery,
                selected,
                available,
                exists,
                isDifferentProduct,
                swatch,
              } = value;

              if (isDifferentProduct) {
                // SEO
                // When the variant is a combined listing child product
                // that leads to a different URL, we need to render it
                // as an anchor tag
                return (
                  <Link
                    className="product-options-item"
                    key={option.name + name}
                    prefetch="intent"
                    preventScrollReset
                    replace
                    to={`/products/${handle}?${variantUriQuery}`}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </Link>
                );
              } else {
                // SEO
                // When the variant is an update to the search param,
                // render it as a button with JavaScript navigating to
                // the variant so that SEO bots do not index these as
                // duplicated links
                return (
                  <button
                    type="button"
                    className={`product-options-item${
                      exists && !selected ? ' link' : ''
                    }`}
                    key={option.name + name}
                    style={{
                      border: selected
                        ? '1px solid black'
                        : '1px solid transparent',
                      opacity: available ? 1 : 0.3,
                    }}
                    disabled={!exists}
                    onClick={() => {
                      if (!selected) {
                        navigate(`?${variantUriQuery}`, {
                          replace: true,
                        });
                      }
                    }}
                  >
                    <ProductOptionSwatch swatch={swatch} name={name} />
                  </button>
                );
              }
            })}
          </div>
          <br />
        </div>
      ))}
      <AddToCartButton
        disabled={!selectedVariant || !selectedVariant.availableForSale}
        onClick={() => {
          open('cart');
        }}
        lines={
          selectedVariant
            ? [
                {
                  merchandiseId: selectedVariant.id,
                  quantity: 1,
                  selectedVariant,
                },
              ]
            : []
        }
      >
        {selectedVariant?.availableForSale ? 'Add to cart' : 'Sold out'}
      </AddToCartButton>
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="product-option-label-swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
```

#### Step: 8. Make `useVariantUrl` and `getVariantUrl` functions more flexible by allowing `selectedOptions` to be optional. This ensures compatibility with cases where no options are provided. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
export function useVariantUrl(
  handle: string,
-  selectedOptions: SelectedOption[],
+  selectedOptions?: SelectedOption[],
) {
  const {pathname} = useLocation();

  return useMemo(() => {
    return getVariantUrl({
      handle,
      pathname,
      searchParams: new URLSearchParams(),
      selectedOptions,
    });
  }, [handle, selectedOptions, pathname]);
}
export function getVariantUrl({
  handle,
  pathname,
  searchParams,
  selectedOptions,
}: {
  handle: string;
  pathname: string;
  searchParams: URLSearchParams;
-  selectedOptions: SelectedOption[];
+  selectedOptions?: SelectedOption[],
}) {
  const match = /(\/[a-zA-Z]{2}-[a-zA-Z]{2}\/)/g.exec(pathname);
  const isLocalePathname = match && match.length > 0;
  const path = isLocalePathname
    ? `${match![0]}products/${handle}`
    : `/products/${handle}`;

-  selectedOptions.forEach((option) => {
+  selectedOptions?.forEach((option) => {
    searchParams.set(option.name, option.value);
  });
```

#### Step: 9. Remove unnecessary variant queries and references in `routes/collections.$handle.tsx`, simplifying the code by relying on the product route to fetch the first available variant. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
-    variants(first: 1) {
-      nodes {
-        selectedOptions {
-          name
-          value
-        }
-      }
-    }
  }
` as const;
```

and remove the variant reference

```diff
function ProductItem({
  product,
  loading,
}: {
  product: ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
-  const variant = product.variants.nodes[0];
-  const variantUrl = useVariantUrl(product.handle, variant.selectedOptions);
+  const variantUrl = useVariantUrl(product.handle);
  return (
```

#### Step: 10. Simplify the `ProductItem` component by removing variant-specific queries and logic. The `useVariantUrl` function now generates URLs without relying on variant options, reducing complexity. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
-    variants(first: 1) {
-      nodes {
-        selectedOptions {
-          name
-          value
-        }
-      }
-    }
  }
` as const;
```

and remove the variant reference

```diff
function ProductItem({
  product,
  loading,
}: {
  product: ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
-  const variant = product.variants.nodes[0];
-  const variantUrl = useVariantUrl(product.handle, variant.selectedOptions);
+  const variantUrl = useVariantUrl(product.handle);
  return (
```

#### Step: 11. Replace `variants(first: 1)` with `selectedOrFirstAvailableVariant` in GraphQL fragments to directly fetch the most relevant variant, improving query efficiency and clarity. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    trackingParameters
    vendor
-    variants(first: 1) {
-      nodes {
+    selectedOrFirstAvailableVariant(
+      selectedOptions: []
+      ignoreUnknownOptions: true
+      caseInsensitiveMatch: true
+    ) {
        id
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
     }
-    }
  }
` as const;
```

```diff
const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
-    variants(first: 1) {
-      nodes {
+    selectedOrFirstAvailableVariant(
+      selectedOptions: []
+      ignoreUnknownOptions: true
+      caseInsensitiveMatch: true
+    ) {
        id
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
     }
-    }
  }
```

#### Step: 12. Refactor `SearchResultsProducts` to use `selectedOrFirstAvailableVariant` for fetching product price and image, simplifying the logic and improving performance. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
function SearchResultsProducts({
  term,
  products,
}: PartialSearchResult<'products'>) {
  if (!products?.nodes.length) {
    return null;
  }

  return (
    <div className="search-result">
      <h2>Products</h2>
      <Pagination connection={products}>
        {({nodes, isLoading, NextLink, PreviousLink}) => {
          const ItemsMarkup = nodes.map((product) => {
            const productUrl = urlWithTrackingParams({
              baseUrl: `/products/${product.handle}`,
              trackingParams: product.trackingParameters,
              term,
            });

+            const price = product?.selectedOrFirstAvailableVariant?.price;
+            const image = product?.selectedOrFirstAvailableVariant?.image;

            return (
              <div className="search-results-item" key={product.id}>
                <Link prefetch="intent" to={productUrl}>
-                  {product.variants.nodes[0].image && (
+                  {image && (
                    <Image
-                      data={product.variants.nodes[0].image}
+                      data={image}
                      alt={product.title}
                      width={50}
                    />
                  )}
                  <div>
                    <p>{product.title}</p>
                    <small>
-                      <Money data={product.variants.nodes[0].price} />
+                      {price &&
+                        <Money data={price} />
+                      }
                    </small>
                  </div>
                </Link>
              </div>
            );
          });
```

#### Step: 13. Update `SearchResultsPredictive` to use `selectedOrFirstAvailableVariant` for fetching product price and image, ensuring accurate and efficient data retrieval. [#2837](https://github.com/Shopify/hydrogen/pull/2837)

[#2837](https://github.com/Shopify/hydrogen/pull/2837)
```diff
function SearchResultsPredictiveProducts({
  term,
  products,
  closeSearch,
}: PartialPredictiveSearchResult<'products'>) {
  if (!products.length) return null;

  return (
    <div className="predictive-search-result" key="products">
      <h5>Products</h5>
      <ul>
        {products.map((product) => {
          const productUrl = urlWithTrackingParams({
            baseUrl: `/products/${product.handle}`,
            trackingParams: product.trackingParameters,
            term: term.current,
          });

+          const price = product?.selectedOrFirstAvailableVariant?.price;
-          const image = product?.variants?.nodes?.[0].image;
+          const image = product?.selectedOrFirstAvailableVariant?.image;
          return (
            <li className="predictive-search-result-item" key={product.id}>
              <Link to={productUrl} onClick={closeSearch}>
                {image && (
                  <Image
                    alt={image.altText ?? ''}
                    src={image.url}
                    width={50}
                    height={50}
                  />
                )}
                <div>
                  <p>{product.title}</p>
                  <small>
-                    {product?.variants?.nodes?.[0].price && (
+                    {price && (
-                      <Money data={product.variants.nodes[0].price} />
+                      <Money data={price} />
                    )}
                  </small>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

### Workaround for "Error: failed to execute 'insertBefore' on 'Node'" that sometimes happen during development. [#2710](https://github.com/Shopify/hydrogen/pull/2710)

#### Update your root.tsx so that your style link tags are actual html link tags
[#2710](https://github.com/Shopify/hydrogen/pull/2710)
```diff
// root.tsx

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
-    {rel: 'stylesheet', href: resetStyles},
-    {rel: 'stylesheet', href: appStyles},
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

...

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
+        <link rel="stylesheet" href={resetStyles}></link>
+        <link rel="stylesheet" href={appStyles}></link>

```
