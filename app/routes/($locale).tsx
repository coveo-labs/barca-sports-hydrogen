import type {
  CountryCode,
  LanguageCode,
  CartBuyerIdentityInput,
  Cart,
} from '@shopify/hydrogen/storefront-api-types';
import {
  redirect,
  type AppLoadContext,
  type ActionFunction,
} from '@shopify/remix-oxygen';
import {SupportedMarkets} from '~/lib/i18n';

export const action: ActionFunction = async ({request, context}) => {
  const {session} = context;
  const formData = await request.formData();

  // Make sure the form request is valid
  const languageCode = formData.get('language') as LanguageCode;

  const countryCode = formData.get('country') as CountryCode;

  // Determine where to redirect to relative to where user navigated from
  // ie. hydrogen.shop/collections -> ca.hydrogen.shop/collections
  const path = formData.get('path');

  const cartId = await session.get('cartId');

  // Update cart buyer's country code if there is a cart id
  if (cartId) {
    await updateCartBuyerIdentity(context, {
      cartId,
      buyerIdentity: {
        countryCode,
      },
    });
  }

  const {host, protocol} = new URL(request.url);

  const redirectUrl = new URL(
    `${languageCode.toLocaleLowerCase()}-${countryCode.toLocaleLowerCase()}${path}`,
    `${protocol}//${host}`,
  ).toString();

  return redirect(redirectUrl, 302);
};

async function updateCartBuyerIdentity(
  {storefront}: AppLoadContext,
  {
    cartId,
    buyerIdentity,
  }: {
    cartId: string;
    buyerIdentity: CartBuyerIdentityInput;
  },
) {
  const data = await storefront.mutate<{
    cartBuyerIdentityUpdate: {cart: Cart};
  }>(UPDATE_CART_BUYER_COUNTRY, {
    variables: {
      cartId,
      buyerIdentity,
    },
  });

  return data.cartBuyerIdentityUpdate.cart;
}

const UPDATE_CART_BUYER_COUNTRY = `#graphql
  mutation CartBuyerIdentityUpdate(
    $cartId: ID!
    $buyerIdentity: CartBuyerIdentityInput!
    $country: CountryCode = ZZ
  ) @inContext(country: $country) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
      }
    }
  }
`;
