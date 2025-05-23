import {engineDefinition} from './coveo.engine';
import {fetchToken} from '~/lib/fetch-token';
import {accessTokenCookie} from './cookies.server';

export function decodeBase64Url(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

export function isTokenExpired(token: string): boolean {
  if (isApiKey(token)) {
    return false;
  }

  try {
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(decodeBase64Url(payload)) as {
      exp: number;
    };
    return decodedPayload.exp * 1000 < Date.now();
  } catch {
    return true; // Treat invalid tokens as expired
  }
}

function isApiKey(token: string) {
  return /^xx[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    token,
  );
}

export async function updateTokenIfNeeded(
  engineType:
    | 'listingEngineDefinition'
    | 'searchEngineDefinition'
    | 'standaloneEngineDefinition'
    | 'recommendationEngineDefinition',
  request: Request,
) {
  if (isTokenExpired(engineDefinition[engineType].getAccessToken())) {
    const accessTokenCookieValue = await accessTokenCookie.parse(
      request.headers.get('Cookie'),
    );
    const accessToken =
      accessTokenCookieValue && !isTokenExpired(accessTokenCookieValue)
        ? accessTokenCookieValue
        : await fetchToken(request);

    engineDefinition[engineType].setAccessToken(accessToken);
  }
}
