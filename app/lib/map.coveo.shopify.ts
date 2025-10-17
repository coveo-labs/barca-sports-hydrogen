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
    productId: `${merchandise.product.handle.toUpperCase()}_${colorToShorthand(
      selectedColor?.value || '',
    )}`,
    name: merchandise.product.title,
    price: Number(merchandise.price.amount),
    quantity: node.quantity,
  };
}

/**
 * Constructs a consistent product ID from a Coveo product object
 * by extracting the handle from clickUri and combining with color shorthand
 */
export function constructConsistentProductId(product: Product): string {
  const productHandle = new URL(product.clickUri).pathname.split('/').pop();
  const productColor = product.ec_color || 'Black';
  const consistentId = `${productHandle?.toUpperCase()}_${colorToShorthand(
    productColor,
  )}`;

  // Debug logging to verify ID consistency
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('🔍 Product ID Conversion:', {
      originalId: product.permanentid,
      handle: productHandle,
      color: productColor,
      consistentId,
    });
  }

  return consistentId;
}

/**
 * Creates a product object with consistent product ID for click tracking
 */
export function createProductWithConsistentId(product: Product): Product {
  return {
    ...product,
    ec_product_id: constructConsistentProductId(product),
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
  const consistentId = constructConsistentProductId(product);

  // Debug logging for GTM events
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('📊 GTM Item Created:', {
      originalId: product.permanentid,
      gtmItemId: consistentId,
      productName: product.ec_name,
    });
  }

  return {
    item_id: consistentId,
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
