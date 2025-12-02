import {engineConfig} from '~/lib/coveo.engine';
import {getOrganizationEndpoint} from '@coveo/headless-react/ssr-commerce';
import type {AppLoadContext, LoaderFunctionArgs} from '@remix-run/node';
import {isTokenExpired, decodeBase64Url} from '~/lib/token-utils.server';
import {accessTokenCookie} from '~/lib/cookies.server';

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

  const newToken = await fetchToken(context);

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

export const fetchToken = async (context: AppLoadContext): Promise<string> => {
  // This example focuses on demonstrating the Coveo search token authentication flow in an SSR scenario. For the sake
  // of simplicity, it only generates anonymous search tokens.
  //
  // If you use search token authentication in a real-world scenario, you will likely want to generate tokens for
  // authenticated users.
  //
  // The specific implementation details for this use case will vary based on the requirements of your application and
  // the way it handles user authentication.
  //
  // For the list of possible request body properties, see https://docs.coveo.com/en/56#request-body-properties
  //
  // Lastly, you will want to safely store the API key used to generate tokens.
  // For example, you could set it through your Hydrogen Storefront settings.
  // See https://shopify.dev/docs/storefronts/headless/hydrogen/environments#environment-variables

  const organizationEndpoint = getOrganizationEndpoint(
    engineConfig.configuration.organizationId,
  );

  const response = await fetch(`${organizationEndpoint}/rest/search/v2/token`, {
    method: 'POST',
    body: JSON.stringify({
      userIds: [
        {
          name: 'anonymous',
          type: 'User',
          provider: 'Email Security Provider',
          infos: {},
          authCookie: '',
        },
      ],
    }),
    headers: {
      Authorization: `Bearer ${context.env.COVEO_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error('Error:', response.statusText);
    throw new Error('Failed to fetch access token from Coveo Search API');
  }

  const responseData = (await response.json()) as {token: string};
  return responseData.token;
};

