import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, useParams, type MetaFunction} from '@remix-run/react';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';
import {engineDefinition, type ListingStaticState} from '~/lib/coveo.engine';
import {fetchStaticState} from '~/lib/coveo.engine.server';
import {ListingProvider} from '~/components/Search/Context';
import {FullSearch} from '~/components/Search/FullSearch';
import {buildParameterSerializer} from '@coveo/headless-react/ssr-commerce';
import {useEffect, useState} from 'react';
import ParameterManager from '~/components/ParameterManager';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Coveo ProductListingPage Work in progress`}];
};

export async function loader({context, params, request}: LoaderFunctionArgs) {
  const {listingEngineDefinition} = engineDefinition;
  const url = new URL(request.url);
  const {deserialize} = buildParameterSerializer();
  const parameters = deserialize(url.searchParams);
  listingEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );

  const staticState = await fetchStaticState({
    url: `https://shop.barca.group/plp/${params['*']}`,
    context,
    parameters,
    k: 'listingEngineDefinition',
    request,
  });

  return {staticState, url};
}

export default function PLP() {
  const {staticState, url} = useLoaderData<typeof loader>();
  const [currentUrl, setCurrentUrl] = useState(url);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

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
      <ParameterManager url={currentUrl} />
      <FullSearch headline={headline} tagline={tagline} />
    </ListingProvider>
  );
}
