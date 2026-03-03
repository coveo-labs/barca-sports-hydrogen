import {Money} from '@shopify/hydrogen';
import {NavLink} from 'react-router';

interface ComparisonProduct {
  productId: string;
  name: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  rating?: number;
  url: string;
  recommended?: boolean;
  // Additional attributes for comparison
  [key: string]: any;
}

interface ComparisonTableProps {
  headline?: string;
  products: ComparisonProduct[];
  attributes: string[];
  isLoading?: boolean;
  onProductSelect?: (productId: string) => void;
}

const SKELETON_COLUMNS = 3;
const SKELETON_ROWS = 4;

// Every th/td gets this — border-collapse merges them into a full visible grid
const CELL = 'border border-gray-200';

function ComparisonTableSkeleton() {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full border-collapse animate-pulse">
        <thead>
          <tr>
            <th className={`${CELL} px-4 py-3 w-28 bg-white`} />
            {Array.from({length: SKELETON_COLUMNS}).map((_, i) => (
              <th key={i} className={`${CELL} px-4 py-5 bg-white`}>
                <div className="w-full h-48 rounded-lg bg-gray-200 mb-3" />
                <div className="h-4 rounded bg-gray-200 w-3/4 mx-auto mb-1" />
                <div className="h-4 rounded bg-gray-200 w-1/3 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({length: SKELETON_ROWS}).map((_, row) => (
            <tr key={row}>
              <td className={`${CELL} px-4 py-4 bg-white`}>
                <div className="h-3.5 rounded bg-gray-200 w-16" />
              </td>
              {Array.from({length: SKELETON_COLUMNS}).map((_, col) => (
                <td
                  key={col}
                  className={`${CELL} px-4 py-4 bg-white text-center`}
                >
                  <div className="h-3.5 rounded bg-gray-200 w-24 mx-auto" />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td className={`${CELL} px-4 py-4 bg-white`} />
            {Array.from({length: SKELETON_COLUMNS}).map((_, i) => (
              <td key={i} className={`${CELL} px-4 py-4 bg-white`}>
                <div className="h-9 rounded-full bg-gray-200 w-full" />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Side-by-side product comparison table for A2UI.
 * Full cell borders (border-collapse) give visible row + column dividers.
 * Outer rounded border via wrapper div with overflow-hidden.
 */
export function ComparisonTable({
  headline,
  products,
  attributes,
  isLoading = false,
  onProductSelect,
}: ComparisonTableProps) {
  if (isLoading && products.length === 0) {
    return <ComparisonTableSkeleton />;
  }

  const recommendedId = products.find((p) => p.recommended)?.productId ?? null;

  return (
    <div className="w-full overflow-x-auto">
      {headline && (
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{headline}</h2>
      )}
      {/* Rounded outer border — overflow-hidden clips the table corners */}
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full border-collapse">
          {/* ── Column headers ── */}
          <thead>
            <tr>
              {/* "Product" label — top-left, vertically top-aligned */}
              <th
                className={`${CELL} px-4 py-4 w-28 text-left text-sm font-medium text-gray-500 align-top bg-white`}
              >
                Product
              </th>

              {products.map((product) => {
                const isRecommended = product.productId === recommendedId;
                const hasPromo =
                  product.originalPrice !== undefined &&
                  product.originalPrice > product.price;

                return (
                  <th
                    key={product.productId}
                    className={`${CELL} px-4 py-4 text-center align-top ${
                      isRecommended ? 'bg-indigo-50' : 'bg-white'
                    }`}
                  >
                    {/* Recommended badge — centered above image */}
                    {isRecommended ? (
                      <div className="mb-3 flex justify-center">
                        <span className="inline-block bg-indigo-600 text-white text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
                          Recommended
                        </span>
                      </div>
                    ) : (
                      /* Spacer so non-recommended columns align with the badge row */
                      recommendedId !== null && (
                        <div className="mb-3 h-[26px]" />
                      )
                    )}

                    <NavLink
                      to={product.url}
                      onClick={() => onProductSelect?.(product.productId)}
                      className="group block"
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-48 rounded-lg border border-gray-200 object-cover bg-gray-50 group-hover:opacity-90 transition-opacity"
                      />
                      <p className="mt-3 text-sm font-semibold text-gray-900 leading-snug">
                        {product.name}
                      </p>
                    </NavLink>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* ── Attribute rows ── */}
          <tbody>
            {/* Price row */}
            <tr>
              <td
                className={`${CELL} px-4 py-3.5 text-sm font-medium text-gray-500 bg-white`}
              >
                Price
              </td>
              {products.map((product) => {
                const isRecommended = product.productId === recommendedId;
                const hasPromo =
                  product.originalPrice !== undefined &&
                  product.originalPrice > product.price;
                return (
                  <td
                    key={product.productId}
                    className={`${CELL} px-4 py-3.5 text-sm text-center ${
                      isRecommended ? 'bg-indigo-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="font-semibold text-gray-900">
                        <Money
                          data={{
                            amount: product.price.toString(),
                            currencyCode: (product.currency || 'USD') as any,
                          }}
                        />
                      </span>
                      {hasPromo && (
                        <span className="text-xs text-gray-400 line-through">
                          <Money
                            data={{
                              amount: product.originalPrice!.toString(),
                              currencyCode: (product.currency || 'USD') as any,
                            }}
                          />
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Custom attribute rows */}
            {attributes.map((attr) => (
              <tr key={attr}>
                <td
                  className={`${CELL} px-4 py-3.5 text-sm font-medium text-gray-500 capitalize whitespace-nowrap bg-white`}
                >
                  {attr.replace(/_/g, ' ')}
                </td>
                {products.map((product) => {
                  const isRecommended = product.productId === recommendedId;
                  return (
                    <td
                      key={product.productId}
                      className={`${CELL} px-4 py-3.5 text-sm text-gray-700 text-center ${
                        isRecommended ? 'bg-indigo-50' : 'bg-white'
                      }`}
                    >
                      {formatAttributeValue(product[attr])}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Add to Cart row */}
            <tr>
              <td className={`${CELL} px-4 py-4 bg-white`} />
              {products.map((product) => {
                const isRecommended = product.productId === recommendedId;
                return (
                  <td
                    key={product.productId}
                    className={`${CELL} px-4 py-4 ${
                      isRecommended ? 'bg-indigo-50' : 'bg-white'
                    }`}
                  >
                    <button
                      type="button"
                      className={`w-full py-2 px-4 rounded-full text-sm font-semibold transition-colors ${
                        isRecommended
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'border border-gray-900 text-gray-900 bg-white hover:bg-gray-50'
                      }`}
                    >
                      Add to Cart
                    </button>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatAttributeValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
