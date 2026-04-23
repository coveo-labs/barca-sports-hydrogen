import {useState} from 'react';
import {Money} from '@shopify/hydrogen';
import {NavLink} from 'react-router';
import {A2UIAddToCartButton} from './A2UIAddToCartButton';
import {ProductDrawer} from './ProductDrawer';

interface ComparisonProduct {
  productId: string;
  name: string;
  brand?: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  rating?: number;
  description?: string;
  category?: string;
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

// border-r + border-b only: the wrapper div provides the top and left outer edges.
// border-separate (not border-collapse) prevents any interaction with the wrapper border.
// overflow-hidden on the wrapper clips cells to the rounded corners cleanly.
// Last-column cells omit border-r (wrapper provides the right edge).
// Last-row cells omit border-b (wrapper provides the bottom edge).
const CELL = 'border-r border-b border-gray-200'; // normal cell
const CELL_LAST_COL = 'border-b border-gray-200'; // last column (no border-r)
const CELL_LAST_ROW = 'border-r border-gray-200'; // last row   (no border-b)
const CELL_LAST_BOTH = 'border-gray-200'; // last col + last row

function ComparisonTableSkeleton() {
  return (
    <div className="w-full overflow-x-auto">
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full border-separate border-spacing-0 animate-pulse">
          <thead>
            <tr>
              <th className={`${CELL} px-4 py-3 w-28 bg-white`} />
              {Array.from({length: SKELETON_COLUMNS}).map((_, i) => {
                const isLastCol = i === SKELETON_COLUMNS - 1;
                return (
                  <th
                    key={i}
                    className={`${isLastCol ? CELL_LAST_COL : CELL} px-4 py-5 bg-white`}
                  >
                    <div className="w-full h-48 rounded-lg bg-gray-200 mb-3" />
                    <div className="h-4 rounded bg-gray-200 w-3/4 mx-auto mb-1" />
                    <div className="h-4 rounded bg-gray-200 w-1/3 mx-auto" />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({length: SKELETON_ROWS}).map((_, row) => (
              <tr key={row}>
                <td className={`${CELL} px-4 py-4 bg-white`}>
                  <div className="h-3.5 rounded bg-gray-200 w-16" />
                </td>
                {Array.from({length: SKELETON_COLUMNS}).map((_, col) => {
                  const isLastCol = col === SKELETON_COLUMNS - 1;
                  return (
                    <td
                      key={col}
                      className={`${isLastCol ? CELL_LAST_COL : CELL} px-4 py-4 bg-white text-center`}
                    >
                      <div className="h-3.5 rounded bg-gray-200 w-24 mx-auto" />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className={`${CELL_LAST_ROW} px-4 py-4 bg-white`} />
              {Array.from({length: SKELETON_COLUMNS}).map((_, i) => {
                const isLastCol = i === SKELETON_COLUMNS - 1;
                return (
                  <td
                    key={i}
                    className={`${isLastCol ? CELL_LAST_BOTH : CELL_LAST_ROW} px-4 py-4 bg-white`}
                  >
                    <div className="h-9 rounded-full bg-gray-200 w-full" />
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
  const [drawerProduct, setDrawerProduct] = useState<ComparisonProduct | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = (product: ComparisonProduct) => {
    setDrawerProduct(product);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => setIsDrawerOpen(false);

  if (isLoading && products.length === 0) {
    return <ComparisonTableSkeleton />;
  }

  const recommendedId = products.find((p) => p.recommended)?.productId ?? null;

  return (
    <div className="w-full overflow-x-auto">
      {headline && (
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{headline}</h2>
      )}
      {/* border + rounded-lg on wrapper; overflow-hidden clips cells to rounded corners cleanly */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full border-separate border-spacing-0">
          {/* ── Column headers ── */}
          <thead>
            <tr>
              {/* "Product" label — top-left, vertically top-aligned */}
              <th
                className={`${CELL} px-4 py-4 w-28 text-left text-sm font-medium text-gray-500 align-top whitespace-nowrap bg-white`}
              >
                Product
              </th>

              {products.map((product, idx) => {
                const isRecommended = product.productId === recommendedId;
                const isLastCol = idx === products.length - 1;

                return (
                  <th
                    key={product.productId}
                    className={`${isLastCol ? CELL_LAST_COL : CELL} px-4 py-4 text-center align-top ${
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

                    <button
                      type="button"
                      onClick={() => openDrawer(product)}
                      className="group block w-full text-left"
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-[200px] w-[200px] mx-auto object-cover bg-gray-50 group-hover:opacity-90 transition-opacity"
                      />
                      <p className="mt-3 text-sm font-semibold text-gray-900 leading-snug truncate text-center">
                        {product.name}
                      </p>
                    </button>
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
                className={`${CELL} px-4 py-3.5 text-sm font-medium text-gray-500 bg-white align-middle`}
              >
                Price
              </td>
              {products.map((product, idx) => {
                const isRecommended = product.productId === recommendedId;
                const hasPromo =
                  product.originalPrice !== undefined &&
                  product.originalPrice > product.price;
                const isLastCol = idx === products.length - 1;
                return (
                  <td
                    key={product.productId}
                    className={`${isLastCol ? CELL_LAST_COL : CELL} px-4 py-3.5 text-sm text-center ${
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
                  className={`${CELL} px-4 py-3.5 text-sm font-medium text-gray-500 capitalize whitespace-nowrap bg-white align-middle`}
                >
                  {attr.replace(/_/g, ' ')}
                </td>
                {products.map((product, idx) => {
                  const isRecommended = product.productId === recommendedId;
                  const isLastCol = idx === products.length - 1;
                  return (
                    <td
                      key={product.productId}
                      className={`${isLastCol ? CELL_LAST_COL : CELL} px-4 py-3.5 text-sm text-gray-700 text-center ${
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
              <td className={`${CELL_LAST_ROW} px-4 py-4 bg-white`} />
              {products.map((product, idx) => {
                const isRecommended = product.productId === recommendedId;
                const isLastCol = idx === products.length - 1;
                return (
                  <td
                    key={product.productId}
                    className={`${isLastCol ? CELL_LAST_BOTH : CELL_LAST_ROW} px-4 py-4 ${
                      isRecommended ? 'bg-indigo-50' : 'bg-white'
                    }`}
                  >
                    <A2UIAddToCartButton
                      variant="full"
                      highlighted={isRecommended}
                      item={{
                        merchandiseId: product.productId,
                        name: product.name,
                        price: product.price,
                        currency: product.currency,
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <ProductDrawer
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          productId={drawerProduct?.productId ?? ''}
          name={drawerProduct?.name ?? ''}
          brand={drawerProduct?.brand}
          imageUrl={drawerProduct?.imageUrl ?? ''}
          price={drawerProduct?.price ?? 0}
          originalPrice={drawerProduct?.originalPrice}
          currency={drawerProduct?.currency}
          description={drawerProduct?.description}
          category={drawerProduct?.category}
          rating={drawerProduct?.rating}
          productUrl={drawerProduct?.url ?? '#'}
        />
    </div>
  );
}

function formatAttributeValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
