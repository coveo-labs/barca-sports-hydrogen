import type {VercelRequest, VercelResponse} from '@vercel/node';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    // Dynamically import to avoid build-time issues
    const {storefrontRedirect} = await import('@shopify/hydrogen');
    const {createRequestHandler} = await import('react-router');
    const {createHydrogenRouterContext} = await import(
      '../app/lib/shopify/context'
    );

    // Convert Vercel request to Web Request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const url = `${protocol}://${host}${req.url}`;
    
    const request = new Request(url, {
      method: req.method || 'GET',
      headers: req.headers as HeadersInit,
      body:
        req.method !== 'GET' && req.method !== 'HEAD' && req.body
          ? JSON.stringify(req.body)
          : undefined,
    });

    // Create execution context
    const executionContext = {
      waitUntil: (promise: Promise<any>) => {
        promise.catch((err) => console.error('waitUntil error:', err));
      },
      passThroughOnException: () => {},
    };

    const env = process.env as unknown as Env;

    const hydrogenContext = await createHydrogenRouterContext(
      request,
      env,
      executionContext as ExecutionContext,
    );

    // Import server build
    const build = await import('../build/server/index.js');

    const handleRequest = createRequestHandler({
      build,
      mode: process.env.NODE_ENV || 'production',
      getLoadContext: () => hydrogenContext,
    });

    let response = await handleRequest(request);

    if (hydrogenContext.session.isPending) {
      response.headers.set(
        'Set-Cookie',
        await hydrogenContext.session.commit(),
      );
    }

    if (response.status === 404) {
      response = await storefrontRedirect({
        request,
        response,
        storefront: hydrogenContext.storefront,
      });
    }

    // Convert Web Response to Vercel Response
    res.status(response.status);
    
    // Copy headers
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Handle response body
    if (response.body) {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks);
      return res.send(buffer);
    }

    return res.send('');
  } catch (error: any) {
    console.error('Handler error:', error);
    console.error('Stack:', error?.stack);
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
    });
  }
}
