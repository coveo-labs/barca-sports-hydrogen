import type {VercelRequest, VercelResponse} from '@vercel/node';
import {storefrontRedirect} from '@shopify/hydrogen';
import {createRequestHandler} from 'react-router';
import {createHydrogenRouterContext} from '../app/lib/shopify/context';

// Use Node.js runtime for full compatibility
export const config = {
  runtime: 'nodejs',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // Convert Vercel request to Web Request
    const url = `https://${req.headers.host}${req.url}`;
    const request = new Request(url, {
      method: req.method,
      headers: new Headers(req.headers as Record<string, string>),
      body:
        req.method !== 'GET' && req.method !== 'HEAD'
          ? JSON.stringify(req.body)
          : undefined,
    });

    // Create execution context for Vercel
    const executionContext = {
      waitUntil: (promise: Promise<any>) => {
        // Vercel doesn't need waitUntil for serverless functions
        promise.catch(console.error);
      },
      passThroughOnException: () => {},
    };

    // Get environment variables
    const env = process.env as unknown as Env;

    const hydrogenContext = await createHydrogenRouterContext(
      request,
      env,
      executionContext as ExecutionContext,
    );

    // Import the server build
    // @ts-ignore - Build output
    const build = await import('../build/server/index.js');

    const handleRequest = createRequestHandler({
      build,
      mode: process.env.NODE_ENV,
      getLoadContext: () => hydrogenContext,
    });

    const response = await handleRequest(request);

    if (hydrogenContext.session.isPending) {
      response.headers.set(
        'Set-Cookie',
        await hydrogenContext.session.commit(),
      );
    }

    if (response.status === 404) {
      const redirectResponse = await storefrontRedirect({
        request,
        response,
        storefront: hydrogenContext.storefront,
      });
      
      // Convert Web Response to Vercel Response
      res.status(redirectResponse.status);
      redirectResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });
      const text = await redirectResponse.text();
      return res.send(text);
    }

    // Convert Web Response to Vercel Response
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const text = await response.text();
    return res.send(text);
  } catch (error) {
    console.error(error);
    return res.status(500).send('An unexpected error occurred');
  }
}
