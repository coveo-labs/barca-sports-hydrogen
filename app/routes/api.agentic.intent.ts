import type {LoaderFunctionArgs} from 'react-router';
import {fetchAgentic} from '~/lib/agentic.server';

export async function loader({request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return Response.json({intent: 'SEARCH'}, {status: 400});
  }

  try {
    const data = await fetchAgentic<{intent: string}>('intent', {query});
    return Response.json(data);
  } catch (error) {
    console.error('Error checking intent:', error);
    return Response.json({intent: 'SEARCH'}, {status: 500});
  }
}
