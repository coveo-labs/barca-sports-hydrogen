# Barca Sports Hydrogen

A headless commerce storefront built with [Shopify Hydrogen](https://shopify.dev/custom-storefronts/hydrogen) featuring a generative AI shopping assistant powered by [Coveo](https://www.coveo.com/).

This project is configured to work with the **Barca Shop** Shopify store (`barca-sports.myshopify.com`). If you need access, contact olamothe.

## Features

- **Shopify Hydrogen** - React-based headless commerce framework
- **Coveo Commerce Search** - Product search, facets, and recommendations
- **Generative AI Assistant** - Conversational shopping experience with streaming responses
- **React Router 7** - File-based routing with SSR support
- **Tailwind CSS 4** - Utility-first styling

## Tech Stack

- React 18
- React Router 7
- Shopify Hydrogen 2025.7
- Coveo Headless
- Tailwind CSS
- TypeScript
- Vite

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- A Shopify store with Hydrogen channel installed
- Coveo organization with Commerce configuration

### Installation

```bash
npm install
```

### Connect to Shopify

Link your local project to the Barca Shop store:

```bash
npx shopify hydrogen link
```

This will prompt you to:

1. Log in to your Shopify account (you need access to Barca Shop - contact olamothe if needed)
2. Select the `barca-sports.myshopify.com` store
3. Select the "Barca Sports Hydrogen" storefront

The configuration is stored in `.shopify/project.json`.

To pull environment variables from the store:

```bash
npx shopify hydrogen env pull
```

### Environment Variables

After running `env pull`, you should have the following Shopify variables in `.env`:

```env
# Storefront API
PUBLIC_STORE_DOMAIN="barca-sports.myshopify.com"
PUBLIC_STOREFRONT_ID="..."
PUBLIC_STOREFRONT_API_TOKEN="..."
PRIVATE_STOREFRONT_API_TOKEN="..."
PUBLIC_CHECKOUT_DOMAIN="..."

# Customer Account API
PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID="..."
PUBLIC_CUSTOMER_ACCOUNT_API_URL="..."

# Optional: Override customer account auto-detection
# By default, customer accounts are:
# - DISABLED in PR preview deployments (*.oxygen.store with branch/PR in URL)
# - DISABLED in local development (localhost/127.0.0.1)
# - ENABLED in production deployments (custom domains)
# Set this to explicitly override the default behavior:
# ENABLE_CUSTOMER_ACCOUNTS="true"   # Force enable
# ENABLE_CUSTOMER_ACCOUNTS="false"  # Force disable

# Shop & Session
SHOP_ID="..."
SESSION_SECRET="..."
```

You'll need to manually add these additional variables:

```env
# Coveo Generative AI Assistant (temporary - will be replaced by app proxy)
# This is just an API key for the Coveo org in dev.
AGENTIC_ACCESS_TOKEN="..."

# Coveo API Key (optional - tokens are fetched via app proxy by default)
COVEO_API_KEY=""
```

Note: Coveo search tokens are fetched automatically via the [Coveo app for Shopify](https://docs.coveo.com/en/p2la0421) app proxy installed on Barca Shop.

#### PR Preview & Local Development

Customer accounts are **automatically disabled** in:
- **PR preview deployments** (Oxygen URLs matching `*.oxygen.store` with branch/PR names)
- **Local development** (`localhost` or `127.0.0.1`)

This prevents authentication errors when sharing preview links publicly. The storefront remains fully functional without customer accounts - users just won't see login/account features.

Customer accounts are **automatically enabled** in:
- **Production deployments** (custom domains like `shop.barca.group`)

To override this behavior, set `ENABLE_CUSTOMER_ACCOUNTS` environment variable:
- `ENABLE_CUSTOMER_ACCOUNTS="true"` - Force enable (useful for testing auth in previews)
- `ENABLE_CUSTOMER_ACCOUNTS="false"` - Force disable (useful for disabling in production if needed)

**No manual configuration needed!** This PR automatically handles preview environments.

### Development

```bash
npm run dev
```

This starts the development server with hot module replacement at `http://localhost:3000`.

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
app/
├── components/
│   ├── Generative/          # AI assistant components
│   │   ├── ConversationTranscript.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInputFooter.tsx
│   │   └── ...
│   ├── Search/              # Search & facet components
│   └── ...
├── lib/
│   ├── generative/          # AI assistant hooks & utilities
│   │   ├── use-assistant-streaming.ts
│   │   ├── use-conversation-state.ts
│   │   └── ...
│   └── ...
├── routes/
│   ├── ($locale).generative.tsx    # AI assistant page
│   ├── ($locale).search.tsx        # Search results
│   ├── ($locale).products.$handle.tsx
│   └── ...
└── types/
```

## Available Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |

## Deployment

Deployment to [Shopify Oxygen](https://shopify.dev/custom-storefronts/oxygen) is handled automatically by a deployment bot when you push to the GitHub repository.

It's recommended to use PR branches if you want to see a build preview before merging.

## Resources

- [Hydrogen Documentation](https://shopify.dev/custom-storefronts/hydrogen)
- [Shopify CLI for Hydrogen](https://shopify.dev/docs/api/shopify-cli/hydrogen)
- [Coveo Headless Documentation](https://docs.coveo.com/en/headless/)
- [React Router Documentation](https://reactrouter.com/)
