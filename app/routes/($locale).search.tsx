import {searchEngineDefinition} from '~/lib/coveo/engine';
import {fetchStaticState} from '~/lib/coveo/engine.server';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/coveo/navigator.provider';
import {SearchProvider} from '~/components/Search/Context';
import {FullSearch} from '~/components/Search/FullSearch';
import ParameterManager from '~/components/ParameterManager';
import {buildParameterSerializer} from '@coveo/headless-react/ssr-commerce';
import {useEffect, useState} from 'react';
import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';

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

  const {staticState, accessToken} = await fetchStaticState({
    context,
    k: 'searchEngineDefinition',
    parameters,
    url: `https://shop.barca.group`,
    request,
  });

  return {staticState, q, url, accessToken};
}

export default function SearchPage() {
  const {staticState, q, url, accessToken} = useLoaderData<typeof loader>();
  const [currentUrl, setCurrentUrl] = useState(url);

  useEffect(() => {
    setCurrentUrl(new URL(window.location.href));
  }, []);

  const {controllers} = staticState;
  const {productList, didYouMean} = controllers;

  const hasResults = productList.state.products.length > 0;
  const searchQuery = didYouMean.state.originalQuery || q;

  return (
    <SearchProvider
      navigatorContext={new ClientSideNavigatorContextProvider()}
      staticState={staticState}
      accessToken={accessToken}
    >
      <ParameterManager url={currentUrl.toString()} />
      {!hasResults && (
        <main className="bg-gray-50 noResults-container">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              No results found for "{q}"
            </h1>
            <p className="mt-4 max-w-xl text-base text-gray-500">
              Please try adjusting your search or filter to find what you're
              looking for.
            </p>
          </div>
        </main>
      )}
      {hasResults && (
        <FullSearch
          headline={`Browse ${q}`}
          tagline="Find Your Perfect Splash! Dive into our collection and search for the water sports gear that takes your adventure to the next level. Your journey starts with a click!"
          searchQuery={searchQuery}
        />
      )}
    </SearchProvider>
  );
}
