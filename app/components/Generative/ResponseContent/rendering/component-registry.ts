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
  ComparisonTable: renderComparisonTable,
  ComparisonSummary: renderComparisonSummary,
  BundleDisplay: renderBundleDisplay,
  NextActionsBar: renderNextActionsBar,
  Text: renderText,
  Image: renderImage,
  Button: renderButton,
};
