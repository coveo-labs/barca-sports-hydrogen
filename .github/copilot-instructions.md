# Copilot Instructions for Barca Sports Hydrogen

This document provides comprehensive instructions for GitHub Copilot to understand and work effectively with the Barca Sports Hydrogen codebase.

## Project Overview

**Barca Sports Hydrogen** is a headless e-commerce storefront built with:

- **Shopify Hydrogen 2025.7.0** - Shopify's React-based framework for headless commerce
- **React Router 7.9.x** - Full-stack web framework (migrated from Remix)
- **Coveo Headless React** - Search and product discovery platform integration
- **Tailwind CSS 4.x** - Utility-first CSS framework
- **TypeScript** - Strict type checking enabled
- **Vite** - Build tool and development server
- **Oxygen** - Shopify's edge hosting platform

The store sells water sports equipment (kayaks, paddleboards, gear, etc.) and serves multiple markets (US, CA, GB).

## Architecture Overview

### Directory Structure

```
app/
├── components/        # React components organized by feature
│   ├── Cart/         # Shopping cart components
│   ├── Generative/   # AI-powered generative answering components
│   ├── Homepage/     # Homepage-specific components
│   ├── Products/     # Product display components
│   └── Search/       # Search, facets, product listing components
├── lib/              # Core utilities and configurations
│   ├── coveo.engine.ts        # Coveo commerce engine definition
│   ├── coveo.engine.server.ts # Server-side Coveo operations
│   ├── context.ts             # Hydrogen context creation
│   ├── fragments.ts           # GraphQL fragments
│   ├── i18n.ts                # Internationalization utilities
│   └── navigator.provider.ts  # Coveo analytics context providers
├── routes/           # File-based routing (React Router conventions)
├── styles/           # Global styles (Tailwind)
└── types/            # TypeScript type definitions
```

### Key Technologies Integration

#### Shopify Hydrogen

- Uses Shopify Storefront API for product data, cart management, and checkout
- GraphQL queries are co-located with route files or in `lib/fragments.ts`
- Generated types in `storefrontapi.generated.d.ts` and `customer-accountapi.generated.d.ts`
- Cart operations use `CartForm` component and actions

#### Coveo Headless Commerce

- Provides search, product listings (PLP), recommendations, and faceted navigation
- Uses SSR (Server-Side Rendering) commerce engine pattern
- Engine definitions in `lib/coveo.engine.ts`
- Server-side fetching in `lib/coveo.engine.server.ts`
- Context providers: `SearchProvider`, `ListingProvider`, `RecommendationProvider`, `StandaloneProvider`

#### React Router 7.9.x

- File-based routing in `app/routes/`
- Uses React Router's `loader` and `action` functions for data loading
- Route types generated in `.react-router/types/`
- Exports use `react-router` package, not `@remix-run/*`

## Coding Conventions

### TypeScript

- Strict mode enabled
- Use explicit return types for exported functions
- Prefer `type` over `interface` for type aliases
- Use path aliases: `~/` maps to `app/`

### React Components

- Use function components with hooks
- Export named components (not default exports for components)
- Use `React.FC` sparingly; prefer explicit prop types
- Co-locate component-specific styles with components

### Naming Conventions

- **Files**: PascalCase for components (`ProductCard.tsx`), camelCase for utilities (`coveo.engine.ts`)
- **Routes**: Use React Router 7 flat file conventions with locale prefix pattern `($locale).routename.tsx`
- **Components**: PascalCase (`ProductCard`, `CartMain`)
- **Hooks**: camelCase with `use` prefix from Coveo engine exports
- **Types**: PascalCase with descriptive suffixes (`ProductFragment`, `CartApiQueryFragment`)

### Imports

```typescript
// External packages first
import {useEffect, useState} from 'react';
import {useLoaderData, type LoaderFunctionArgs} from 'react-router';

// Shopify packages
import {Money, CartForm} from '@shopify/hydrogen';

// Coveo packages
import {useProductList} from '~/lib/coveo.engine';

// Internal imports (use ~ alias)
import {ProductCard} from '~/components/Products/ProductCard';
import type {RootLoader} from '~/root';
```

