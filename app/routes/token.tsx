import type {LoaderFunctionArgs} from 'react-router';
import {isTokenExpired, decodeBase64Url} from '~/lib/auth/token-utils.server';
import {accessTokenCookie} from '~/lib/auth/cookies.server';

declare global {
  interface Env {
    COVEO_API_KEY: string;
  }
}

interface ParsedToken {
  exp: number;
}

export const loader = async ({request, context}: LoaderFunctionArgs) => {
  // In an SSR scenario, we recommend storing the search token in a cookie to minimize the number of network requests.
  // This is not mandatory, but it can help improve the performance of your application.
  const accessTokenCookieValue = await accessTokenCookie.parse(
    request.headers.get('Cookie'),
  );

  if (accessTokenCookie && !isTokenExpired(accessTokenCookieValue)) {
    return new Response(JSON.stringify({token: accessTokenCookieValue}), {
      headers: {'Content-Type': 'application/json'},
    });
  }

  const newToken = await fetchTokenFromAppProxy();

  const parsedToken = JSON.parse(
    decodeBase64Url(newToken.split('.')[1]),
  ) as ParsedToken;
  const maxAge = parsedToken.exp * 1000 - Date.now();

  return new Response(JSON.stringify({token: newToken}), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': await accessTokenCookie.serialize(newToken, {
        maxAge: Math.floor(maxAge / 1000),
      }),
    },
  });
};

async function fetchTokenFromAppProxy(): Promise<string> {
  // If you've installed the [Coveo app for Shopify](https://docs.coveo.com/en/p2la0421), it includes
  // an [app proxy](https://shopify.dev/docs/api/shopify-app-remix/v2/authenticate/public/app-proxy)
  // that you can use to generate anonymous search tokens.

  // In a real application, you would most likely retrieve the `marketId` dynamically. Details will
  // vary depending on your setup.
  // The `marketId` doesn't affect the generated token. But, if you've used the Coveo app for Shopify
  // to set up your Coveo organization, the app proxy will return the `trackingId` value associated with the
  // target market. You can use it to facilitate setting the correct Headless engine `context.analytics.trackingId`
  // value. We do not do this in this sample project, since it was not configured with the Coveo app for Shopify.
  const marketId = '88728731922';
  const response = await fetch(
    `https://barca-sports.myshopify.com/apps/coveo?marketId=${marketId}`,
  );

  if (!response.ok) {
    throw new Error('Failed to fetch token from app proxy');
  }

  const data = (await response.json()) as {accessToken: string};
  return data.accessToken;
}
