import { useCartRecommendations } from '~/lib/coveo.engine';
import { ProductCard } from '../Products/ProductCard';
import { useEffect } from 'react';

let hasRunRef = false;

type itemsList = {
  item_id: string,
  item_name: string,
  index: number,
  price: number,
  quantity: number
}

export function CartRecommendations() {
  const recs = useCartRecommendations();

  const recommendationsItemsArray: itemsList[] = [];
  recs.state.products.forEach((recommendationItem: any, index: number) => {
    recommendationsItemsArray.push({
      item_id: recommendationItem.permanentid,
      item_name: recommendationItem.ec_name,
      index: index,
      price: recommendationItem.ec_price,
      quantity: 1
    })
  });

  useEffect(() => {
    if (hasRunRef) return;
    hasRunRef = true;

    //@ts-ignore
    window.dataLayer = window.dataLayer || [];
    //@ts-ignore
    window.dataLayer.push({ ecommerce: null });  // Clear the previous ecommerce object.
    //@ts-ignore
    window.dataLayer.push({
      event: "view_item_list",
      ecommerce: {
        item_list_id: `recommendations_${recs.state.headline.toString().replaceAll(' ', '_').toLowerCase()}`,
        item_list_name: recs.state.headline,
        items: recommendationsItemsArray
      }
    });
  }, []);

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
        {recs.state.products.map((relatedProduct) => (
          <ProductCard
            className="recommendation-card"
            onSelect={
              recs.methods?.interactiveProduct({
                options: { product: relatedProduct },
              }).select
            }
            product={relatedProduct}
            key={relatedProduct.permanentid}
          />
        ))}
      </div>
    </section>
  );
}
