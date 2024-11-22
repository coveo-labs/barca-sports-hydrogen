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

export const meta: MetaFunction = () => {
  return [{title: `Coveo | Search`}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  searchEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );

  const staticState = await fetchStaticState({
    context,
    k: 'searchEngineDefinition',
    query: q,
    url: `https://sports.barca.group`,
    request,
  });

  return {staticState, q};
}

export default function SearchPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <SearchProvider
      navigatorContext={new ClientSideNavigatorContextProvider()}
      q={data.q}
      staticState={data.staticState as SearchStaticState}
    >
      <FullSearch
        headline={`Browse ${data.q}`}
        tagline="Find Your Perfect Splash! Dive into our collection and search for the water sports gear that takes your adventure to the next level. Your journey starts with a click!"
      />
    </SearchProvider>
  );
}
