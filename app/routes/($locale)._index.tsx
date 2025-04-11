import {useLoaderData, type MetaFunction} from '@remix-run/react';
import type {LoaderFunctionArgs} from '@remix-run/server-runtime';
import {Hero} from '~/components/Homepage/Hero';
import {FeaturedCategories} from '~/components/Homepage/FeaturedCategories';
import {
  engineDefinition,
  fetchRecommendationStaticState,
} from '~/lib/coveo.engine';
import {HEADER_QUERY} from '~/lib/fragments';
import {LearnMore} from '~/components/Homepage/LearnMore';
import {Recommendations} from '~/components/Homepage/Recommendations';
import {CTA} from '~/components/Homepage/CTA';
import {RecommendationProvider} from '~/components/Search/Context';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/navigator.provider';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  engineDefinition.recommendationEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );

  const [header, recommendationStaticState] = await Promise.all([
    context.storefront.query(HEADER_QUERY, {
      cache: context.storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'hydrogen-menu',
      },
    }),
    fetchRecommendationStaticState({
      context,
      request,
      k: ['homepageRecommendations'],
    }),
  ]);

  return {header, recommendationStaticState};
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <Hero />
      <main className="relative overflow-hidden bg-white">
        {/* Category section */}
        <FeaturedCategories header={data.header} />

        {/* Callout section */}
        <LearnMore />

        {/* Favorites section */}
        <RecommendationProvider
          staticState={data.recommendationStaticState}
          navigatorContext={new ClientSideNavigatorContextProvider()}
        >
          <Recommendations />
        </RecommendationProvider>

        {/* CTA section */}
        <CTA />
      </main>
    </div>
  );
}
