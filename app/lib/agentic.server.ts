// Server-side helper for streaming Coveo Agentic conversations

const AGENTIC_BASE_URL =
  'http://localhost:8100/rest/organizations/barcasportsmcy01fvu/commerce/unstable/agentic';
const AGENTIC_ACCESS_TOKEN =
  'xa2500977-a13a-4d67-9b40-a1ef8fbef93b';

export async function streamAgenticConversation(
  payload: unknown,
  options: {signal?: AbortSignal} = {},
): Promise<Response> {
  const url = new URL(`${AGENTIC_BASE_URL}/converse`);
  url.searchParams.set('access_token', AGENTIC_ACCESS_TOKEN);

  return fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });
}
