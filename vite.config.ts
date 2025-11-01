import {defineConfig} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {vitePlugin as remix} from '@remix-run/dev';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    hydrogen(),
    oxygen(),
    remix({
      presets: [hydrogen.preset()],
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  build: {
    // Allow a strict Content-Security-Policy
    // withtout inlining assets as base64:
    assetsInlineLimit: 0,
    target: 'esnext',
  },
  ssr: {
    optimizeDeps: {
      /**
       * Include dependencies here if they throw CJS<>ESM errors.
       * For example, for the following error:
       *
       * > ReferenceError: module is not defined
       * >   at /Users/.../node_modules/example-dep/index.js:1:1
       *
       * Include 'example-dep' in the array below.
       * @see https://vitejs.dev/config/dep-optimization-options
       *
       * CRITICAL SSR FIX:
       * - '@headlessui/react' and 'use-sync-external-store/with-selector' are required
       *   to prevent "ReferenceError: module is not defined" errors in SSR context.
       * - DO NOT REMOVE these entries without thorough testing in local dev environment.
       * - This fix is paired with pinned Coveo package versions in package.json:
       *   @coveo/headless: 3.23.0 (no ^)
       *   @coveo/headless-react: 2.4.22 (no ^)
       * - Upgrading these packages independently may reintroduce SSR errors.
       */
      include: ['cookie', '@headlessui/react', 'use-sync-external-store/with-selector'],
    },
  },
});
