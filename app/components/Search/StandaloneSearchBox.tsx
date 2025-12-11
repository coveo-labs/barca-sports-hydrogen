import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import {useCallback, useEffect, useRef} from 'react';
import {useInstantProducts, useStandaloneSearchBox} from '~/lib/coveo.engine';
import {
  MagnifyingGlassIcon,
  ChatBubbleBottomCenterIcon,
} from '@heroicons/react/24/outline';
import {ProductCard} from '../Products/ProductCard';
import {createProductWithConsistentId} from '~/lib/map.coveo.shopify';
import '~/types/gtm';
import {useNavigate} from 'react-router';

interface StandaloneSearchBoxProps {
  close?: () => void;
}
export function StandaloneSearchBox({close}: StandaloneSearchBoxProps) {
  const searchBox = useStandaloneSearchBox();
  const instantProducts = useInstantProducts();
  const input = useRef<HTMLInputElement>(null);

  // Focus input and show suggestions when component mounts/remounts
  useEffect(() => {
    // Small delay to ensure the popover is fully rendered
    const timer = setTimeout(() => {
      if (input.current) {
        input.current.focus();
        searchBox.methods?.showSuggestions();
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useRedirect(searchBox, close);
  useUpdateInstantProducts(searchBox, instantProducts);

  const onSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

        searchBox.methods?.submit();
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'search',
          search_type: 'search_box',
          search_term: encodeURIComponent(searchBox.state.value),
        });
    },
    [searchBox.state.value, searchBox.methods],
  );
  return (
    <>
      <Combobox
        immediate
        value={searchBox.state.value}
        onChange={(val) => {
          if (val === null) {
            return;
          }
          if (val !== 'products') {
            searchBox.methods?.updateText(val);
            onSubmit();
          }
          if (val === 'products') {
            close?.();
          }
        }}
      >
        <form onSubmit={onSubmit} className="relative">
          <ComboboxInput
            ref={input}
            onFocus={() => {
              searchBox.methods?.showSuggestions();
            }}
            className="search-box w-full h-12 border p-4"
            aria-label="Search"
            placeholder="Search"
            onChange={(event) => {
              searchBox.methods?.updateText(event.target.value);
            }}
          />
          <ComboboxButton
            as="button"
            type="submit"
            className="group absolute inset-y-0 right-0 px-2.5"
          >
            {searchBox.state.value.length > 10 ? (
              <ChatBubbleBottomCenterIcon className="size-6" />
            ) : (
              <MagnifyingGlassIcon className="size-6" />
            )}
          </ComboboxButton>
        </form>

        <ComboboxOptions
          transition
          anchor="bottom start"
          className="origin-top border transition duration-200 ease-out empty:invisible data-[closed]:scale-95 data-[closed]:opacity-0 w-[var(--input-width)] z-20 bg-white l-0"
        >
          {searchBox.state.value && (
            <ComboboxOption value={searchBox.state.value} className="hidden">
              {searchBox.state.value}
            </ComboboxOption>
          )}
          {searchBox.state.suggestions.map((suggestion, i) => {
            return (
              <ComboboxOption
                key={suggestion.rawValue}
                value={suggestion.rawValue}
                className="query-suggestion data-[focus]:text-indigo-600 cursor-pointer p-2 z-20"
                dangerouslySetInnerHTML={{
                  __html: suggestion.highlightedValue,
                }}
              ></ComboboxOption>
            );
          })}
          {searchBox.state.suggestions.length > 0 && (
            <ComboboxOption value="products">
              <div className="mt-6 pt-3 border-t bg-gray-50">
                <p className="pl-2 text-2xl font-bold tracking-tight text-gray-900">
                  Popular products
                </p>
                <div className="grid gap-x-8 gap-y-10 grid-cols-3 grid-rows-1 mt-6 sm:grid-cols-2 lg:grid-cols-5 xl:gap-x-8 p-4">
                  {instantProducts.state.products.map((product) => {
                    return (
                      <ProductCard
                        key={product.permanentid}
                        product={product}
                        className="product-suggestion"
                        onSelect={() => {
                          instantProducts.methods
                            ?.interactiveProduct({
                              options: {
                                product: createProductWithConsistentId(product),
                              },
                            })
                            .select();
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </ComboboxOption>
          )}
        </ComboboxOptions>
      </Combobox>
    </>
  );
}

function useRedirect(
  searchBox: ReturnType<typeof useStandaloneSearchBox>,
  close?: () => void,
) {
  const navigate = useNavigate();

  useEffect(() => {
    if (searchBox.state.redirectTo === '/search') {
       const url = `${searchBox.state.redirectTo}?q=${encodeURIComponent(searchBox.state.value)}`;

      navigate(url);
      // Reset the redirectTo state to prevent re-triggering on popover reopen
      searchBox.methods?.afterRedirection();
      close?.();
    }
  }, [
    searchBox.state.redirectTo,
    searchBox.state.value,
    searchBox.methods,
    navigate,
    close,
  ]);
}

function useUpdateInstantProducts(
  searchBox: ReturnType<typeof useStandaloneSearchBox>,
  instantProducts: ReturnType<typeof useInstantProducts>,
) {
  useEffect(() => {
    if (searchBox.state.suggestions[0]) {
      instantProducts.methods?.updateQuery(
        searchBox.state.suggestions[0]?.rawValue,
      );
    }
  }, [searchBox.state.suggestions, instantProducts.methods]);
}
