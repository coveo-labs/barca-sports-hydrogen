import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {useLoaderData, type MetaFunction} from '@remix-run/react';
import {
  fetchStaticState,
  searchEngineDefinition,
  type SearchStaticState,
} from '~/lib/coveo.engine';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';
import {SearchProvider} from '~/components/Search/Context';
import {FullSearch} from '~/components/Search/FullSearch';
import ParameterManager from '~/components/ParameterManager';
import {buildParameterSerializer} from '@coveo/headless-react/ssr-commerce';
import {useEffect, useState} from 'react';
import {fetchToken} from '~/lib/fetch-token';
import { isTokenExpired, extractAccessTokenFromCookie } from '~/lib/token-utils';

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

  if (isTokenExpired(searchEngineDefinition.getAccessToken())) {
    console.log('Token expired, fetching new token');
    const accessTokenCookie = extractAccessTokenFromCookie(request)
    const accessToken =  accessTokenCookie && !isTokenExpired(accessTokenCookie)
      ? accessTokenCookie
      : await fetchToken();

    searchEngineDefinition.setAccessToken(accessToken);
  }

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