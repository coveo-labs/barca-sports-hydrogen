import {
  Await,
  useLoaderData,
  useRouteLoaderData,
  type MetaFunction,
} from '@remix-run/react';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {
  defer,
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from '@shopify/remix-oxygen';
import {Suspense, useEffect} from 'react';
import {CartMain} from '~/components/CartMain';
import {SearchProvider} from '~/components/Coveo/Context';
import {
  type SearchStaticState,
  standaloneEngineDefinition,
  useCartRecommendations,
} from '~/lib/coveo.engine';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';
import type {RootLoader} from '~/root';

export const meta: MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

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
  const {cart: cartResult, errors, warnings} = result;

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

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
  standaloneEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );

  const cart = await context.cart.get();

  const staticState = standaloneEngineDefinition.fetchStaticState({
    controllers: {
      searchParameter: {initialState: {parameters: {q: ''}}},
      cart: {
        initialState: {
          items: cart
            ? cart.lines.nodes.map((node) => {
                const {merchandise} = node;
                return {
                  productId: merchandise.product.id,
                  name: merchandise.product.title,
                  price: Number(merchandise.price.amount),
                  quantity: node.quantity,
                };
              })
            : [],
        },
      },
      context: {
        language: 'en',
        country: 'US',
        currency: 'USD',
        view: {
          url: `https://sports.barca.group`,
        },
      },
    },
  });

  return defer({staticState});
}

export default function Cart() {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const {staticState} = useLoaderData<typeof loader>();
  const cartRecommendations = useCartRecommendations();
  useEffect(() => {
    cartRecommendations.methods?.refresh();
  }, [cartRecommendations.methods]);

  if (!rootData) return null;

  const allData = Promise.all([rootData.cart, staticState]);

  return (
    <Suspense>
      <Await resolve={allData} errorElement={<div>An error occurred</div>}>
        {([cart, staticState]) => {
          console.log('cart', cart);
          return (
            <SearchProvider
              navigatorContext={new ClientSideNavigatorContextProvider()}
              q=""
              staticState={staticState as SearchStaticState}
            >
              <CartMain
                recommendations={cartRecommendations.state}
                cart={cart}
              />
            </SearchProvider>
          );
        }}
      </Await>
    </Suspense>
  );
}
