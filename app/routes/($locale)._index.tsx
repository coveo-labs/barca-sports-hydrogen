import {useLoaderData, type MetaFunction} from '@remix-run/react';
import type {LoaderFunctionArgs} from '@remix-run/server-runtime';
import {useEffect} from 'react';
import {Hero} from '~/components/Homepage/Hero';
import {FeaturedCategories} from '~/components/Homepage/FeaturedCategories';
import {useHomepageRecommendations} from '~/lib/coveo.engine';
import {HEADER_QUERY} from '~/lib/fragments';
import {LearnMore} from '~/components/Homepage/LearnMore';
import {Recommendations} from '~/components/Homepage/Recommendations';
import {CTA} from '~/components/Homepage/CTA';
export const meta: MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  const [header] = await Promise.all([
    context.storefront.query(HEADER_QUERY, {
      cache: context.storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'hydrogen-menu',
      },
    }),
  ]);

  return {header};
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
        <Recommendations />

        {/* CTA section */}
        <CTA />
      </main>
    </div>
  );
}
