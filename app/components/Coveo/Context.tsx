import type {NavigatorContext} from '@coveo/headless/commerce';

import {type PropsWithChildren, useEffect, useState} from 'react';

import {
  type ListingHydratedState,
  type ListingStaticState,
  searchEngineDefinition,
  type SearchHydratedState,
  type SearchStaticState,
  listingEngineDefinition,
} from '~/lib/coveo.engine';

interface SearchPageProps {
  staticState: SearchStaticState;
  navigatorContext: NavigatorContext;
  q: string;
}

export function SearchProvider({
  staticState,
  navigatorContext,
  q,
  children,
}: PropsWithChildren<SearchPageProps>) {
  const [hydratedState, setHydratedState] = useState<
    SearchHydratedState | undefined
  >(undefined);

  // Setting the navigator context provider also in client-side before hydrating the application
  searchEngineDefinition.setNavigatorContextProvider(() => navigatorContext);

  useEffect(() => {
    searchEngineDefinition
      .hydrateStaticState({
        searchAction: staticState.searchAction,
        controllers: {
          searchParameter: {initialState: {parameters: {q}}},
          cart: {
            initialState: {items: staticState.controllers.cart.state.items},
          },
          context: staticState.controllers.context.state,
        },
      })
      .then((hydratedState) => {
        setHydratedState(hydratedState);
      });
  }, [staticState, q]);

  if (hydratedState) {
    return (
      <searchEngineDefinition.HydratedStateProvider
        engine={hydratedState.engine}
        controllers={hydratedState.controllers}
      >
        <>{children}</>
      </searchEngineDefinition.HydratedStateProvider>
    );
  } else {
    return (
      <searchEngineDefinition.StaticStateProvider
        controllers={staticState.controllers}
      >
        <>{children}</>
      </searchEngineDefinition.StaticStateProvider>
    );
  }
}

interface ListingPageProps {
  staticState: ListingStaticState;
  navigatorContext: NavigatorContext;
}

export function ListingProvider({
  staticState,
  navigatorContext,
  children,
}: PropsWithChildren<ListingPageProps>) {
  const [hydratedState, setHydratedState] = useState<
    ListingHydratedState | undefined
  >(undefined);

  // Setting the navigator context provider also in client-side before hydrating the application
  listingEngineDefinition.setNavigatorContextProvider(() => navigatorContext);

  useEffect(() => {
    listingEngineDefinition
      .hydrateStaticState({
        searchAction: staticState.searchAction,
        controllers: {
          searchParameter: {initialState: {parameters: {}}},
          cart: {
            initialState: {items: staticState.controllers.cart.state.items},
          },
          context: staticState.controllers.context.state,
        },
      })
      .then(({engine, controllers}) => {
        setHydratedState({engine, controllers});
      });
  }, [staticState]);

  if (hydratedState) {
    return (
      <listingEngineDefinition.HydratedStateProvider
        engine={hydratedState.engine}
        controllers={hydratedState.controllers}
      >
        <>{children}</>
      </listingEngineDefinition.HydratedStateProvider>
    );
  } else {
    return (
      <listingEngineDefinition.StaticStateProvider
        controllers={staticState.controllers}
      >
        <>{children}</>
      </listingEngineDefinition.StaticStateProvider>
    );
  }
}
