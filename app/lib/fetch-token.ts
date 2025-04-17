type TokenResponse = {
  token: string;
};

export const fetchToken = async (request?: null | Request, apiKeyAuthentication = false) => {
  if (apiKeyAuthentication) {
    return 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a'; // demo API key
  }

  const baseUrl = request && request.url ? new URL(request.url).origin : '';
  const headersToRelay = extractCookiesFromRequest(request);
  const sapiResponse = await fetch(`${baseUrl}/token`, { headers: headersToRelay });
  if (!sapiResponse.ok) {
    throw new Error(`Failed to fetch token: ${sapiResponse.status} ${sapiResponse.statusText}`);
  }
  return ((await sapiResponse.json()) as TokenResponse).token;
};

const extractCookiesFromRequest = (request: Request | null | undefined) => {
  const headers = new Headers();

  const cookieHeader = request && request.headers && request.headers.get('Cookie');
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }
  return headers;
}