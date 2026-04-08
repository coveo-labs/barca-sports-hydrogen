import type {ReactNode} from 'react';
import {
  renderBundleDisplay,
  renderButton,
  renderComparisonSummary,
  renderComparisonTable,
  renderImage,
  renderNextActionsBar,
  renderProductCard,
  renderProductCarousel,
  renderProductResearchCard,
  renderText,
} from './component-renderers';
import type {ResponseComponentRendererProps} from './render-context';

export type ResponseComponentRegistry = Record<
  string,
  (props: ResponseComponentRendererProps) => ReactNode
>;

export const responseComponentRegistry: ResponseComponentRegistry = {
  ProductCard: renderProductCard,
  ProductCarousel: renderProductCarousel,
  ProductResearchCard: renderProductResearchCard,
  ComparisonTable: renderComparisonTable,
  ComparisonSummary: renderComparisonSummary,
  BundleDisplay: renderBundleDisplay,
  NextActionsBar: renderNextActionsBar,
  Text: renderText,
  Image: renderImage,
  Button: renderButton,
};
