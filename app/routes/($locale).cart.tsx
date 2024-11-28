import {
  Await,
  useLoaderData,
  useRouteLoaderData,
  type MetaFunction,
} from '@remix-run/react';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {Cart} from '@shopify/hydrogen/storefront-api-types';
import {
  defer,
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from '@shopify/remix-oxygen';
import {Suspense} from 'react';
import {CartEmpty} from '~/components/Cart/CartEmpty';
import {CartMain} from '~/components/Cart/CartMain';
import {ListingProvider} from '~/components/Search/Context';
import {
  fetchStaticState,
  listingEngineDefinition,
  type ListingStaticState,
} from '~/lib/coveo.engine';
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

export async function action({request, context}: ActionFunctionArgs) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
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

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;

      // User inputted gift card code
      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];

      // Combine gift card codes already applied on cart
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
  context.session.set('cartId', cartId);
  const {cart: cartResult, errors, warnings} = result;

  return json(
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

export async function loader({context, request}: LoaderFunctionArgs) {
  listingEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );

  const staticState = fetchStaticState({
    context,
    k: 'listingEngineDefinition',
    query: '',
    url: 'https://sports.barca.group/plp/accessories',
    request,
  });

  return defer({staticState});
}

export default function Cart() {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const loaderData = useLoaderData<typeof loader>();

  if (!rootData) {
    return null;
  }

  const allData = Promise.all([rootData?.cart, loaderData?.staticState]);

  return (
    <Suspense>
      <Await resolve={allData}>
        {([cart, staticState]) => {
          if (cart?.lines.nodes.length === 0) {
            return <CartEmpty />;
          }
          return (
            <ListingProvider
              navigatorContext={new ClientSideNavigatorContextProvider()}
              staticState={staticState as ListingStaticState}
            >
              <CartMain cart={cart} />
            </ListingProvider>
          );
        }}
      </Await>
    </Suspense>
  );
}
