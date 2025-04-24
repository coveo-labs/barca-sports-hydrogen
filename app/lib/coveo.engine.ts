import {
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
import {fetchToken} from './fetch-token';

// Headless requires an `accessToken` to be set in the configuration.
// We can't simply call `fetchToken` in all cases, because when the file
// first loads, the /token route might not be ready. As a backup, we can
// pass an empty, invalid value. Later in this file, we use the `updateTokenIfNeeded`
// function to update invalid or outdated tokens before interacting with Coveo APIs.
const getSearchToken = async () => {
  return typeof window !== 'undefined'
    ? await fetchToken()
    : '';
};

const getPublicApiKey = () => {
  return 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a';
};

export const engineConfig: CommerceEngineDefinitionOptions = {
  configuration: {
    accessToken: getPublicApiKey(),
    organizationId: 'barcagroupproductionkwvdy6lp',
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
