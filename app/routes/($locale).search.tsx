import {defer, type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {Await, useLoaderData, type MetaFunction} from '@remix-run/react';
import {
  searchEngineDefinition,
  type SearchStaticState,
} from '~/lib/coveo.engine';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';
import {SearchProvider} from '~/components/Coveo/Context';
import {FullSearch} from '~/components/Coveo/FullSearch';
import {Suspense} from 'react';

export const meta: MetaFunction = () => {
  return [{title: `Coveo | Search`}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  searchEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );

  const cart = await context.cart.get();

  const staticState = searchEngineDefinition.fetchStaticState({
    controllers: {
      searchParameter: {initialState: {parameters: {q}}},
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

  return defer({staticState, q});
}

export default function SearchPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <Suspense>
      <Await resolve={data.staticState}>
        {(staticState) => (
          <SearchProvider
            navigatorContext={new ClientSideNavigatorContextProvider()}
            q={data.q}
            staticState={staticState as SearchStaticState}
          >
            <FullSearch headline={`Browse ${data.q}`} />
          </SearchProvider>
        )}
      </Await>
    </Suspense>
  );
  return null;
}
