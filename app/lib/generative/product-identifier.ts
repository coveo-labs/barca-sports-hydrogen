import type {Product} from '@coveo/headless-react/ssr-commerce';

export const PRODUCT_ID_KEYS = [
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

export function normalizeProductId(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function resolveProductId(source: unknown): string | null {
  if (!source || typeof source !== 'object') {
    return normalizeProductId(source);
  }

  const record = source as Record<string, unknown>;

  for (const key of PRODUCT_ID_KEYS) {
    const candidate = record[key];
    const normalized = normalizeProductId(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

export function resolveProductIdFromAttributes(
  attributes: Record<string, string>,
): string | null {
  for (const key of PRODUCT_ID_KEYS) {
    const candidate = attributes[key];
    const normalized = normalizeProductId(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export function extractAllProductIds(product: Product): string[] {
  const record = product as unknown as Record<string, unknown>;
  const identifiers: string[] = [];

  for (const key of PRODUCT_ID_KEYS) {
    const candidate = record[key];
    const normalized = normalizeProductId(candidate);
    if (normalized) {
      identifiers.push(normalized);
    }
  }

  return identifiers;
}
