import type {
  Recommendations,
  RecommendationsState,
} from '@coveo/headless-react/ssr-commerce';
import {useEffect} from 'react';
import {useHomepageRecommendations} from '~/lib/coveo.engine';
import {ProductCard} from './ProductCard';

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
