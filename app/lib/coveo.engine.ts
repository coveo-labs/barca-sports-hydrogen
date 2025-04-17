import {
  type CommerceSearchParameters,
  defineCommerceEngine,
  defineFacetGenerator,
  definePagination,
  defineProductList,
  type InferHydratedState,
  type InferStaticState,
  defineSummary,
  defineCart,
  defineSort,
  defineSearchBox,
  defineContext,
  defineStandaloneSearchBox,
  defineInstantProducts,
  defineProductView,
  defineDidYouMean,
  defineBreadcrumbManager,
  defineParameterManager,
  defineRecommendations,
  CommerceEngineDefinitionOptions,
} from '@coveo/headless-react/ssr-commerce';
import type {AppLoadContext} from '@shopify/remix-oxygen';
import {getLocaleFromRequest} from './i18n';
import type {CartReturn} from '@shopify/hydrogen';
import {mapShopifyMerchandiseToCoveoCartItem} from './map.coveo.shopify';
import {fetchToken} from './fetch-token';
import {updateTokenIfNeeded} from '~/lib/token-utils';

// Headless requires an `accessToken` to be set in the configuration.
// We can't simply call `fetchToken` in all cases, because when the file
// first loads, the /token route might not be ready. As a backup, we can
// pass an empty, invalid value. Later in this file, we use the `updateTokenIfNeeded`
// function to update invalid or outdated tokens before interacting with Coveo APIs.
const getAccessToken = async (usePublicApiKey: boolean) => {
  return usePublicApiKey || typeof window !== 'undefined'
    ? await fetchToken(null, usePublicApiKey)
    : '';
};

export const engineConfig: CommerceEngineDefinitionOptions = {
  configuration: {
    accessToken: await getAccessToken(false),
    organizationId: 'simonshopifytestj1yywg6i',
    analytics: {
      enabled: true,
      trackingId: 'shop_en_us',
    },
    context: {
      language: 'en',
      country: 'US',
      currency: 'USD',
      view: {
        url: 'https://shop.barca.group',
      },
    },
  },
  controllers: {
    summary: defineSummary(),
    productList: defineProductList(),
    cart: defineCart(),
    searchBox: defineSearchBox(),
    context: defineContext(),
    standaloneSearchBox: defineStandaloneSearchBox({
      options: {redirectionUrl: '/search', id: 'standalone-search-box'},
    }),
    instantProducts: defineInstantProducts({
      options: {searchBoxId: 'standalone-search-box'},
    }),
    pagination: definePagination(),
    sort: defineSort(),
    productView: defineProductView(),
    didYouMean: defineDidYouMean(),
    facetGenerator: defineFacetGenerator(),
    breadcrumbManager: defineBreadcrumbManager(),
    homepageRecommendations: defineRecommendations({
      options: {slotId: '9a75d3ba-c053-40bf-b881-6d2d3f8472db'},
    }),
    cartRecommendations: defineRecommendations({
      options: {slotId: '5a93e231-3b58-4dd2-a00b-667e4fd62c55'},
    }),
    pdpRecommendationsLowerCarousel: defineRecommendations({
      options: {slotId: 'a24b0e9c-a8d2-4d4f-be76-5962160504e2'},
    }),
    pdpRecommendationsUpperCarousel: defineRecommendations({
      options: {slotId: '05848244-5c01-4846-b280-ff63f5530733'},
    }),
    parameterManager: defineParameterManager(),
  },
};

export const engineDefinition = defineCommerceEngine(engineConfig);

export const {
  listingEngineDefinition,
  searchEngineDefinition,
  standaloneEngineDefinition,
  recommendationEngineDefinition,
  useEngine,
} = engineDefinition;

export const {
  useCart,
  useContext,
  useProductList,
  useDidYouMean,
  useInstantProducts,
  usePagination,
  useProductView,
  useSearchBox,
  useSort,
  useStandaloneSearchBox,
  useSummary,
  useFacetGenerator,
  useBreadcrumbManager,
  useHomepageRecommendations,
  useCartRecommendations,
  useParameterManager,
  usePdpRecommendationsLowerCarousel,
  usePdpRecommendationsUpperCarousel,
} = engineDefinition.controllers;

export type ListingStaticState = InferStaticState<
  typeof listingEngineDefinition
>;
export type ListingHydratedState = InferHydratedState<
  typeof listingEngineDefinition
>;

export type SearchStaticState = InferStaticState<typeof searchEngineDefinition>;
export type SearchHydratedState = InferHydratedState<
  typeof searchEngineDefinition
>;

export type StandaloneStaticState = InferStaticState<
  typeof standaloneEngineDefinition
>;
export type StandaloneHydratedState = InferHydratedState<
  typeof standaloneEngineDefinition
>;

export async function fetchStaticState({
  k,
  parameters,
  url,
  context,
  request,
}: {
  k:
    | 'listingEngineDefinition'
    | 'searchEngineDefinition'
    | 'standaloneEngineDefinition';
  parameters: CommerceSearchParameters;
  url: string;
  context: AppLoadContext;
  request: Request;
}) {
  const {country, language, currency} = getLocaleFromRequest(request);

  const cart = await context.cart.get();

  await updateTokenIfNeeded(k, request)

  return engineDefinition[k].fetchStaticState({
    controllers: {
      parameterManager: {
        initialState: {
          parameters,
        },
      },
      cart: {
        initialState: mapShopifyCartToCoveoCart(cart),
      },
      context: {
        language: language.toLowerCase(),
        country,
        currency: currency as any,
        view: {
          url,
        },
      },
    },
  });
}

export async function fetchRecommendationStaticState({
  k,
  context,
  request,
  productId,
}: {
  context: AppLoadContext;
  request: Request;
  k: (
    | 'homepageRecommendations'
    | 'cartRecommendations'
    | 'pdpRecommendationsLowerCarousel'
    | 'pdpRecommendationsUpperCarousel'
  )[];
  productId?: string;
}) {
  const cart = await context.cart.get();
  const {country, language, currency} = getLocaleFromRequest(request);

  await updateTokenIfNeeded('recommendationEngineDefinition', request)

  return engineDefinition.recommendationEngineDefinition.fetchStaticState({
    controllers: {
      homepageRecommendations: {
        enabled: k.includes('homepageRecommendations'),
        productId,
      },
      cartRecommendations: {
        enabled: k.includes('cartRecommendations'),
        productId,
      },
      pdpRecommendationsLowerCarousel: {
        enabled: k.includes('pdpRecommendationsLowerCarousel'),
        productId,
      },
      pdpRecommendationsUpperCarousel: {
        enabled: k.includes('pdpRecommendationsUpperCarousel'),
        productId,
      },
      cart: {
        initialState: mapShopifyCartToCoveoCart(cart),
      },
      context: {
        language: language.toLowerCase(),
        country,
        currency: currency as any,
        view: {
          url: 'https://shop.barca.group',
        },
      },
    },
  });
}

function mapShopifyCartToCoveoCart(cart: CartReturn | null) {
  return {
    items: cart?.lines.nodes.map((node) => {
      return mapShopifyMerchandiseToCoveoCartItem(node);
    }),
  };
}
