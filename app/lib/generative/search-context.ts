/**
 * Utilities for building search context to send to the agent.
 *
 * The client sends raw JSON data; formatting for LLM is done server-side
 * in the agent (coveo_tools.py) to keep the logic centralized.
 */

import type {Product} from '@coveo/headless-react/ssr-commerce';

/**
 * Facet value with selection state.
 */
export interface FacetValue {
  value: string;
  state: 'selected' | 'idle';
  numberOfResults?: number;
  // For numeric range facets
  start?: number;
  end?: number;
}

/**
 * Facet from Coveo search results.
 */
export interface Facet {
  facetId: string;
  field: string;
  displayName?: string;
  type: string;
  values: FacetValue[];
}

/**
 * Raw product from search results (subset of fields we care about).
 */
export interface RawProduct {
  ec_product_id?: string;
  ec_name?: string;
  ec_brand?: string;
  ec_price?: number;
  ec_promo_price?: number;
  ec_rating?: number;
  ec_category?: string[];
  ec_description?: string;
  ec_in_stock?: boolean;
}

/**
 * Search context sent to the agent as JSON.
 * Agent is responsible for formatting this for LLM consumption.
 */
export interface SearchContext {
  query: string;
  totalResults: number;
  products: RawProduct[];
  facets: Facet[];
}

/**
 * Extract raw product data from a Coveo Product object.
 * Only extracts the fields needed by the agent.
 */
function extractRawProduct(product: Product): RawProduct | null {
  if (!product || typeof product !== 'object') {
    return null;
  }

  const p = product as unknown as Record<string, unknown>;

  // Must have at least product ID and name
  if (!p.ec_product_id || !p.ec_name) {
    return null;
  }

  return {
    ec_product_id: String(p.ec_product_id),
    ec_name: String(p.ec_name),
    ec_brand: p.ec_brand ? String(p.ec_brand) : undefined,
    ec_price: typeof p.ec_price === 'number' ? p.ec_price : undefined,
    ec_promo_price:
      typeof p.ec_promo_price === 'number' ? p.ec_promo_price : undefined,
    ec_rating: typeof p.ec_rating === 'number' ? p.ec_rating : undefined,
    ec_category: Array.isArray(p.ec_category)
      ? (p.ec_category as string[])
      : undefined,
    ec_description:
      typeof p.ec_description === 'string' ? p.ec_description : undefined,
    ec_in_stock: typeof p.ec_in_stock === 'boolean' ? p.ec_in_stock : undefined,
  };
}

/**
 * Extract facets from productList.state.facets, filtering to only selected values.
 * We include facets that have at least one selected value.
 */
function extractFacets(facets: unknown): Facet[] {
  if (!Array.isArray(facets)) {
    return [];
  }

  const extracted: Facet[] = [];

  for (const facet of facets) {
    if (!facet || typeof facet !== 'object') continue;

    const f = facet as Record<string, unknown>;
    const values = f.values as unknown[];

    if (!Array.isArray(values)) continue;

    // Check if any values are selected
    const selectedValues = values.filter((v) => {
      if (!v || typeof v !== 'object') return false;
      return (v as Record<string, unknown>).state === 'selected';
    });

    // Only include facets with selected values
    if (selectedValues.length > 0) {
      extracted.push({
        facetId: String(f.facetId ?? ''),
        field: String(f.field ?? ''),
        displayName: f.displayName ? String(f.displayName) : undefined,
        type: String(f.type ?? 'regular'),
        values: selectedValues.map((v) => {
          const val = v as Record<string, unknown>;
          const facetValue: FacetValue = {
            value: String(val.value ?? ''),
            state: 'selected',
            numberOfResults:
              typeof val.numberOfResults === 'number'
                ? val.numberOfResults
                : undefined,
          };
          // For numeric range facets
          if (typeof val.start === 'number') facetValue.start = val.start;
          if (typeof val.end === 'number') facetValue.end = val.end;
          return facetValue;
        }),
      });
    }
  }

  return extracted;
}

/**
 * Build a search context object from productList.state.
 * This extracts the essential data and sends it as JSON to the agent.
 *
 * @param state - The productList.state object from Coveo
 * @returns SearchContext object ready to be sent to the agent
 */
export function buildSearchContext(
  state: {
    products?: Product[];
    facets?: unknown;
    queryExecuted?: string;
  },
  totalResults?: number,
): SearchContext {
  const products = Array.isArray(state.products)
    ? state.products
        .map(extractRawProduct)
        .filter((p): p is RawProduct => p !== null)
    : [];

  const facets = extractFacets(state.facets);

  return {
    query: state.queryExecuted ?? '',
    totalResults: totalResults ?? products.length,
    products,
    facets,
  };
}
