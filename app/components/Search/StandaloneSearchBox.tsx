import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import {useEffect} from 'react';
import {engineDefinition, useStandaloneSearchBox} from '~/lib/coveo.engine';
import {MagnifyingGlassIcon} from '@heroicons/react/24/outline';
import {ProductCard} from '../Products/ProductCard';
import {useNavigate} from '@remix-run/react';

interface StandaloneSearchBoxProps {
  close?: () => void;
}
export function StandaloneSearchBox({close}: StandaloneSearchBoxProps) {
  const searchBox = useStandaloneSearchBox();
  const instantProducts = engineDefinition.controllers.useInstantProducts();
  const navigate = useNavigate();
  useEffect(() => {
    if (searchBox.state.suggestions[0]) {
      instantProducts.methods?.updateQuery(
        searchBox.state.suggestions[0]?.rawValue,
      );
    }
  }, [searchBox.state.suggestions, instantProducts.methods]);
  useEffect(() => {
    if (searchBox.state.redirectTo === '/search') {
      const url = `${searchBox.state.redirectTo}?q=${encodeURIComponent(
        searchBox.state.value,
      )}`;

      navigate(url);
      close?.();
    }
  }, [searchBox.state.redirectTo, searchBox.state.value, navigate, close]);
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
            searchBox.methods?.submit();
          }
          if (val === 'products') {
            close?.();
          }
        }}
      >
        <div className="relative">
          <ComboboxInput
            onFocus={() => {
              searchBox.methods?.showSuggestions();
            }}
            className="w-full h-12 border p-4"
            aria-label="Search"
            placeholder="Search"
            onChange={(event) => {
              searchBox.methods?.updateText(event.target.value);
            }}
          />
          <ComboboxButton
            className="group absolute inset-y-0 right-0 px-2.5"
            onClick={() => searchBox.methods?.submit()}
          >
            <MagnifyingGlassIcon className="size-6" />
          </ComboboxButton>
        </div>

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
                className="data-[focus]:text-indigo-600 cursor-pointer p-2 z-20"
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
