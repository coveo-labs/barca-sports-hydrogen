// Server-side utilities for Coveo Agentic API calls

const AGENTIC_BASE_URL =
  'http://localhost:8100/rest/organizations/barcasportsmcy01fvu/commerce/unstable/agentic';
const AGENTIC_ACCESS_TOKEN =
  'x82dbbeb7-ca54-4304-a6d7-1e0524086968';

/**
 * Build a URL for a Coveo Agentic API endpoint
 * @param endpoint - The endpoint path (e.g., 'intent', 'suggestions')
 * @param params - Query parameters to append to the URL
 */
export function buildAgenticUrl(
  endpoint: string,
  params: Record<string, string> = {},
): string {
  const url = new URL(`${AGENTIC_BASE_URL}/${endpoint}`);
  url.searchParams.set('access_token', AGENTIC_ACCESS_TOKEN);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

/**
 * Make a GET request to a Coveo Agentic API endpoint
 * @param endpoint - The endpoint path (e.g., 'intent', 'suggestions')
 * @param params - Query parameters to append to the URL
 */
export async function fetchAgentic<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = buildAgenticUrl(endpoint, params);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Agentic API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Make a POST request to a Coveo Agentic API endpoint
 */
export async function postAgentic<T>(
  endpoint: string,
  payload: unknown,
): Promise<T> {
  const url = `${AGENTIC_BASE_URL}/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AGENTIC_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Agentic API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Make a POST request to a Coveo Agentic endpoint and return raw text.
 */
export async function postAgenticText(
  endpoint: string,
  payload: unknown,
): Promise<string> {
  const url = `${AGENTIC_BASE_URL}/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AGENTIC_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Agentic API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}

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
