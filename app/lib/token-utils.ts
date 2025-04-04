
import { parse } from 'cookie';

function decodeBase64Url(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  return atob(base64);
}

export function isTokenExpired(token: string): boolean {
    if (isApiKey(token)) {
        return false;
    }

  try {
    const [, payload] = token.split('.');
    const decodedPayload = JSON.parse(decodeBase64Url(payload)) as { exp: number };
    return decodedPayload.exp * 1000 < Date.now();
  } catch {
    return true; // Treat invalid tokens as expired
  }
}

function isApiKey(token?: string) {
  if (!token) {
    return false;
  }

  return /^xx[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    token
  );
}

export function extractAccessTokenFromCookie(request: Request): string | null {
  const cookies = parse(request.headers.get('Cookie') ?? '');
  return cookies['coveo_accessToken'];
}