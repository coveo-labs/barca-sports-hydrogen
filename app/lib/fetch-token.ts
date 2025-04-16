type TokenResponse = {
  token: string;
};

export const fetchToken = async (request: Request, apiKeyAuthentication = false) => {
  const baseUrl = request && request.url ? new URL(request.url).origin : '';
  console.log('baseUrl', baseUrl);

  return apiKeyAuthentication
    ? 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a' // demo api key
    : ((await (await fetch(`${baseUrl}/token`)).json()) as TokenResponse).token;
};
