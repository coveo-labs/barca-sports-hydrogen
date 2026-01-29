import {Input, Switch} from '@headlessui/react';
import {useCallback, useEffect, useRef, useState, useMemo} from 'react';
import {useInstantProducts, useStandaloneSearchBox} from '~/lib/coveo/engine';
import {MagnifyingGlassIcon, SparklesIcon} from '@heroicons/react/24/outline';
import {ProductCard} from '../Products/ProductCard';
import '~/types/gtm';
import {useNavigate} from 'react-router';
import cx from '~/lib/cx';
import {useFeatureSettings} from '~/components/FeaturePanel';

interface StandaloneSearchBoxProps {
  close?: () => void;
}
export function StandaloneSearchBox({close}: StandaloneSearchBoxProps) {
  const {showAISummary} = useFeatureSettings();
  const searchBox = useStandaloneSearchBox();
  const instantProducts = useInstantProducts();
  const input = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [isConversationalMode, setIsConversationalMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const manualModeSelectionRef = useRef(false);

  const conversationalPrompts = useMemo(
    () => [
      'Suggest a paddleboarding accessory kit for beginners',
      'What safety gear do I need for a twilight kayak tour?',
      'Compare waterproof deck bags for a weekend surf trip',
      'Build a surf travel checklist with board protection and repairs',
    ],
    [],
  );

  const handleGenerativeSearch = useCallback(
    (query?: string) => {
      if (showAISummary) return;
      // For conversational mode, use local inputValue
      const searchQuery = query?.trim() || inputValue.trim();
      const url = searchQuery
        ? `/generative?q=${encodeURIComponent(searchQuery)}`
        : '/generative';

      navigate(url);
      close?.();
      searchBox.methods?.updateText('');
    },
    [inputValue, navigate, close, searchBox.methods, showAISummary],
  );

  const toggleConversationalMode = useCallback(
    (enabled: boolean) => {
      if (showAISummary) return;
      setIsConversationalMode(enabled);
      setInputValue('');
      searchBox.methods?.updateText('');
      manualModeSelectionRef.current = true; // User manually toggled

      // Focus input and show appropriate dropdown
      setTimeout(() => {
        if (input.current) {
          input.current.focus();
          setShowDropdown(true);
          if (!enabled) {
            searchBox.methods?.showSuggestions();
          }
        }
      }, 0);
    },
    [searchBox.methods, showAISummary],
  );

  useEffect(() => {
    if (showAISummary) {
      setIsConversationalMode(false);
      manualModeSelectionRef.current = false;
    }
  }, [showAISummary]);

  // Initialize on mount: sync inputValue with searchBox state and show dropdown
  useEffect(() => {
    // Clear any stale searchBox state from previous session
    if (searchBox.state.value && !isConversationalMode) {
      searchBox.methods?.updateText('');
    }

    const timer = setTimeout(() => {
      if (input.current) {
        input.current.focus();
        setShowDropdown(true);
        if (!isConversationalMode) {
          searchBox.methods?.showSuggestions();
        }
      }
    }, 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !input.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useRedirect(searchBox, navigate, close);
  useUpdateInstantProducts(searchBox, instantProducts);

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Only auto-switch modes if user hasn't manually selected a mode
    if (!showAISummary && !manualModeSelectionRef.current) {
      // Count words and determine target mode
      const query = value.trim();
      const wordCount = query
        ? query.split(/\s+/).filter((word) => word.length > 0).length
        : 0;

      const shouldBeConversational = wordCount > 3;

      if (shouldBeConversational !== isConversationalMode) {
        setIsConversationalMode(shouldBeConversational);
      }
    }

    // Only update Coveo searchBox when in normal mode
    if (!isConversationalMode) {
      searchBox.methods?.updateText(value);
    }
  };

  const onSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();

      const query = inputValue.trim();
      if (!query) return;

      // Reset manual mode selection on submit
      manualModeSelectionRef.current = false;

      // In conversational mode, use local inputValue
      if (isConversationalMode) {
        handleGenerativeSearch(query);
        return;
      }

      // Normal search mode - use searchBox state (Coveo's source of truth)
      const searchQuery = searchBox.state.value?.trim();
      if (!searchQuery) return;

      searchBox.methods?.submit();
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'search',
        search_type: 'search_box',
        search_term: encodeURIComponent(searchQuery),
      });
    },
    [
      inputValue,
      searchBox.state.value,
      searchBox.methods,
      isConversationalMode,
      handleGenerativeSearch,
    ],
  );

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    searchBox.methods?.updateText(suggestion);
    searchBox.methods?.submit();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'search',
      search_type: 'search_box',
      search_term: encodeURIComponent(suggestion),
    });
  };

  const handlePromptClick = (prompt: string) => {
    handleGenerativeSearch(prompt);
  };

  return (
    <div className="relative">
      <form onSubmit={onSubmit} className="relative">
        <Input
          ref={input}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setShowDropdown(true);
            if (!isConversationalMode) {
              searchBox.methods?.showSuggestions();
            }
          }}
          className="search-box w-full h-12 border p-4 pr-32 focus:ring-0"
          aria-label="Search"
          aria-expanded={showDropdown}
          aria-controls="search-dropdown"
          aria-autocomplete="list"
          placeholder={isConversationalMode ? 'Ask me anything...' : 'Search'}
        />
        <div className="absolute inset-y-0 right-0 flex items-center gap-3 pr-3">
          <button
            type="submit"
            className="group h-9 w-9 items-center justify-center hidden"
          >
            <MagnifyingGlassIcon className="size-6" />
          </button>
          {!showAISummary && (
            <div className="flex items-center gap-2" title="Conversational mode">
              <SparklesIcon
                className={cx(
                  'size-6 transition-colors',
                  isConversationalMode ? 'text-indigo-600' : 'text-slate-400',
                )}
              />
              <Switch
                checked={isConversationalMode}
                onChange={toggleConversationalMode}
                className={cx(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2',
                  isConversationalMode ? 'bg-indigo-600' : 'bg-slate-200',
                )}
              >
                <span className="sr-only">Enable conversational mode</span>
                <span
                  className={cx(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
                    isConversationalMode ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </Switch>
            </div>
          )}
        </div>
      </form>

      {showDropdown && (
        <div
          ref={dropdownRef}
          id="search-dropdown"
          role="listbox"
          className="absolute top-full left-0 right-0 z-20 bg-white border border-t-0 shadow-lg max-h-[600px] overflow-y-auto"
        >
          {!showAISummary && isConversationalMode ? (
            // Conversational prompts
            <div className="p-4">
              <p className="mb-3 text-sm font-semibold text-slate-900">
                Try asking:
              </p>
              <div className="flex flex-col gap-2">
                {conversationalPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => handlePromptClick(prompt)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Search suggestions and products
            <>
              {searchBox.state.suggestions.length > 0 && (
                <div className="flex">
                  <div className="flex-shrink-0 w-80 border-r">
                    {searchBox.state.suggestions.map((suggestion) => (
                      <button
                        key={suggestion.rawValue}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() =>
                          handleSuggestionClick(suggestion.rawValue)
                        }
                        className="query-suggestion w-full text-left hover:text-indigo-600 hover:bg-gray-50 cursor-pointer p-2 transition-colors"
                        dangerouslySetInnerHTML={{
                          __html: suggestion.highlightedValue,
                        }}
                      />
                    ))}
                  </div>
                  {instantProducts.state.products.length > 0 && (
                    <div className="flex-1 bg-gray-50 p-4">
                      <p className="text-lg font-bold tracking-tight text-gray-900 mb-4">
                        Popular products
                      </p>
                      <div className="grid gap-3 grid-cols-4">
                        {instantProducts.state.products.slice(0, 4).map((product) => (
                          // using scale-90 to slightly reduce size to fit 4 in row since variant=compact removes the swatch from products
                          <div key={product.permanentid} className="scale-90">
                            <ProductCard
                              product={product}
                              className="product-suggestion"
                              onSelect={() => {
                                instantProducts.methods
                                  ?.interactiveProduct({
                                    options: {product},
                                  })
                                  .select();
                                close?.();
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function useRedirect(
  searchBox: ReturnType<typeof useStandaloneSearchBox>,
  navigate: ReturnType<typeof useNavigate>,
  close?: () => void,
) {
  useEffect(() => {
    if (searchBox.state.redirectTo === '/search') {
      const url = `${searchBox.state.redirectTo}?q=${encodeURIComponent(searchBox.state.value)}`;

      navigate(url);
      // Reset the redirectTo state to prevent re-triggering on popover reopen
      searchBox.methods?.afterRedirection();
      searchBox.methods?.updateText('');
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
