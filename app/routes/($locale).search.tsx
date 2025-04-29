import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';
import {
  searchEngineDefinition,
  type SearchStaticState,
} from '~/lib/coveo.engine';
import {fetchStaticState} from '~/lib/coveo.engine.server';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';
import {SearchProvider} from '~/components/Search/Context';
import {FullSearch} from '~/components/Search/FullSearch';
import ParameterManager from '~/components/ParameterManager';
import {buildParameterSerializer} from '@coveo/headless-react/ssr-commerce';
import {useEffect, useState} from 'react';

export const meta: MetaFunction = () => {
  return [{title: `Coveo | Search`}];
};

export type SearchLoader = typeof loader;

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const {deserialize} = buildParameterSerializer();
  const parameters = deserialize(url.searchParams);
  const q = url.searchParams.get('q') || '';

  searchEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );

  const staticState = await fetchStaticState({
    context,
    k: 'searchEngineDefinition',
    parameters,
    url: `https://shop.barca.group`,
    request,
  });

  return {staticState, q, url};
}

export default function SearchPage() {
  const {staticState, q, url} = useLoaderData<typeof loader>();
  const [currentUrl, setCurrentUrl] = useState(url);

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  return (
    <SearchProvider
      navigatorContext={new ClientSideNavigatorContextProvider()}
      staticState={staticState as SearchStaticState}
    >
      <ParameterManager url={currentUrl} />
      <FullSearch
        headline={`Browse ${q}`}
        tagline="Find Your Perfect Splash! Dive into our collection and search for the water sports gear that takes your adventure to the next level. Your journey starts with a click!"
      />
    </SearchProvider>
  );
}
