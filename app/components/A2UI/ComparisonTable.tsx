import {Money} from '@shopify/hydrogen';
import {StarIcon} from '@heroicons/react/20/solid';
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
  // Additional attributes for comparison
  [key: string]: any;
}

interface ComparisonTableProps {
  headline?: string;
  products: ComparisonProduct[];
  attributes: string[];
  onProductSelect?: (productId: string) => void;
}

/**
 * Side-by-side product comparison table for A2UI
 * Displays multiple products with their key attributes in a table format
 */
export function ComparisonTable({
  headline,
  products,
  attributes,
  onProductSelect,
}: ComparisonTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      {headline && (
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{headline}</h2>
      )}
      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Product
            </th>
            {products.map((product) => (
              <th
                key={product.productId}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <NavLink
                  to={product.url}
                  onClick={() => onProductSelect?.(product.productId)}
                  className="hover:text-gray-900"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-24 h-24 object-cover rounded-md mb-2"
                  />
                  <div className="font-semibold text-gray-900 normal-case">
                    {product.name}
                  </div>
                </NavLink>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Price Row */}
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              Price
            </td>
            {products.map((product) => (
              <td
                key={product.productId}
                className="px-6 py-4 whitespace-nowrap text-sm"
              >
                <div className="flex flex-col">
                  {product.originalPrice && (
                    <div className="text-gray-400 line-through text-xs">
                      <Money
                        data={{
                          amount: product.originalPrice.toString(),
                          currencyCode: (product.currency || 'USD') as any,
                        }}
                      />
                    </div>
                  )}
                  <div className="text-gray-900 font-semibold">
                    <Money
                      data={{
                        amount: product.price.toString(),
                        currencyCode: (product.currency || 'USD') as any,
                      }}
                    />
                  </div>
                </div>
              </td>
            ))}
          </tr>

          {/* Rating Row */}
          <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
              Rating
            </td>
            {products.map((product) => (
              <td
                key={product.productId}
                className="px-6 py-4 whitespace-nowrap text-sm"
              >
                <div className="flex">
                  {Array.from(Array(5).keys()).map((i) => (
                    <StarIcon
                      key={i}
                      height={16}
                      fill={
                        i < Math.floor(product.rating || 0)
                          ? '#fde047'
                          : '#94a3b8'
                      }
                    />
                  ))}
                </div>
              </td>
            ))}
          </tr>

          {/* Custom Attributes */}
          {attributes.map((attr) => (
            <tr key={attr}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                {attr.replace(/_/g, ' ')}
              </td>
              {products.map((product) => (
                <td
                  key={product.productId}
                  className="px-6 py-4 text-sm text-gray-700"
                >
                  {formatAttributeValue(product[attr])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatAttributeValue(value: any): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}
