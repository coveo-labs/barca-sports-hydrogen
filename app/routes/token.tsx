import { engineConfig } from '~/lib/coveo.engine';
import { getOrganizationEndpoint } from '@coveo/headless-react/ssr-commerce';
import { AppLoadContext, LoaderFunctionArgs } from '@remix-run/node';

declare global {
  interface Env {
    COVEO_API_KEY: string;
  }
}

import { parse, serialize } from 'cookie';
import { isTokenExpired } from '~/lib/token-utils';

export const loader = async ({ request, context }: LoaderFunctionArgs) => {

  // In an SSR scenario, we recommend storing the search token in a cookie to minimize the number of network requests.
  // This is not mandatory, but it can help improve the performance of your application.
  const cookies = parse(request.headers.get('Cookie') ?? '');
  const accessTokenCookie = cookies['coveo_accessToken'];

  if (accessTokenCookie && !isTokenExpired(accessTokenCookie)) {
    return new Response(
      JSON.stringify({ token: accessTokenCookie }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  // const newToken = await fetchTokenFromSAPI(context);
  const newToken = await fetchTokenFromAppProxy();

  const cookie = serialize('coveo_accessToken', newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
    path: '/',
  });

  return new Response(JSON.stringify({ token: newToken }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
};

async function fetchTokenFromSAPI(context: AppLoadContext): Promise<string> {
  const organizationEndpoint = getOrganizationEndpoint(engineConfig.configuration.organizationId);

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
    throw new Error('Failed to fetch access token from Coveo Search API');
  }

  const responseData = (await response.json()) as { token: string };
  return responseData.token;
}

async function fetchTokenFromAppProxy(): Promise<string> {
  // If you've installed the [Coveo app for Shopify](https://docs.coveo.com/en/p2la0421), it includes
  // an [app proxy](https://shopify.dev/docs/api/shopify-app-remix/v2/authenticate/public/app-proxy)
  // that you can use to generate anonymous search tokens.

  // You need to pass a `marketId` query parameter to the app proxy URL, but it's not relevant in the
  // context of Hydrogen.
  const response = await fetch('https://barca-sports.myshopify.com/apps/coveo?marketId=1');

  if (!response.ok) {
    throw new Error('Failed to fetch token from app proxy');
  }

  const data = (await response.json()) as { accessToken: string };
  return data.accessToken;
}