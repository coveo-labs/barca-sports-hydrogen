import { useCartRecommendations } from '~/lib/coveo.engine';
import { ProductCard } from '../Products/ProductCard';
import { useEffect, useRef } from 'react';


export function CartRecommendations() {
  const recs = useCartRecommendations();

  const recommendationsItemsArray: any[] = [];
  recs.state.products.forEach((recommendationItem: any, index: number) => {
    recommendationsItemsArray.push({
      item_id: recommendationItem.permanentid,
      item_name: recommendationItem.ec_name,
      index: index,
      price: recommendationItem.ec_price,
      quantity: 1
    })
  });

  const hasRunRef = useRef(false);

  useEffect(() => {
    //@ts-ignore
    window.dataLayer = window.dataLayer || [];
    //@ts-ignore
    window.dataLayer.push({ ecommerce: null });  // Clear the previous ecommerce object.
    if (hasRunRef.current) return;
    hasRunRef.current = true;
    //@ts-ignore
    window.dataLayer.push({
      event: "view_item_list",
      item_list_id: `recommendations_${recs.state.headline.toString().replaceAll(' ', '_').toLowerCase()}`,
      item_list_name: recs.state.headline,
      items: [...recommendationsItemsArray]
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
