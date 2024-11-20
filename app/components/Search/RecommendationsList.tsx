import type {RecommendationsState} from '@coveo/headless-react/ssr-commerce';
import {ProductCard} from '../Products/ProductCard';

interface RecommendationsListProps {
  recommendations: RecommendationsState;
}
export function RecommendationsList({
  recommendations,
}: RecommendationsListProps) {
  return (
    <>
      {recommendations.headline}
      {recommendations.products.map((product) => (
        <div key={product.permanentid} className="shadow-md">
          <ProductCard product={product} />
        </div>
      ))}
    </>
  );
}
