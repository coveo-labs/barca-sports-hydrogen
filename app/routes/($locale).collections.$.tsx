import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, useParams, type MetaFunction} from '@remix-run/react';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';
import {engineDefinition, type ListingStaticState} from '~/lib/coveo.engine';
import {ListingProvider} from '~/components/Coveo/Context';
import {FullSearch} from '~/components/Coveo/FullSearch';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Coveo ProductListingPage Work in progress`}];
};

export async function loader(args: LoaderFunctionArgs) {
  const {params, context} = args;
  const {listingEngineDefinition} = engineDefinition;
  listingEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(args.request),
  );

  const cart = await context.cart.get();

  const staticState = await listingEngineDefinition.fetchStaticState({
    controllers: {
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
          url: `https://sports.barca.group/plp/${params['*']}`,
        },
      },
    },
  });

  return {staticState, cart};
}

export default function PLP() {
  const {staticState} = useLoaderData<typeof loader>();
  const headline = useParams()['*']!.toUpperCase();

  return (
    <ListingProvider
      navigatorContext={new ClientSideNavigatorContextProvider()}
      staticState={staticState as ListingStaticState}
    >
      <FullSearch headline={headline} />
    </ListingProvider>
  );
}
