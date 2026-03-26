import type {Product} from '@coveo/headless-react/ssr-commerce';
import {extractAllProductIds} from './product-identifier';

export {normalizeProductId as normalizeProductIdentifier} from './product-identifier';

export function registerProducts(
  target: Map<string, Product>,
  products: Product[] | undefined,
) {
  if (!products || products.length === 0) {
    return;
  }

  for (const product of products) {
    registerSingleProduct(target, product);
  }
}

function registerSingleProduct(target: Map<string, Product>, product: Product) {
  const identifiers = extractAllProductIds(product);
  for (const identifier of identifiers) {
    if (!target.has(identifier)) {
      target.set(identifier, product);
    }
    const lowered = identifier.toLowerCase();
    if (!target.has(lowered)) {
      target.set(lowered, product);
    }
  }

  const children = Array.isArray(product.children)
    ? (product.children as Product[])
    : [];
  for (const child of children) {
    registerSingleProduct(target, child);
  }
}
