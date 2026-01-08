import {type CommerceSearchParameters} from '@coveo/headless-react/ssr-commerce';
import type {ContextOptions} from '@coveo/headless/ssr-commerce';
import type {AppLoadContext} from 'react-router';
import {getLocaleFromRequest} from '~/lib/i18n';
import {updateTokenIfNeeded} from '~/lib/auth/token-utils.server';
import {
  engineDefinition,
  type ListingStaticState,
  type SearchStaticState,
  type StandaloneStaticState,
} from '~/lib/coveo/engine';
import type {CartReturn} from '@shopify/hydrogen';
import {mapShopifyMerchandiseToCoveoCartItem} from './map.coveo.shopify';

// Extract currency type from Coveo's ContextOptions
type CoveoCurrency = ContextOptions['currency'];

type EngineKey =
  | 'listingEngineDefinition'
  | 'searchEngineDefinition'
  | 'standaloneEngineDefinition';

type StaticStateMap = {
  listingEngineDefinition: ListingStaticState;
  searchEngineDefinition: SearchStaticState;
  standaloneEngineDefinition: StandaloneStaticState;
};

export async function fetchStaticState<K extends EngineKey>({
  k,
  parameters,
  url,
  context,
  request,
}: {
  k: K;
  parameters: CommerceSearchParameters;
  url: string;
  context: AppLoadContext;
  request: Request;
}): Promise<{staticState: StaticStateMap[K]; accessToken: string}> {
  const {country, language, currency} = getLocaleFromRequest(request);

  const cart = await context.cart.get();

  await updateTokenIfNeeded(k, request);

  // Get the access token to pass to the client for hydration
  const accessToken = engineDefinition[k].getAccessToken();

  const staticState = await engineDefinition[k].fetchStaticState({
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
        currency: currency as CoveoCurrency,
        view: {
          url,
        },
      },
    },
  });

  return {staticState: staticState as StaticStateMap[K], accessToken};
}

/**
 * Fetches standalone static state for pages that need cart tracking
 * (like the cart page) without search/listing functionality.
 */
export async function fetchStandaloneStaticState({
  context,
  request,
}: {
  context: AppLoadContext;
  request: Request;
}) {
  const cart = await context.cart.get();
  const {country, language, currency} = getLocaleFromRequest(request);

  await updateTokenIfNeeded('standaloneEngineDefinition', request);

  const accessToken =
    engineDefinition.standaloneEngineDefinition.getAccessToken();

  // Map Shopify cart to Coveo cart format
  const coveoCartData = mapShopifyCartToCoveoCart(cart);

  const staticState =
    await engineDefinition.standaloneEngineDefinition.fetchStaticState({
      controllers: {
        cart: {
          initialState: coveoCartData,
        },
        context: {
          language: language.toLowerCase(),
          country,
          currency: currency as CoveoCurrency,
          view: {
            url: 'https://shop.barca.group',
          },
        },
      },
    });

  return {staticState, accessToken};
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

  await updateTokenIfNeeded('recommendationEngineDefinition', request);

  // Get the access token to pass to the client for hydration
  const accessToken =
    engineDefinition.recommendationEngineDefinition.getAccessToken();

  const staticState =
    await engineDefinition.recommendationEngineDefinition.fetchStaticState({
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
          currency: currency as CoveoCurrency,
          view: {
            url: 'https://shop.barca.group',
          },
        },
      },
    });

  return {staticState, accessToken};
}

function mapShopifyCartToCoveoCart(cart: CartReturn | null) {
  return {
    items: cart?.lines.nodes.map((node) => {
      return mapShopifyMerchandiseToCoveoCartItem(node);
    }),
  };
}
