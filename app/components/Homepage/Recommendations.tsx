import {useHomepageRecommendations} from '~/lib/coveo.engine';
import {ProductCard} from '../Products/ProductCard';
import {useEffect} from 'react';

export function Recommendations() {
  const homepageRecommendations = useHomepageRecommendations();
  useEffect(() => {
    homepageRecommendations.methods?.refresh();
  }, [homepageRecommendations.methods]);
  return (
    <section aria-labelledby="favorites-heading">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="sm:flex sm:items-baseline sm:justify-between">
          <h2
            id="favorites-heading"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            {homepageRecommendations.state.headline}
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8">
          {homepageRecommendations.state.products.map((recommendation) => (
            <div key={recommendation.permanentid} className="group relative">
              <ProductCard product={recommendation} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
