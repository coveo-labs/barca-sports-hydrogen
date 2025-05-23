import {
  usePdpRecommendationsLowerCarousel,
  usePdpRecommendationsUpperCarousel,
} from '~/lib/coveo.engine';
import {ProductCard} from './ProductCard';
import {Fragment} from 'react';

export function ProductRecommendations() {
  const pdpRecommendationsUpperCarousel = usePdpRecommendationsUpperCarousel();
  const pdpRecommendationsLowerCarousel = usePdpRecommendationsLowerCarousel();

  return (
    <section aria-labelledby="related-heading" className="mt-24">
      {[pdpRecommendationsUpperCarousel, pdpRecommendationsLowerCarousel].map(
        (recommendationCarousel, i) => {
          if (recommendationCarousel.state.products.length === 0) {
            return null;
          }
          return (
            // eslint-disable-next-line react/no-array-index-key
            <Fragment key={`product-recs-${i}`}>
              <div className="recommendation-container">
                <h2
                  id="related-heading"
                  className="recommendation-title text-lg font-medium text-gray-900"
                >
                  {recommendationCarousel.state.headline}
                </h2>

                <div className="recommendation-list mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
                  {recommendationCarousel.state.products
                    .slice(0, 4)
                    .map((relatedProduct) => (
                      <ProductCard
                        className="recommendation-card"
                        product={relatedProduct}
                        key={relatedProduct.permanentid}
                        onSelect={
                          recommendationCarousel.methods?.interactiveProduct({
                            options: {product: relatedProduct},
                          }).select
                        }
                      />
                    ))}
                </div>
              </div>
            </Fragment>
          );
        },
      )}
    </section>
  );
}
