type TokenResponse = {
  token: string;
};

export const fetchToken = async (request: Request, apiKeyAuthentication = false) => {
  const baseUrl = request && request.url ? new URL(request.url).origin : '';
  console.log('baseUrl', baseUrl);

  if (apiKeyAuthentication) {
    return 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a'; // demo API key
  }

  const fetchWithRetry = async (retries: number, delay: number): Promise<TokenResponse> => {
    try {
      const response = await fetch(`${baseUrl}/token`);
      if (!response.ok) {
        throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
      }
      const data = await response.json() as TokenResponse;
      return data;
    } catch (error) {
      if (retries > 0) {
        console.warn(`Retrying fetchToken... (${retries} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, delay)); // Add delay before retrying
        return fetchWithRetry(retries - 1, delay);
      }
      console.error('Failed to fetch token after retries:', error);
      throw error;
    }
  };

  const tokenResponse = await fetchWithRetry(3, 1000); // Retry up to 3 times with a 1-second delay
  return tokenResponse.token;
};