import type {
  CartLine,
  ComponentizableCartLine,
} from '@shopify/hydrogen/storefront-api-types';

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
