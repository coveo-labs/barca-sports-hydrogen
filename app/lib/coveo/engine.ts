import {
  defineCommerceEngine,
  defineFacetGenerator,
  definePagination,
  defineProductList,
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
  type InferHydratedState,
  type InferStaticState,
  type CommerceEngineDefinitionOptions,
} from '@coveo/headless-react/ssr-commerce';
import {fetchToken} from '~/lib/auth/fetch-token';

/**
 * Placeholder token used for initial engine configuration.
 *
 * This placeholder is necessary because:
 * 1. Coveo's engine definition requires a non-empty accessToken at initialization
 * 2. Top-level await is not supported in the browser build target
 * 3. The real token is set via setAccessToken() before hydration on the client
 *
 * The actual token flow:
 * - Server: updateTokenIfNeeded() fetches a real search token, calls setAccessToken(),
 *   then fetchStaticState() makes API calls with the real token
 * - Client: The route loader passes accessToken to the Provider component, which calls
 *   setAccessToken() before hydration begins
 * - Subsequent client requests: renewAccessToken callback fetches new tokens as needed
 */
const PLACEHOLDER_TOKEN = '';

// Renew access token callback for automatic client-side token renewal.
// This is called by Coveo Headless when a token expires during client-side requests.
const renewAccessToken = async (): Promise<string> => {
  return await fetchToken();
};

export const engineConfig = {
  configuration: {
    accessToken: PLACEHOLDER_TOKEN,
    renewAccessToken,
    organizationId: 'barcagroupproductionkwvdy6lp',
    analytics: {
      enabled: true,
      trackingId: 'market_88728731922',
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
      options: {slotId: '046e2c92-63a5-47dd-8266-b8e5027ae031'},
    }),
    cartRecommendations: defineRecommendations({
      options: {slotId: 'b236b1e2-f9b1-4f5d-b384-c1872f6d0b37'},
    }),
    pdpRecommendationsLowerCarousel: defineRecommendations({
      options: {slotId: '43b896c6-57a6-4eb0-a511-69eb7b35f7e3'},
    }),
    pdpRecommendationsUpperCarousel: defineRecommendations({
      options: {slotId: '68f1384f-b27c-4355-ac9a-7b63ba084e71'},
    }),
    parameterManager: defineParameterManager(),
  },
} satisfies CommerceEngineDefinitionOptions;

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
