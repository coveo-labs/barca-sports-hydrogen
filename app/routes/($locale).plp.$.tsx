import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, useParams, type MetaFunction} from '@remix-run/react';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';
import {
  engineDefinition,
  fetchStaticState,
  type ListingStaticState,
} from '~/lib/coveo.engine';
import {ListingProvider} from '~/components/Search/Context';
import {FullSearch} from '~/components/Search/FullSearch';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Coveo ProductListingPage Work in progress`}];
};

export async function loader(args: LoaderFunctionArgs) {
  const {params, context} = args;
  const {listingEngineDefinition} = engineDefinition;
  listingEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(args.request),
  );

  const staticState = await fetchStaticState({
    url: `https://sports.barca.group/plp/${params['*']}`,
    context,
    query: '',
    k: 'listingEngineDefinition',
  });

  return {staticState};
}

export default function PLP() {
  const {staticState} = useLoaderData<typeof loader>();
  const headline = useParams()['*']!.toUpperCase().replaceAll('/', ' / ');
  const tagline = `Make Waves, Embrace Adventure! Gear up with the latest ${headline
    .split('/')
    .pop()
    ?.toLowerCase()} and turn every splash into an unforgettable thrill. Your next adventure starts here!`;

  return (
    <ListingProvider
      navigatorContext={new ClientSideNavigatorContextProvider()}
      staticState={staticState as ListingStaticState}
    >
      <FullSearch headline={headline} tagline={tagline} />
    </ListingProvider>
  );
}