## Route Patterns

### Locale-Prefixed Routes

Routes support optional locale prefixes for i18n:

- `($locale)._index.tsx` → `/` or `/en-us/`
- `($locale).products.$handle.tsx` → `/products/kayak` or `/en-ca/products/kayak`
- `($locale).plp.$.tsx` → `/plp/water-sports/kayaks` (splat route for PLPs)

### Route Loader Pattern

```typescript
export async function loader({request, context}: LoaderFunctionArgs) {
  // Fetch critical data
  const criticalData = await loadCriticalData({request, context});

  // Return with proper typing
  return {...criticalData};
}
```

### Meta Function Pattern

```typescript
export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Hydrogen | ${data?.product.title ?? ''}`}];
};
```

## Coveo Integration Patterns

### Engine Types

The Coveo commerce engine has multiple definitions:

- `searchEngineDefinition` - For search pages
- `listingEngineDefinition` - For product listing pages (PLP)
- `recommendationEngineDefinition` - For product recommendations
- `standaloneEngineDefinition` - For components not triggering search (header search box, cart)

### Server-Side Static State

```typescript
// In loader
searchEngineDefinition.setNavigatorContextProvider(
  () => new ServerSideNavigatorContextProvider(request),
);

const staticState = await fetchStaticState({
  context,
  k: 'searchEngineDefinition',
  parameters,
  url: 'https://shop.barca.group',
  request,
});
```

### Client-Side Provider Usage

```typescript
<SearchProvider
  navigatorContext={new ClientSideNavigatorContextProvider()}
  staticState={staticState as SearchStaticState}
>
  {/* Search components */}
</SearchProvider>
```

### Using Coveo Hooks

```typescript
// Import from engine definition
import {useProductList, useFacetGenerator} from '~/lib/coveo.engine';

// Use in component
const productList = useProductList();
const facetGenerator = useFacetGenerator();
```

## Cart Integration

### Cart Form Actions

```typescript
<CartForm
  route="/cart"
  action={CartForm.ACTIONS.LinesAdd}
  inputs={{lines}}
>
  {/* Form content */}
</CartForm>
```

### Cart Action Handler

Located in `routes/($locale).cart.tsx`, handles:

- `CartForm.ACTIONS.LinesAdd`
- `CartForm.ACTIONS.LinesUpdate`
- `CartForm.ACTIONS.LinesRemove`
- `CartForm.ACTIONS.DiscountCodesUpdate`
- `CartForm.ACTIONS.GiftCardCodesUpdate`

### Syncing Shopify Cart with Coveo Cart

Use `mapShopifyCartToCoveoCart` to transform Shopify cart data for Coveo analytics.

## Analytics Integration

### Google Tag Manager (GTM)

- DataLayer events defined in `app/types/gtm.ts`
- GTM script in `public/scripts/google-tag-manager.js`
- Push events using `window.dataLayer.push()`

### Common GTM Events

```typescript
// View item list
window.dataLayer.push({
  event: 'view_item_list',
  ecommerce: {
    item_list_id: 'recommendations_headline',
    items: itemsArray,
  },
});

// Search event
window.dataLayer.push({
  event: 'search',
  search_type: 'search_box',
  search_term: query,
});
```

### Coveo Analytics

- Navigator context providers handle visitor tracking
- Cookie `coveo_visitorId` persists visitor ID across sessions
- Product clicks tracked via `interactiveProduct().select()`

## Internationalization (i18n)

### Supported Markets

Defined in `lib/i18n.ts`:

- US (USD, EN) - `/en-us/`
- CA (CAD, EN) - `/en-ca/`
- GB (GBP, EN) - `/en-gb/`

### Getting Locale

```typescript
import {getLocaleFromRequest} from '~/lib/i18n';

