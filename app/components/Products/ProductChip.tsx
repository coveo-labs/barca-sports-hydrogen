import {NavLink} from 'react-router';
import type {Product} from '@coveo/headless-react/ssr-commerce';

interface ProductChipProps {
  product: Product;
}

export function ProductChip({product}: ProductChipProps) {
  const productLink = new URL(product.clickUri).pathname;
  const productName = (product.additionalFields?.ec_item_group_name ||
    product.ec_name ||
    '') as string;
  const productImage = product.ec_images?.[0] || '';

  return (
    <NavLink
      to={productLink}
      className="inline-flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-white border border-gray-300 hover:bg-gray-50 hover:border-indigo-400 hover:shadow-sm transition-all"
      style={{width: '180px', height: '62px'}}
    >
      {/* Product image circle */}
      <div className="flex-shrink-0">
        <img
          src={productImage}
          alt={productName}
          className="w-10 h-10 rounded-full object-cover border border-gray-200"
        />
      </div>
      
      {/* Text content */}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-xs text-gray-500 font-medium">Product</span>
        <span className="text-sm text-gray-900 font-medium truncate">
          {productName}
        </span>
      </div>
    </NavLink>
  );
}
