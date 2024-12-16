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
} from '@coveo/headless-react/ssr-commerce';
import type {AppLoadContext} from '@shopify/remix-oxygen';
import {getLocaleFromRequest} from './i18n';
import type {CartReturn} from '@shopify/hydrogen';

export const engineDefinition = defineCommerceEngine({
  configuration: {
    accessToken: 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a',
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
      options: {slotId: 'af9208ab-3eee-400c-9078-790f4835f785'},
    }),
    cartRecommendations: defineRecommendations({
      options: {slotId: 'd214dc06-2d0e-468f-8df4-59518a788100'},
    }),
    pdpRecommendations: defineRecommendations({
      options: {slotId: '7b506e3f-c0c3-411d-b771-161ee3305798'},
    }),
    parameterManager: defineParameterManager(),
  },
});

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
  usePdpRecommendations,
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
  query,
  url,
  context,
  request,
}: {
  k:
    | 'listingEngineDefinition'
    | 'searchEngineDefinition'
    | 'standaloneEngineDefinition';
  query: string;
  url: string;
  context: AppLoadContext;
  request: Request;
}) {
  const {country, language, currency} = getLocaleFromRequest(request);

  const cart = await context.cart.get();

  return engineDefinition[k].fetchStaticState({
    controllers: {
      parameterManager: {initialState: {parameters: {q: query}}},
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
}: {
  context: AppLoadContext;
  request: Request;
  k: (
    | 'homepageRecommendations'
    | 'cartRecommendations'
    | 'pdpRecommendations'
  )[];
}) {
  const cart = await context.cart.get();
  const {country, language, currency} = getLocaleFromRequest(request);

  return engineDefinition.recommendationEngineDefinition.fetchStaticState({
    controllers: {
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
    items: cart?.lines.nodes.map((node: any) => {
      const {merchandise} = node;
      return {
        productId: merchandise.product.id,
        name: merchandise.product.title,
        price: Number(merchandise.price.amount),
        quantity: node.quantity,
      };
    }),
  };
}
