import {buildProviderWithDefinition} from '@coveo/headless-react/ssr-commerce';
import type {NavigatorContext} from '@coveo/headless-react/ssr-commerce';
import type {PropsWithChildren} from 'react';
import {useRef} from 'react';

import {
  searchEngineDefinition,
  listingEngineDefinition,
  recommendationEngineDefinition,
  standaloneEngineDefinition,
  type SearchStaticState,
  type ListingStaticState,
  type StandaloneStaticState,
} from '~/lib/coveo/engine';
import type {InferStaticState} from '@coveo/headless-react/ssr-commerce';

type RecommendationStaticState = InferStaticState<
  typeof recommendationEngineDefinition
>;

// Base providers built with Coveo's utility
const BaseListingProvider = buildProviderWithDefinition(
  listingEngineDefinition,
);
const BaseSearchProvider = buildProviderWithDefinition(searchEngineDefinition);
const BaseRecommendationProvider = buildProviderWithDefinition(
  recommendationEngineDefinition,
);
const BaseStandaloneProvider = buildProviderWithDefinition(
  standaloneEngineDefinition,
);

interface ProviderProps<TStaticState> {
  staticState: TStaticState;
  navigatorContext: NavigatorContext;
  /**
   * The access token to use for Coveo API requests.
   * This token is set before hydration to ensure the client-side engine
   * uses the same token that was used on the server.
   */
  accessToken?: string;
}

/**
 * Wraps listing pages to provide context for listing-specific hooks.
 * Accepts an optional accessToken prop to set the token before hydration.
 */
export function ListingProvider({
  staticState,
  navigatorContext,
  accessToken,
  children,
}: PropsWithChildren<ProviderProps<ListingStaticState>>) {
  // Use a ref to ensure we only set the token once during initial render
  const tokenSetRef = useRef(false);

  if (accessToken && !tokenSetRef.current) {
    listingEngineDefinition.setAccessToken(accessToken);
    tokenSetRef.current = true;
  }

  return (
    <BaseListingProvider
      staticState={staticState}
      navigatorContext={navigatorContext}
    >
      {children}
    </BaseListingProvider>
  );
}

/**
 * Wraps search pages to provide context for search-specific hooks.
 * Accepts an optional accessToken prop to set the token before hydration.
 */
export function SearchProvider({
  staticState,
  navigatorContext,
  accessToken,
  children,
}: PropsWithChildren<ProviderProps<SearchStaticState>>) {
  const tokenSetRef = useRef(false);

  if (accessToken && !tokenSetRef.current) {
    searchEngineDefinition.setAccessToken(accessToken);
    tokenSetRef.current = true;
  }

  return (
    <BaseSearchProvider
      staticState={staticState}
      navigatorContext={navigatorContext}
    >
      {children}
    </BaseSearchProvider>
  );
}

/**
 * Wraps recommendations, whether in a standalone, search, or listing page.
 * Accepts an optional accessToken prop to set the token before hydration.
 */
export function RecommendationProvider({
  staticState,
  navigatorContext,
  accessToken,
  children,
}: PropsWithChildren<ProviderProps<RecommendationStaticState>>) {
  const tokenSetRef = useRef(false);

  if (accessToken && !tokenSetRef.current) {
    recommendationEngineDefinition.setAccessToken(accessToken);
    tokenSetRef.current = true;
  }

  return (
    <BaseRecommendationProvider
      staticState={staticState}
      navigatorContext={navigatorContext}
    >
      {children}
    </BaseRecommendationProvider>
  );
}

/**
 * Used for components that don't require triggering a search or product fetch
 * (e.g., cart pages, standalone search box).
 * Accepts an optional accessToken prop to set the token before hydration.
 */
export function StandaloneProvider({
  staticState,
  navigatorContext,
  accessToken,
  children,
}: PropsWithChildren<ProviderProps<StandaloneStaticState>>) {
  const tokenSetRef = useRef(false);

  if (accessToken && !tokenSetRef.current) {
    standaloneEngineDefinition.setAccessToken(accessToken);
    tokenSetRef.current = true;
  }

  return (
    <BaseStandaloneProvider
      staticState={staticState}
      navigatorContext={navigatorContext}
    >
      {children}
    </BaseStandaloneProvider>
  );
}
