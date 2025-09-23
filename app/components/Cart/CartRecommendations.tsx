import {useCartRecommendations} from '~/lib/coveo.engine';
import {ProductCard} from '../Products/ProductCard';
import {useEffect, useRef} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import '~/types/gtm';

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

export function CartRecommendations() {
  const hasRunRef = useRef(false);
  const recs = useCartRecommendations() as RecommendationController;

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const recommendationsItemsArray: itemsList[] = [];
    recs.state.products.forEach(
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
        item_list_id: `recommendations_${recs.state.headline
          .toString()
          .replaceAll(' ', '_')
          .toLowerCase()}`,
        item_list_name: recs.state.headline,
        items: recommendationsItemsArray,
      },
    });
  }, [recs.state.headline, recs.state.products]);

  return (
    <section
      aria-labelledby="related-heading"
      className="recommendation-container mt-24"
    >
      <h2
        id="related-heading"
        className="recommendation-title text-lg font-medium text-gray-900"
      >
        {recs.state.headline}
      </h2>

      <div className="recommendation-list mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
        {recs.state.products.map((relatedProduct: Product) => (
          <ProductCard
            className="recommendation-card"
            onSelect={() =>
              recs.methods
                ?.interactiveProduct({
                  options: {product: relatedProduct},
                })
                .select()
            }
            product={relatedProduct}
            key={relatedProduct.permanentid}
          />
        ))}
      </div>
    </section>
  );
}
