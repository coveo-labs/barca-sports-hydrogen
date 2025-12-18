import {
  usePdpRecommendationsLowerCarousel,
  usePdpRecommendationsUpperCarousel,
} from '~/lib/coveo/engine';
import {ProductCard} from './ProductCard';
import {Fragment, useEffect} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import {createGTMItemFromProduct} from '~/lib/coveo/map.coveo.shopify';
import '~/types/gtm';

let hasRunRefUpper = false;
let hasRunRefLower = false;

type itemsList = {
  item_id: string;
  item_name: string;
  index: number;
  price: number;
  quantity: number;
};

// Define interfaces for the recommendation controller
interface RecommendationState {
  products: Product[];
  headline: string;
}

interface RecommendationMethods {
  interactiveProduct: (options: {options: {product: Product}}) => {
    select: () => void;
  };
}

interface RecommendationController {
  state: RecommendationState;
  methods: RecommendationMethods;
}

export function ProductRecommendations() {
  const pdpRecommendationsUpperCarousel =
    usePdpRecommendationsUpperCarousel() as RecommendationController;
  const pdpRecommendationsLowerCarousel =
    usePdpRecommendationsLowerCarousel() as RecommendationController;

  function constructViewItemsListEvent(
    recommendationsProducts: RecommendationController,
  ) {
    const recommandationsItemsArray: itemsList[] = [];
    recommendationsProducts.state.products
      .slice(0, 4)
      .forEach((recommendationItem: Product, index: number) => {
        recommandationsItemsArray.push(
          createGTMItemFromProduct(recommendationItem, index),
        );
      });
    return {
      event: 'view_item_list',
      ecommerce: {
        item_list_id: `recommendations_${recommendationsProducts.state.headline
          .toString()
          .replaceAll(' ', '_')
          .toLowerCase()}`,
        item_list_name: recommendationsProducts.state.headline,
        items: recommandationsItemsArray,
      },
    };
  }

  useEffect(() => {
    if (hasRunRefUpper) return;
    hasRunRefUpper = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ecommerce: null}); // Clear the previous ecommerce object.
    window.dataLayer.push(
      constructViewItemsListEvent(pdpRecommendationsUpperCarousel),
    );

    if (hasRunRefLower) return;
    hasRunRefLower = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ecommerce: null}); // Clear the previous ecommerce object.
    window.dataLayer.push(
      constructViewItemsListEvent(pdpRecommendationsLowerCarousel),
    );
  }, [pdpRecommendationsUpperCarousel, pdpRecommendationsLowerCarousel]);

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
                    .map((relatedProduct: Product) => {
                      // Exclude children to prevent color swatches on recs carousel
                      const {children, ...productWithoutEcColor} =
                        relatedProduct;

                      return (
                        <ProductCard
                          className="recommendation-card"
                          product={productWithoutEcColor as Product}
                          key={productWithoutEcColor.permanentid}
                          onSelect={() => {
                            recommendationCarousel.methods
                              ?.interactiveProduct({
                                options: {
                                  product: relatedProduct,
                                },
                              })
                              .select();
                          }}
                        />
                      );
                    })}
                </div>
              </div>
            </Fragment>
          );
        },
      )}
    </section>
  );
}
