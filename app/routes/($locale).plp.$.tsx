import {
  useLoaderData,
  useParams,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';

import {buildParameterSerializer} from '@coveo/headless-react/ssr-commerce';
import {useEffect, useState} from 'react';
import ParameterManager from '~/components/ParameterManager';
import {ListingProvider} from '~/components/Search/Context';
import {FullSearch} from '~/components/Search/FullSearch';
import {engineDefinition} from '~/lib/coveo/engine';
import {fetchStaticState} from '~/lib/coveo/engine.server';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/coveo/navigator.provider';

export const meta: MetaFunction<typeof loader> = () => {
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

  const {staticState, accessToken} = await fetchStaticState({
    url: `https://shop.barca.group/plp/${params['*']}${url.search}`,
    context,
    parameters,
    k: 'listingEngineDefinition',
    request,
  });

  return {staticState, url, accessToken};
}

export default function PLP() {
  const {staticState, url, accessToken} = useLoaderData<typeof loader>();
  const [currentUrl, setCurrentUrl] = useState(url);

  useEffect(() => {
    setCurrentUrl(new URL(window.location.href));
  }, []);

  const headline = useParams()['*']!.toUpperCase().replaceAll('/', ' / ');
  const tagline = `Make Waves, Embrace Adventure! Gear up with the latest ${headline
    .split('/')
    .pop()
    ?.toLowerCase()} and turn every splash into an unforgettable thrill. Your next adventure starts here!`;

  return (
    <ListingProvider
      navigatorContext={new ClientSideNavigatorContextProvider()}
      staticState={staticState}
      accessToken={accessToken}
    >
      <ParameterManager url={currentUrl.toString()} />
      <FullSearch headline={headline} tagline={tagline} />
    </ListingProvider>
  );
}