const {country, language, currency} = getLocaleFromRequest(request);
```

### Locale-Aware Navigation

Use `NavLinkWithLocale` component for links that respect current locale.

## Token Management

### Coveo Search Token

- Generated via `/token` route
- Stored in `coveo_accessToken` cookie
- Auto-refreshed when expired
- Uses `fetchToken()` utility

### Token Flow

1. Server-side: `updateTokenIfNeeded()` checks and refreshes token
2. Client-side: `fetchToken()` retrieves from `/token` endpoint
3. Token stored in httpOnly cookie for security

## Component Patterns

### Product Card

Standard pattern for displaying products from Coveo:

```typescript
<ProductCard
  product={product}
  onSelect={() => {
    const productWithId = createProductWithConsistentId(product);
    productList.methods?.interactiveProduct({
      options: {product: productWithId},
    }).select();
  }}
/>
```

### Search/Listing Pages

1. Wrap with appropriate provider (`SearchProvider` or `ListingProvider`)
2. Include `ParameterManager` for URL sync
3. Use shared components: `Facets`, `ProductList`, `Pagination`, `Sorts`

### Recommendations

```typescript
<RecommendationProvider
  navigatorContext={new ClientSideNavigatorContextProvider()}
  staticState={recommendationStaticState}
>
  <Recommendations />
</RecommendationProvider>
```

## GraphQL Patterns

### Query Definition

```typescript
const PRODUCT_QUERY = `#graphql
  query Product($handle: String!, $selectedOptions: [SelectedOptionInput!]!) {
    product(handle: $handle) {
      id
      title
      ...ProductFragment
    }
  }
  ${PRODUCT_FRAGMENT}
`;
```

### Query Execution

```typescript
const {product} = await context.storefront.query(PRODUCT_QUERY, {
  variables: {handle, selectedOptions},
});
```

## Styling Guidelines

### Tailwind CSS

- Use Tailwind utility classes directly in JSX
- Configuration in `tailwind.config.ts`
- Custom styles in `app/styles/tailwind.css`
- Uses Tailwind CSS v4 with `@tailwindcss/vite` plugin

### Utility Function for Conditional Classes

```typescript
import cx from '~/lib/cx';

className={cx(
  'base-class',
  isActive && 'active-class',
  hasError ? 'error-class' : 'normal-class'
)}
```

### HeadlessUI Components

Used extensively for interactive UI:

- `Dialog`, `Popover`, `Menu` for overlays
- `Tab`, `TabGroup` for tabbed interfaces
- `Combobox` for search autocomplete

## Testing Considerations

### Type Checking

```bash
npm run typecheck  # Runs tsc --noEmit
```

### Linting

```bash
npm run lint  # ESLint with React/TypeScript rules
```

### Development

```bash
npm run dev  # Starts Hydrogen dev server with HMR
```

## Common Pitfalls to Avoid

1. **Don't import from `@remix-run/*`** - Use `react-router` instead (post-migration)
2. **Don't forget navigator context** - Coveo requires proper navigator context for analytics
3. **Don't skip token refresh** - Always call `updateTokenIfNeeded()` before Coveo API calls on server
4. **Don't use default exports** for components - Use named exports
5. **Don't hardcode locale** - Use `getLocaleFromRequest()` or route params
6. **Don't forget to clear GTM ecommerce** - Push `{ecommerce: null}` before new ecommerce events

## Environment Variables

Required environment variables (set in `.env` or Oxygen):

- `SESSION_SECRET` - Session encryption key
- `PUBLIC_STORE_DOMAIN` - Shopify store domain
- `PUBLIC_STOREFRONT_API_TOKEN` - Storefront API access token
- `PUBLIC_STOREFRONT_ID` - Storefront ID for analytics
- `PUBLIC_CHECKOUT_DOMAIN` - Checkout domain
- `COVEO_API_KEY` - Coveo API key for token generation

## Deployment

Deployed to Shopify Oxygen via GitHub Actions:

- Workflow: `.github/workflows/oxygen-deployment-*.yml`
- Build command: `npm run build` (runs `shopify hydrogen build --codegen`)
- Preview command: `npm run preview`

## Additional Resources

- [Hydrogen Documentation](https://shopify.dev/docs/custom-storefronts/hydrogen)
- [React Router Documentation](https://reactrouter.com/)
- [Coveo Headless Documentation](https://docs.coveo.com/en/headless/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
