import {useHomepageRecommendations} from '~/lib/coveo.engine';
import {ProductCard} from '../Products/ProductCard';
import {useEffect, useRef} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import '~/types/gtm';

// Global tracking to ensure analytics only fire once
let hasRunRef = false;

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

export function Recommendations() {
  const homepageRecommendations =
    useHomepageRecommendations() as RecommendationController;

  useEffect(() => {
    if (hasRunRef) return;
    hasRunRef = true;

    const recommendationsItemsArray: itemsList[] = [];
    homepageRecommendations.state.products.forEach(
      (recommendationItem: Product, index: number) => {
        recommendationsItemsArray.push({
          item_id: recommendationItem.permanentid,
          item_name: recommendationItem.ec_name || '',
          index,
          price: recommendationItem.ec_price || 0,
          quantity: 1,
        });
      },
    );

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ecommerce: null}); // Clear the previous ecommerce object.
    window.dataLayer.push({
      event: 'view_item_list',
      ecommerce: {
        item_list_id: `recommendations_${homepageRecommendations.state.headline
          .toString()
          .replaceAll(' ', '_')
          .toLowerCase()}`,
        item_list_name: homepageRecommendations.state.headline,
        items: recommendationsItemsArray,
      },
    });
  }, [
    homepageRecommendations.state.products,
    homepageRecommendations.state.headline,
  ]);

  return (
    <section
      aria-labelledby="favorites-heading"
      className="recommendation-container"
    >
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="sm:flex sm:items-baseline sm:justify-between">
          <h2
            id="favorites-heading"
            className="recommendation-title text-2xl font-bold tracking-tight text-gray-900"
          >
            {homepageRecommendations.state.headline}
          </h2>
        </div>

        <div className="recommendation-list mt-6 grid grid-cols-1 gap-y-10 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-0 lg:gap-x-8">
          {homepageRecommendations.state.products.map(
            (recommendation: Product) => {
              // Exclude children to prevent color swatches on recs carousel
              const {children, ...productWithoutEcColor} = recommendation;

              return (
                <div
                  key={recommendation.permanentid}
                  className="group relative"
                >
                  <ProductCard
                    className="recommendation-card"
                    product={productWithoutEcColor as Product}
                    onSelect={() =>
                      homepageRecommendations.methods
                        ?.interactiveProduct({
                          options: {product: productWithoutEcColor as Product},
                        })
                        .select()
                    }
                  />
                </div>
              );
            },
          )}
        </div>
      </div>
    </section>
  );
}
