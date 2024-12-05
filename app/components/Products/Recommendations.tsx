import {usePdpRecommendations} from '~/lib/coveo.engine';
import {ProductCard} from './ProductCard';

export function ProductRecommendations() {
  const pdpRecommendations = usePdpRecommendations();

  return (
    <section aria-labelledby="related-heading" className="mt-24">
      <h2 id="related-heading" className="text-lg font-medium text-gray-900">
        {pdpRecommendations.state.headline}
      </h2>

      <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 xl:gap-x-8">
        {pdpRecommendations.state.products.slice(0, 4).map((relatedProduct) => (
          <ProductCard
            product={relatedProduct}
            key={relatedProduct.permanentid}
            onSelect={
              pdpRecommendations.methods?.interactiveProduct({
                options: {product: relatedProduct},
              }).select
            }
          />
        ))}
      </div>
    </section>
  );
}
