import {useNonce, getShopAnalytics, Analytics, Script} from '@shopify/hydrogen';
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
  useRouteLoaderData,
  type LoaderFunctionArgs,
  type ShouldRevalidateFunction,
} from 'react-router';
import favicon from '~/assets/favicon.ico';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from '~/components/PageLayout';
import {FOOTER_QUERY, GET_CUSTOMER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import {engineDefinition} from './lib/coveo.engine';
import {fetchStaticState} from './lib/coveo.engine.server';
import {
  ClientSideNavigatorContextProvider,
  ServerSideNavigatorContextProvider,
} from './lib/navigator.provider';
import {StandaloneProvider} from './components/Search/Context';
import {GlobalLoading} from './components/ProgressBar';
import {getLocaleFromRequest} from './lib/i18n';
import {getCookieFromRequest} from './lib/session';
import type {Route} from './+types/root';
export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export async function loader(args: LoaderFunctionArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  const {country, currency, language} = getLocaleFromRequest(args.request);

  args.context.customerAccount.getBuyer().then((buyer) => {
    args.context.cart.updateBuyerIdentity({
      customerAccessToken: buyer.customerAccessToken,
    });
  });

  const alreadyHasCookie = getCookieFromRequest(
    args.request,
    'coveo_visitorId',
  );

  return data(
    {
      ...deferredData,
      ...criticalData,
      locale: {
        country,
        currency,
        language,
      },
      publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
      shop: getShopAnalytics({
        storefront,
        publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
      }),
      consent: {
        checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN,
        storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
        withPrivacyBanner: false,
        country,
        language,
      },
    },
    {
      headers: alreadyHasCookie
        ? {}
        : {
            'Set-Cookie': criticalData.coveoVisitorIdHeader,
          },
    },
  );
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront, customerAccount, cart} = context;

  const loggedIn = await customerAccount.isLoggedIn();

  const coveoNavigatorProvider = new ServerSideNavigatorContextProvider(
    request,
  );

  const coveoVisitorIdHeader = coveoNavigatorProvider.getCookieHeader(
    coveoNavigatorProvider.clientId,
  );

  engineDefinition.standaloneEngineDefinition.setNavigatorContextProvider(
    () => coveoNavigatorProvider,
  );

  const [header, customer, staticStateStandalone] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'coveo-shopify-menu',
      },
    }),
    loggedIn
      ? context.customerAccount.query<{
          customer: {
            firstName: string;
            imageUrl: string;
          };
        }>(GET_CUSTOMER_QUERY)
      : null,
    fetchStaticState({
      context,
      k: 'standaloneEngineDefinition',
      url: 'https://shop.barca.group',
      request,
      parameters: {
        q: '',
      },
    }),
  ]);

  return {
    header,
    staticStateStandalone,
    loggedIn,
    customerDisplayName: customer?.data.customer.firstName || '',
    customerImageUrl: customer?.data.customer.imageUrl || '',
    coveoVisitorIdHeader,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: LoaderFunctionArgs) {
  const {storefront, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    cart: cart.get(),
    footer,
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="stylesheet" href={tailwindCss}></link>
        <Meta />
        <Links />
        <Script waitForHydration src="/scripts/google-tag-manager.js" />
      </head>
      <body>
        {data ? (
          <Analytics.Provider
            cart={data.cart}
            shop={data.shop}
            consent={data.consent}
          >
            <StandaloneProvider
              navigatorContext={new ClientSideNavigatorContextProvider()}
              staticState={data.staticStateStandalone as any}
            >
              <PageLayout
                {...data}
                key={`${data.locale.language}-${data.locale.country}`}
              >
                {children}
              </PageLayout>
            </StandaloneProvider>
          </Analytics.Provider>
        ) : (
          children
        )}
        <GlobalLoading />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}
