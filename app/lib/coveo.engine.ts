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
import {fetchToken} from './fetch-token';

// Headless requires an `accessToken` to be set in the configuration.
// We can't simply call `fetchToken` in all cases, because when the file
// first loads, the /token route might not be ready. As a backup, we can
// pass an empty, invalid value. Later in this file, we use the `updateTokenIfNeeded`
// function to update invalid or outdated tokens before interacting with Coveo APIs.
const getSearchToken = async () => {
  return typeof window !== 'undefined' ? await fetchToken() : '';
};

const getPublicApiKey = () => {
  return 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a';
};

export const engineConfig: CommerceEngineDefinitionOptions = {
  configuration: {
    accessToken: await getSearchToken() as string,
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
