import type {LoaderFunctionArgs} from 'react-router';
import {fetchAgentic} from '~/lib/agentic.server';

export interface QueryUnderstandingResponse {
  categories: string[];
  attributes: Record<string, string>;
  keywords: string[];
}

export async function loader({request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return Response.json(
      {
        categories: [],
        attributes: {},
        keywords: [],
      } satisfies QueryUnderstandingResponse,
      {status: 400},
    );
  }

  try {
    const data = await fetchAgentic<QueryUnderstandingResponse>('understand', {
      query,
    });
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching query understanding:', error);
    return Response.json(
      {
        categories: [],
        attributes: {},
        keywords: [],
      } satisfies QueryUnderstandingResponse,
      {status: 500},
    );
  }
}
