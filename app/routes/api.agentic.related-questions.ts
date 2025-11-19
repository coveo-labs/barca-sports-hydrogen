import type {LoaderFunctionArgs} from 'react-router';
import {fetchAgentic} from '~/lib/agentic.server';

export interface RelatedQuestionsResponse {
  suggestedQueries: string[];
}

export async function loader({request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return Response.json(
      {
        suggestedQueries: [],
      } satisfies RelatedQuestionsResponse,
      {status: 400},
    );
  }

  try {
    const data = await fetchAgentic<RelatedQuestionsResponse>(
      'related-questions',
      {
        query,
      },
    );
    return Response.json(data);
  } catch (error) {
    console.error('Error fetching related questions:', error);
    return Response.json(
      {
        suggestedQueries: [],
      } satisfies RelatedQuestionsResponse,
      {status: 500},
    );
  }
}
