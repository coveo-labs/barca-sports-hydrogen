# Dependency Management Notes

## Critical SSR Configuration

This project requires specific dependency versions and Vite configuration to prevent Server-Side Rendering (SSR) errors.

### Pinned Coveo Packages

The following packages in `package.json` **must remain pinned** (without `^` prefix):

```json
"@coveo/headless": "3.23.0",
"@coveo/headless-react": "2.4.22",
```

**Why?**
- Version mismatches between these packages cause `TypeError: Cannot read properties of undefined (reading 'extend')` errors
- The `^` prefix allows npm to auto-upgrade to newer minor versions, which can break compatibility
- These versions are tested and confirmed working together

**Before upgrading:**
1. Test thoroughly in local development environment
2. Verify no SSR errors occur when starting the dev server
3. Test all pages that use Coveo components (search, product listings, recommendations)

### Required Vite SSR Configuration

The `vite.config.ts` file must include the following in `ssr.optimizeDeps.include`:

```typescript
include: ['cookie', '@headlessui/react', 'use-sync-external-store/with-selector']
```

**Why?**
- `@headlessui/react` and `use-sync-external-store/with-selector` have CommonJS/ESM interop issues
- Without these entries, you'll see: `ReferenceError: module is not defined`
- This error occurs because these packages reference `module` in a way that's incompatible with Vite's SSR

### Common Errors and Solutions

#### Error: `TypeError: Cannot read properties of undefined (reading 'extend')`
- **Cause:** Version mismatch between `@coveo/headless` and `@coveo/headless-react`
- **Solution:** Ensure both packages are pinned to the versions above

#### Error: `ReferenceError: module is not defined`
- **Cause:** Missing SSR optimization for HeadlessUI or use-sync-external-store
- **Solution:** Verify `vite.config.ts` includes the packages in `ssr.optimizeDeps.include`

### Testing After Dependency Changes

If you need to update any related packages, follow this process:

1. Clean install:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Start dev server and check for errors:
   ```bash
   npm run dev
   ```

3. Verify these pages load without SSR errors:
   - Homepage (/)
   - Search page (/search)
   - Product listing pages (/plp/*)
   - Product detail pages (/products/*)

4. Check browser console for any client-side errors

### Related Packages

These packages work in conjunction with the Coveo packages and should be updated with caution:
- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `@headlessui/react`: ^2.2.0
- `@remix-run/react`: ^2.13.1
- `@remix-run/server-runtime`: ^2.13.1

## Questions?

If you encounter SSR errors after dependency updates, refer to this document and the comments in `vite.config.ts`.
