import type {
  ProductFragment,
  ProductVariantFragment,
} from 'storefrontapi.generated';
import {
  getSelectedProductOptions,
  useOptimisticVariant,
} from '@shopify/hydrogen';
import type {SelectedOption} from '@shopify/hydrogen/storefront-api-types';
import {getVariantUrl} from '~/lib/shopify/variants';
import {HeartIcon} from '@heroicons/react/24/outline';
import {AddToCartButton} from '~/components/AddToCartButton';
import {ImageGallery} from '~/components/Products/ImageGallery';
import {Colors} from '~/components/Products/Colors';
import {Sizes} from '~/components/Products/Sizes';
import {Description} from '~/components/Products/Description';
import {engineDefinition, useProductView} from '~/lib/coveo/engine';
import {fetchRecommendationStaticState} from '~/lib/coveo/engine.server';
import {useCallback, useEffect, useState} from 'react';
import {ProductRecommendations} from '~/components/Products/Recommendations';
import {RecommendationProvider} from '~/components/Search/Context';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/coveo/navigator.provider';
import {
  redirect,
  useLoaderData,
  useParams,
  useSearchParams,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Hydrogen | ${data?.product.title ?? ''}`}];
};

export type ProductHandleData = typeof loader;

export async function loader(args: LoaderFunctionArgs) {
  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);
  const {product} = criticalData;
  const url = new URL(args.request.url);

  // UNI-1358
  const productId = product.selectedVariant
    ? product.selectedVariant.id
    : product.id;

  engineDefinition.recommendationEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(args.request),
  );
  const {staticState: recommendationStaticState, accessToken} =
    await fetchRecommendationStaticState({
      request: args.request,
      k: ['pdpRecommendationsUpperCarousel', 'pdpRecommendationsLowerCarousel'],
      context: args.context,
      productId,
    });

  return {...criticalData, recommendationStaticState, accessToken};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({
  context,
  params,
  request,
}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const selectedOptions = getSelectedProductOptions(request);
  const [{product}] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {
        handle,
        selectedOptions,
      },
    }),
    // Add other queries here, so that they are loaded in parallel
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  const productWithAllVariants: {product: ProductFragment} =
    await context.storefront
      .query(VARIANTS_QUERY, {
        variables: {handle: params.handle!},
      })
      .catch((error: any) => {
        // Log query errors, but don't throw them so the page can still render
        console.error(error);
        return null;
      });

  const variants = productWithAllVariants?.product.variants.nodes || [];

  if (selectedOptions.length < 1) {
    // If selected options don't match any variant, redirect to first available variant
    throw redirectToAvailableFirstVariant({product, variants, request});
  }

  const firstVariant =
    variants.find((n: ProductVariantFragment) => n.availableForSale) ||
    variants[0];
  product.selectedVariant = firstVariant;

  return {
    product,
    variants,
  } as {product: ProductFragment; variants: ProductVariantFragment[]};
}

function redirectToAvailableFirstVariant({
  product,
  variants,
  request,
}: {
  product: ProductFragment;
  variants: ProductVariantFragment[];
  request: Request;
}) {
  const url = new URL(request.url);
  const firstVariant =
    variants.find((n: ProductVariantFragment) => n.availableForSale) ||
    variants[0];

  return redirect(
    getVariantUrl({
      pathname: url.pathname,
      handle: product.handle,
      selectedOptions: firstVariant.selectedOptions,
      searchParams: new URLSearchParams(url.search),
    }),
    {
      status: 302,
    },
  );
}

function getProductColors(product: ProductFragment) {
  return (
    product.options.find((option) => option.name === 'Color')?.optionValues ||
    []
  );
}

function getColorOptionIdx(product: ProductFragment, color: string) {
  return (
    getProductColors(product).findIndex((option) => option.name === color) || 0
  );
}

export default function Product() {
  const {product, variants, recommendationStaticState, accessToken} =
    useLoaderData<typeof loader>();
  const productView = useProductView();
  const selectedVariant = useOptimisticVariant(
    product.selectedVariant,
    variants,
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const {handle} = useParams();
  const currentColor = searchParams.get('Color') || 'Black';
  const currentSize = searchParams.get('Size') || 'S';
  const [defaultImageIdx, setDefaultImageIdx] = useState(
    getColorOptionIdx(product, currentColor),
  );
  const [availableSizes, setAvailableSizes] = useState<{
    [key: string]: boolean;
  }>({});

  // Find the variant that matches the current color and selected size
  const variantForCart =
    variants.find((variant: ProductVariantFragment) => {
      const variantColor = variant.selectedOptions.find(
        (opt: SelectedOption) => opt.name === 'Color',
      )?.value;
      const variantSize = variant.selectedOptions.find(
        (opt: SelectedOption) => opt.name === 'Size',
      )?.value;
      return variantColor === currentColor && variantSize === currentSize;
    }) || selectedVariant;

  useEffect(() => {
    setDefaultImageIdx(getColorOptionIdx(product, currentColor));
  }, [product, currentColor]);

  useEffect(() => {
    // Update available sizes based on the selected color
    const sizesForColor: {[key: string]: boolean} = {};
    variants.forEach((variant: ProductVariantFragment) => {
      const variantColor = variant.selectedOptions.find(
        (opt: SelectedOption) => opt.name === 'Color',
      )?.value;
      const variantSize = variant.selectedOptions.find(
        (opt: SelectedOption) => opt.name === 'Size',
      )?.value;
      if (variantColor === currentColor) {
        sizesForColor[variantSize!] = variant.availableForSale;
      }
    });
    setAvailableSizes(sizesForColor);
  }, [variants, currentColor]);

  // UNI-1358
  const productId = product.selectedVariant
    ? product.selectedVariant.id
    : product.id;

  const logProductView = useCallback(() => {
    productView.methods?.view({
      name: product.title,
      productId,
      price: Number(selectedVariant.price.amount),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.title, selectedVariant.price.amount, handle, currentColor]);

  useEffect(() => {
    logProductView();
  }, [logProductView]);

  const setColorParam = (color: string) => {
    setSearchParams((prev) => {
      prev.set('Color', color);
      return prev;
    });
  };

  const setSizeParam = (size: string) => {
    setSearchParams((prev) => {
      prev.set('Size', size);
      return prev;
    });
  };

  return (
    <main className="pdp-container mx-auto max-w-7xl sm:px-6 sm:pt-16 lg:px-8">
      <div className="mx-auto max-w-2xl lg:max-w-none">
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
          <ImageGallery
            product={product}
            defaultImgIdx={defaultImageIdx}
            onImgSelect={(idx) => {
              setDefaultImageIdx(idx);
              setColorParam(
                product.options.find((opt) => opt.name === 'Color')
                  ?.optionValues[idx].name || '',
              );
            }}
          />

          <div className="mt-10 px-4 sm:mt-16 sm:px-0 lg:mt-0">
            <Description product={product} />

            <div className="mt-6">
              <Colors
                currentColor={currentColor}
                availableColors={
                  product.options
                    .find((opt) => opt.name === 'Color')
                    ?.optionValues.map(({name: color}) => color) || []
                }
                onSelect={(color) => {
                  setColorParam(color);
                }}
              />

              <Sizes
                product={product}
                selectedSize={currentSize}
                onSelect={setSizeParam}
                availableSizes={availableSizes}
              />

              <div className="mt-10 flex">
                <AddToCartButton
                  disabled={!variantForCart}
                  product={product}
                  redirectTo={`/products/${useParams().handle}`}
                  lines={
                    variantForCart
                      ? [
                          {
                            merchandiseId: variantForCart.id,
                            quantity: 1,
                            selectedVariant: variantForCart,
                          },
                        ]
                      : []
                  }
                >
                  Add to cart
                </AddToCartButton>
                <button
                  type="button"
                  className="ml-4 flex items-center justify-center rounded-md px-3 py-3 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                >
                  <HeartIcon aria-hidden="true" className="size-6 shrink-0" />
                  <span className="sr-only">Add to favorites</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <RecommendationProvider
        navigatorContext={new ClientSideNavigatorContextProvider()}
        staticState={recommendationStaticState}
        accessToken={accessToken}
      >
        <ProductRecommendations />
      </RecommendationProvider>
    </main>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    options {
      name
      optionValues {
        name
      }
    }
    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    variants(first: 1) {
      nodes {
        ...ProductVariant
      }
    }
    images(first: 10) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    metafields(identifiers: {key: "Occasion Style"}) {
      key
      value
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const PRODUCT_VARIANTS_FRAGMENT = `#graphql
  fragment ProductVariants on Product {
    variants(first: 250) {
      nodes {
        ...ProductVariant
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const VARIANTS_QUERY = `#graphql
  ${PRODUCT_VARIANTS_FRAGMENT}
  query ProductVariants(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ProductVariants
    }
  }
` as const;
