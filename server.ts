// Virtual entry point for the app
import {storefrontRedirect} from '@shopify/hydrogen';
import {createRequestHandler} from 'react-router';
import {createHydrogenRouterContext} from '~/lib/shopify/context';

/**
 * Export a fetch handler for Vercel Edge Functions.
 */
export default async function handler(
  request: Request,
  context: {waitUntil: (promise: Promise<any>) => void},
): Promise<Response> {
  try {
    // Map Vercel context to execution context
    const executionContext = {
      waitUntil: context.waitUntil,
      passThroughOnException: () => {},
    };

    // Get environment variables from process.env for Vercel
    const env = process.env as unknown as Env;

    const hydrogenContext = await createHydrogenRouterContext(
      request,
      env,
      executionContext as ExecutionContext,
    );

      /**
       * Create a React Router request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        // @ts-ignore - Virtual module
        build: await import('virtual:react-router/server-build'),
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
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({
          request,
          response,
          storefront: hydrogenContext.storefront,
        });
      }

      return response;
    } catch (error) {
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
}
