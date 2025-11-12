import type {
  CountryCode,
  LanguageCode,
  CartBuyerIdentityInput,
  Cart,
} from '@shopify/hydrogen/storefront-api-types';
import {redirect, type ActionFunction, type AppLoadContext} from 'react-router';

export const action: ActionFunction = async ({request, context}) => {
  const {session} = context;
  const formData = await request.formData();
  const languageCode = formData.get('language') as LanguageCode;
  const countryCode = formData.get('country') as CountryCode;
  const path = formData.get('path');
  const cartId = await session.get('cartId');

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
