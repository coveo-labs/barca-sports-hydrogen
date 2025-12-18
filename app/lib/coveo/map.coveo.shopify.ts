import type {
  CartLine,
  ComponentizableCartLine,
} from '@shopify/hydrogen/storefront-api-types';
import type {Product} from '@coveo/headless-react/ssr-commerce';

export function mapShopifyMerchandiseToCoveoCartItem(
  node: CartLine | ComponentizableCartLine,
) {
  const {merchandise} = node;
  const selectedColor = merchandise.selectedOptions.find(
    (opt) => opt.name === 'Color',
  );
  return {
    productId: merchandise.id, // UNI-1358
    name: merchandise.product.title,
    price: Number(merchandise.price.amount),
    quantity: node.quantity,
  };
}

/**
 * Constructs a GTM item with consistent product ID
 */
export function createGTMItemFromProduct(
  product: Product,
  index: number,
): {
  item_id: string;
  item_name: string;
  index: number;
  price: number;
  quantity: number;
} {
  // UNI-1358: Use ec_product_id for consistent product IDs across events
  return {
    item_id: product.ec_product_id || '',
    item_name: product.ec_name || '',
    index,
    price: product.ec_price || 0,
    quantity: 1,
  };
}

export function colorToShorthand(color: string) {
  const colorMap: {[key: string]: string} = {
    'birchwood brown': 'BB',
    black: 'BK',
    blue: 'BL',
    brown: 'BR',
    clear: 'CL',
    cyan: 'CY',
    'deep red': 'DR',
    'forest green': 'FG',
    gray: 'GY',
    green: 'GN',
    grey: 'GY',
    khaki: 'KH',
    lime: 'LM',
    'multi color': 'MC',
    'multi-colored': 'MC',
    natural: 'NT',
    navy: 'NY',
    'olive green': 'OG',
    olive: 'OL',
    one: '01',
    orange: 'OR',
    pink: 'PK',
    purple: 'PL',
    red: 'RD',
    'rustic yellow': 'RY',
    silver: 'SV',
    'sky blue': 'SB',
    white: 'WH',
    yellow: 'YL',
    beige: 'BG',
    gold: 'GD',
    striped: 'ST',
    neon: 'NE',
    pastel: 'PS',
    tan: 'TN',
  };

  return colorMap[color.toLowerCase() as keyof typeof colorMap] || 'BK';
}
