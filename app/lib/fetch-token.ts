type TokenResponse = {
  token: string;
};

export const fetchToken = async (request?: null|Request, apiKeyAuthentication = false) => {
  const baseUrl = request && request.url ? new URL(request.url).origin : '';

  if (apiKeyAuthentication) {
    return 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a'; // demo API key
  }

  console.log ('fetching token from', `${baseUrl}/token`);
  console.log('with headers', request?.headers.get('Cookie'));
  const response = await fetch(`${baseUrl}/token`);
  if (!response.ok) {
    throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
  }
  const data = await response.json() as TokenResponse;
  return data.token;
};