# Hydrogen template: Skeleton

Hydrogen is Shopify’s stack for headless commerce. Hydrogen is designed to dovetail with [Remix](https://remix.run/), Shopify’s full stack web framework. This template contains a **minimal setup** of components, queries and tooling to get started with Hydrogen.

[Check out Hydrogen docs](https://shopify.dev/custom-storefronts/hydrogen)
[Get familiar with Remix](https://remix.run/docs/en/v1)

## What's included

- Remix
- Hydrogen
- Oxygen
- Vite
- Shopify CLI
- ESLint
- Prettier
- GraphQL generator
- TypeScript and JavaScript flavors
- Minimal setup of components and routes

## Getting started

**Requirements:**

- Node.js version 18.0.0 or higher

```bash
npm create @shopify/hydrogen@latest
```

## ⚠️ Important: Dependency Management

This project uses **pinned versions** for certain packages to prevent SSR (Server-Side Rendering) errors. Before updating dependencies, especially `@coveo/headless`, `@coveo/headless-react`, or `@headlessui/react`, please read [DEPENDENCIES.md](./DEPENDENCIES.md) for critical configuration details.

**Common issues if dependencies are modified incorrectly:**
- `TypeError: Cannot read properties of undefined (reading 'extend')`
- `ReferenceError: module is not defined`

See [DEPENDENCIES.md](./DEPENDENCIES.md) for solutions and safe upgrade procedures.

## Building for production

```bash
npm run build
```

## Local development

```bash
npm run dev
```

## Setup for using Customer Account API (`/account` section)

Follow step 1 and 2 of <https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development>
