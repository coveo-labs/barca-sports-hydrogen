# Vercel Deployment Guide

## Prerequisites
- Vercel account ([vercel.com](https://vercel.com))
- GitHub repository connected to Vercel

## Deploy This Branch to Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"

2. **Import Your Repository**
   - Select `coveo-labs/barca-sports-hydrogen`
   - Click "Import"

3. **Configure Project**
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build/client`
   - Keep other settings as default

4. **Configure Git Branch**
   - Go to Project Settings → Git
   - Set **Production Branch** to: `ui-experimentation-pkuttappan`
   - This ensures only this branch deploys

5. **Add Environment Variables**
   Go to Project Settings → Environment Variables and add:

   ```
   PUBLIC_STORE_DOMAIN=barca-sports.myshopify.com
   PUBLIC_STOREFRONT_ID=<your-id>
   PUBLIC_STOREFRONT_API_TOKEN=<your-token>
   PRIVATE_STOREFRONT_API_TOKEN=<your-token>
   PUBLIC_CHECKOUT_DOMAIN=<your-domain>
   PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID=<your-id>
   PUBLIC_CUSTOMER_ACCOUNT_API_URL=<your-url>
   SHOP_ID=<your-shop-id>
   SESSION_SECRET=<your-secret>
   AGENTIC_ACCESS_TOKEN=<your-token>
   NODE_ENV=production
   ```

   💡 **Tip**: Copy values from your local `.env` file

6. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your branch
   - You'll get a URL like: `https://your-project.vercel.app`

### Option 2: Via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from This Branch**
   ```bash
   # Make sure you're on the right branch
   git checkout ui-experimentation-pkuttappan
   
   # Deploy to production
   vercel --prod
   ```

4. **Set Environment Variables**
   ```bash
   # Set each variable
   vercel env add PUBLIC_STORE_DOMAIN production
   vercel env add PUBLIC_STOREFRONT_ID production
   # ... repeat for all variables
   ```

## What Changed for Vercel

✅ **Removed Oxygen-specific code**:
- Replaced `@shopify/hydrogen/oxygen` imports with React Router
- Removed `@shopify/mini-oxygen/vite` plugin
- Updated server.ts to use Vercel Edge Functions signature

✅ **Added Vercel configuration**:
- `vercel.json` - Deployment configuration
- `api/index.ts` - Edge Function entry point
- `.vercelignore` - Files to exclude from deployment

✅ **Updated execution context**:
- Adapted `waitUntil` to work with Vercel's context API
- Made context.ts compatible with Edge runtime

## Verify Deployment

Once deployed, test these URLs:
- Homepage: `https://your-project.vercel.app/`
- Product page: `https://your-project.vercel.app/products/some-product`
- Search: `https://your-project.vercel.app/search?q=kayak`
- Cart: `https://your-project.vercel.app/cart`

## Troubleshooting

### Build Fails
- Check environment variables are set correctly
- Verify all required secrets are added
- Check build logs in Vercel dashboard

### Runtime Errors
- Check function logs in Vercel dashboard
- Verify Storefront API tokens are valid
- Ensure SESSION_SECRET is set

### Edge Function Limits
- Vercel Edge Functions have size limits (~1MB)
- If exceeded, consider moving to Serverless Functions (change runtime in api/index.ts)

## Automatic Deployments

With Git connected:
- **Push to `ui-experimentation-pkuttappan`** → Production deployment
- **Pull requests** → Preview deployments (optional, configure in Vercel)

## Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed
4. SSL certificate is automatic

## Notes

- This deployment uses **Vercel Edge Functions** (fast, globally distributed)
- The build output is in `build/client` (static assets)
- The API endpoint handles all server-side routing
- Caching is handled by Vercel's CDN automatically
