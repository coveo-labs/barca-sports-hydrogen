import {type CommerceSearchParameters} from '@coveo/headless-react/ssr-commerce';
import type {AppLoadContext} from '@shopify/remix-oxygen';
import {getLocaleFromRequest} from './i18n';
import {updateTokenIfNeeded} from '~/lib/token-utils.server';
import {engineDefinition} from './coveo.engine';
import type {CartReturn} from '@shopify/hydrogen';
import {mapShopifyMerchandiseToCoveoCartItem} from './map.coveo.shopify';

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

  await updateTokenIfNeeded(k, request);

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

  await updateTokenIfNeeded('recommendationEngineDefinition', request);

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
