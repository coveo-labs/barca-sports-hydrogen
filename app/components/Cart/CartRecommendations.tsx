import {useCartRecommendations} from '~/lib/coveo.engine';
import {ProductCard} from '../Products/ProductCard';

export function CartRecommendations() {
  const recs = useCartRecommendations();
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
                options: {product: relatedProduct},
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
