import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';

import {CTA} from '~/components/Homepage/CTA';
import {FeaturedCategories} from '~/components/Homepage/FeaturedCategories';
import {Hero} from '~/components/Homepage/Hero';
import {LearnMore} from '~/components/Homepage/LearnMore';
import {Recommendations} from '~/components/Homepage/Recommendations';
import {RecommendationProvider} from '~/components/Search/Context';
import {engineDefinition} from '~/lib/coveo/engine';
import {fetchRecommendationStaticState} from '~/lib/coveo/engine.server';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from '~/lib/coveo/navigator.provider';
import {HEADER_QUERY} from '~/lib/shopify/fragments';

export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  engineDefinition.recommendationEngineDefinition.setNavigatorContextProvider(
    () => new ServerSideNavigatorContextProvider(request),
  );
  const [header, recommendationResult] = await Promise.all([
    context.storefront.query(HEADER_QUERY, {
      cache: context.storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'coveo-shopify-menu',
      },
    }),
    fetchRecommendationStaticState({
      context,
      request,
      k: ['homepageRecommendations'],
    }),
  ]);

  return {
    header,
    recommendationStaticState: recommendationResult.staticState,
    accessToken: recommendationResult.accessToken,
  };
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
          accessToken={data.accessToken}
        >
          <Recommendations />
        </RecommendationProvider>

        {/* CTA section */}
        <CTA />
      </main>
    </div>
  );
}
