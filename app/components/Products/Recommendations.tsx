import {
  usePdpRecommendationsLowerCarousel,
  usePdpRecommendationsUpperCarousel,
} from '~/lib/coveo.engine';
import { ProductCard } from './ProductCard';
import { Fragment, useEffect } from 'react';
import { use } from 'marked';

let hasRunRefUpper = false;
let hasRunRefLower = false;

export function ProductRecommendations() {
  const pdpRecommendationsUpperCarousel = usePdpRecommendationsUpperCarousel();
  const pdpRecommendationsLowerCarousel = usePdpRecommendationsLowerCarousel();

  const recommendationsUpperCarouselItemsArray: any[] = [];
  pdpRecommendationsUpperCarousel.state.products.slice(0, 4).forEach((recommendationItem: any, index: number) => {
    recommendationsUpperCarouselItemsArray.push({
      item_id: recommendationItem.permanentid,
      item_name: recommendationItem.ec_name,
      index: index,
      price: recommendationItem.ec_price,
      quantity: 1
    })
  });

  const recommendationsLowerCarouselItemsArray: any[] = [];
  pdpRecommendationsLowerCarousel.state.products.slice(0, 4).forEach((recommendationItem: any, index: number) => {
    recommendationsLowerCarouselItemsArray.push({
      item_id: recommendationItem.permanentid,
      item_name: recommendationItem.ec_name,
      index: index,
      price: recommendationItem.ec_price,
      quantity: 1
    })
  });
  useEffect(() => {
    if (hasRunRefUpper) return;
    hasRunRefUpper = true;
    //@ts-ignore
    window.dataLayer = window.dataLayer || [];
    //@ts-ignore
    window.dataLayer.push({ ecommerce: null });  // Clear the previous ecommerce object.
    //@ts-ignore
    window.dataLayer.push({
      event: "view_item_list",
      item_list_id: `recommendations_${pdpRecommendationsUpperCarousel.state.headline.toString().replaceAll(' ', '_').toLowerCase()}`,
      item_list_name: pdpRecommendationsUpperCarousel.state.headline,
      items: [...recommendationsUpperCarouselItemsArray]
    });
  }, []);

  useEffect(() => {
    if (hasRunRefLower) return;
    hasRunRefLower = true;
    //@ts-ignore
    window.dataLayer = window.dataLayer || [];
    //@ts-ignore
    window.dataLayer.push({ ecommerce: null });  // Clear the previous ecommerce object.
    //@ts-ignore
    window.dataLayer.push({
      event: "view_item_list",
      item_list_id: `recommendations_${pdpRecommendationsLowerCarousel.state.headline.toString().replaceAll(' ', '_').toLowerCase()}`,
      item_list_name: pdpRecommendationsLowerCarousel.state.headline,
      items: [...recommendationsLowerCarouselItemsArray]
    });
  }, []);

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
                            options: { product: relatedProduct },
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
