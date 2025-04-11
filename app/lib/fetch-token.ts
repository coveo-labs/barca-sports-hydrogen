type TokenResponse = {
  token: string;
};

export const fetchToken = async (apiKeyAuthentication = true) => {
  return apiKeyAuthentication
    ? 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a' // demo api key
    : ((await (await fetch('../../token')).json()) as TokenResponse).token;
};
