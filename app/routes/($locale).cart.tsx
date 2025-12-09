import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import type {Cart} from '@shopify/hydrogen/storefront-api-types';
import {Suspense} from 'react';
import {
  Await,
  data,
  useLoaderData,
  useRouteLoaderData,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {CartEmpty} from '~/components/Cart/CartEmpty';
import {CartMain} from '~/components/Cart/CartMain';
import {CartRecommendations} from '~/components/Cart/CartRecommendations';
import {RecommendationProvider} from '~/components/Search/Context';
import {engineConfig, engineDefinition} from '~/lib/coveo.engine';
import {fetchRecommendationStaticState} from '~/lib/coveo.engine.server';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';
import type {RootLoader} from '~/root';

export const meta: MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

export interface CartReturn {
  cart: Cart;
}

// Helper function to ensure the Web Pixel receives what it needs to emit Coveo cart events in the checkout page.
async function setCoveoConfigAttributes(
  context: any,
  request: Request,
  cartResult: CartQueryDataReturn,
) {
  const {cart: cartHandler} = context;
  const cart = cartResult.cart;

  if (!cart) return cartResult;

  const attributes = cart.attributes ?? [];
  const attributesToUpdate = [];

  const navigatorProvider = new ServerSideNavigatorContextProvider(request);

  const {clientId} = navigatorProvider;
  const {
    configuration: {
      analytics: {trackingId},
      organizationId,
      accessToken,
    },
  } = engineConfig;

  const attributesToFind = [
    'coveoClientId',
    'coveoTrackingId',
    'coveoOrganizationId',
    'coveoAccessToken',
  ];

  const foundAttributes = (cart.attributes ?? []).reduce((acc, item) => {
  if (attributesToFind.includes(item.key)) {
    acc[item.key] = {key: item.key, value: item.value};
  }
    return acc;
  }, {} as Record<string, {key: string; value: string}>);

  if (!foundAttributes.coveoClientId) {
    attributesToUpdate.push({key: 'coveoClientId', value: clientId});
  }
  if (!foundAttributes.coveoTrackingId) {
    attributesToUpdate.push({key: 'coveoTrackingId', value: trackingId});
  }
  if (!foundAttributes.coveoOrganizationId) {
    attributesToUpdate.push({
      key: 'coveoOrganizationId',
      value: organizationId,
    });
  }
  if (!foundAttributes.coveoAccessToken) {
    attributesToUpdate.push({key: 'coveoAccessToken', value: accessToken});
  }

  let updatedResult = cartResult;
  if (attributesToUpdate.length > 0) {
    try {
      updatedResult = await cartHandler.updateAttributes(attributesToUpdate);
    } catch (error) {
      console.warn('Failed to set Coveo attributes:', error);
    }
  }

  return updatedResult;
}

export async function action({request, context}: ActionFunctionArgs) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  const status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];
      discountCodes.push(...inputs.discountCodes);
      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;
      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];
      giftCardCodes.push(...inputs.giftCardCodes);
      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();

  result = await setCoveoConfigAttributes(context, request, result);

  const {cart: cartResult, errors, warnings} = result;

  return data(
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

export async function loader({request, context}: LoaderFunctionArgs) {
  const {cart} = context;

  engineDefinition.recommendationEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );
  const recommendationStaticState = await fetchRecommendationStaticState({
    request,
    k: ['cartRecommendations'],
    context,
  });

  // Get current cart and ensure Coveo client ID is set
  const cartData = await cart.get();
  if (cartData) {
    await setCoveoConfigAttributes(context, request, {cart: cartData});
  }

  return {recommendationStaticState};
}

export default function Cart() {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const loaderData = useLoaderData<typeof loader>();

  if (!rootData) {
    return null;
  }

  return (
    <Suspense>
      <Await resolve={rootData.cart}>
        {(cart) => {
          if (cart?.lines.nodes.length === 0) {
            return <CartEmpty />;
          }
          return (
            <main className="cart-container mx-auto max-w-2xl px-4 pb-24 pt-16 sm:px-6 lg:max-w-7xl lg:px-8">
              <CartMain cart={cart} />
              <RecommendationProvider
                navigatorContext={new ClientSideNavigatorContextProvider()}
                staticState={loaderData.recommendationStaticState}
              >
                <CartRecommendations />
              </RecommendationProvider>
            </main>
          );
        }}
      </Await>
    </Suspense>
  );
}
