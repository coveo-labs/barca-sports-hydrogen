type TokenResponse = {
  token: string;
};

export const fetchToken = async (request?: Request) => {
  const baseUrl = request && request.url ? new URL(request.url).origin : '';
  const headersToRelay = extractCookiesFromRequest(request);
  const sapiResponse = await fetch(`${baseUrl}/token`, { headers: headersToRelay });
  if (!sapiResponse.ok) {
    throw new Error(`Failed to fetch token: ${sapiResponse.status} ${sapiResponse.statusText}`);
  }
  return ((await sapiResponse.json()) as TokenResponse).token;
};

const extractCookiesFromRequest = (request?: Request) => {
  const headers = new Headers();

  const cookieHeader = request && request.headers && request.headers.get('Cookie');
  if (cookieHeader) {
    headers.set('Cookie', cookieHeader);
  }
  return headers;
}