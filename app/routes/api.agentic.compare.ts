import type {ActionFunctionArgs} from 'react-router';
import {postAgenticText} from '~/lib/agentic.server';

const DEFAULT_PRODUCT_IDENTIFIERS = ['SP04948_00003', 'SP04948_00004'];

export async function action({request}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(null, {
      status: 405,
      headers: {Allow: 'POST'},
    });
  }

  let productIdentifiers = [...DEFAULT_PRODUCT_IDENTIFIERS];

  try {
    const payload = await request.json();

    if (Array.isArray(payload)) {
      const maybeIdentifiers = payload.filter(
        (identifier): identifier is string => typeof identifier === 'string',
      );
      if (maybeIdentifiers.length > 0) {
        productIdentifiers = maybeIdentifiers;
      }
    } else if (
      typeof payload === 'object' &&
      payload !== null &&
      Array.isArray((payload as {products?: unknown}).products)
    ) {
      const maybeProducts = (payload as {products: unknown[]}).products.filter(
        (identifier): identifier is string => typeof identifier === 'string',
      );
      if (maybeProducts.length > 0) {
        productIdentifiers = maybeProducts;
      }
    }
  } catch (error) {
    console.warn('Invalid payload for agentic compare, using defaults.', error);
  }

  try {
    const html = await postAgenticText('compare', productIdentifiers);

    if (typeof html !== 'string' || html.trim().length === 0) {
      return Response.json(
        {message: 'Compare response did not contain HTML.'},
        {status: 502},
      );
    }

  return Response.json({html});
  } catch (error) {
    console.error('Error executing agentic compare request:', error);
    return Response.json(
      {message: 'Failed to execute agentic compare.'},
      {status: 500},
    );
  }
}
