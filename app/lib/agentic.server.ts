// Server-side helper for streaming Coveo Agentic conversations

const AGENTIC_BASE_URL =
  'https://platformdev.cloud.coveo.com/rest/organizations/barcasportsmcy01fvu/commerce/unstable/agentic';

type StreamAgenticConversationOptions = {
  signal?: AbortSignal;
  accessToken?: string | null;
};

export async function streamAgenticConversation(
  payload: unknown,
  options: StreamAgenticConversationOptions = {},
): Promise<Response> {
  const accessToken = pickAccessToken(options.accessToken);
  
  const url = new URL(`${AGENTIC_BASE_URL}/converse`);

  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: options.signal,
  });
}

function pickAccessToken(candidate?: string | null) {
  const trimmedCandidate = candidate?.trim();
  if (trimmedCandidate) {
    return trimmedCandidate;
  }

  const resolved = resolveAgenticAccessToken();
  if (resolved) {
    return resolved;
  }

  throw new Error(
    'Missing AGENTIC_ACCESS_TOKEN environment variable for Agentic API access.',
  );
}

function resolveAgenticAccessToken() {
  if (typeof process !== 'undefined' && process?.env?.AGENTIC_ACCESS_TOKEN) {
    return process.env.AGENTIC_ACCESS_TOKEN;
  }

  return undefined;
}
