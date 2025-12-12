import type {Product} from '@coveo/headless-react/ssr-commerce';

const PRODUCT_IDENTIFIER_KEYS = [
  'ec_product_id',
  'ec_productId',
  'ec_item_id',
  'permanentid',
  'permanentId',
  'permanentID',
  'permanent_url',
  'permanentUrl',
  'clickUri',
  'productId',
  'id',
  'sku',
] as const;

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

export function normalizeProductIdentifier(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function extractProductIdentifiers(product: Product): string[] {
  const record = product as unknown as Record<string, unknown>;
  const identifiers: string[] = [];

  for (const key of PRODUCT_IDENTIFIER_KEYS) {
    const candidate = record[key as keyof typeof record];
    const normalized = normalizeProductIdentifier(candidate);
    if (normalized) {
      identifiers.push(normalized);
    }
  }

  return identifiers;
}

function registerSingleProduct(target: Map<string, Product>, product: Product) {
  const identifiers = extractProductIdentifiers(product);
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
