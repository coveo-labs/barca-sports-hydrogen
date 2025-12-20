import {defineConfig, type Plugin} from 'vite';
import {hydrogen} from '@shopify/hydrogen/vite';
import {oxygen} from '@shopify/mini-oxygen/vite';
import {reactRouter} from '@react-router/dev/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// Plugin to fix dayjs imports for Coveo Headless in SSR
function dayjsEsmPlugin(): Plugin {
  return {
    name: 'dayjs-esm-fix',
    enforce: 'pre',
    resolveId(id, importer) {
      if (id === 'dayjs' && importer?.includes('@coveo/headless')) {
        return this.resolve('dayjs/esm/index.js', importer, {skipSelf: true});
      }
      if (
        id.startsWith('dayjs/plugin/') &&
        importer?.includes('@coveo/headless')
      ) {
        const pluginName = id.replace('dayjs/plugin/', '').replace('.js', '');
        return this.resolve(
          `dayjs/esm/plugin/${pluginName}/index.js`,
          importer,
          {skipSelf: true},
        );
      }
      return null;
    },
  };
}

// Plugin to stub pino for edge/worker environments where CommonJS require is not available
function pinoStubPlugin(): Plugin {
  return {
    name: 'pino-stub',
    enforce: 'pre',
    resolveId(id) {
      if (id === 'pino' || id.startsWith('pino/')) {
        return '\0pino-stub';
      }
      return null;
    },
    load(id) {
      if (id === '\0pino-stub') {
        // Return a minimal pino stub that works in edge environments
        return `
          const noop = () => {};
          const noopLogger = {
            trace: noop,
            debug: noop,
            info: noop,
            warn: noop,
            error: noop,
            fatal: noop,
            child: () => noopLogger,
            level: 'silent',
          };
          function pino() { return noopLogger; }
          export { pino };
          export default pino;
          export const logger = noopLogger;
        `;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    pinoStubPlugin(),
    dayjsEsmPlugin(),
    hydrogen(),
    oxygen(),
    reactRouter(),
    tsconfigPaths(),
  ],
  build: {
    // Allow a strict Content-Security-Policy
    // withtout inlining assets as base64:
    assetsInlineLimit: 0,
  },
  ssr: {
    noExternal: [
      '@headlessui/react',
      'use-sync-external-store',
      'use-sync-external-store/shim/with-selector',
      '@coveo/headless',
      'dayjs',
      'exponential-backoff',
    ],
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
       */
      include: [
        'cookie',
        '@headlessui/react',
        'use-sync-external-store',
        'use-sync-external-store/shim',
        'use-sync-external-store/with-selector',
        'exponential-backoff',
      ],
      exclude: ['dayjs', '@coveo/headless'],
    },
  },
});
