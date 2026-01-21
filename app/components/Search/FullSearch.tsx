import {Menu, MenuButton, MenuItems} from '@headlessui/react';
import {ChevronDownIcon} from '@heroicons/react/20/solid';
import {Facets} from './Facets';
import {PaginationFooter} from './Pagination';
import {ProductList} from './ProductList';
import {NoProductsFound} from './NoProductsFound';
import {Sorts} from './Sorts';
import {Breadcrumbs} from './Breadcrumbs';
import {SearchSummary} from '~/components/Generative/SearchSummary';
import {useEffect, useRef, useState} from 'react';
import {useProductList} from '~/lib/coveo/engine';

interface SearchPageProps {
  headline: string;
  tagline: string;
  searchQuery?: string;
}

function useWindowSize() {
  const [size, setSize] = useState([0, 0]);
  useEffect(() => {
    function updateSize() {
      setSize([window.innerWidth, window.innerHeight]);
    }
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  return size;
}

function useNumFacetsInline() {
  const [windowWidth] = useWindowSize();
  if (windowWidth === 0) {
    return 6;
  }
  if (windowWidth < 450) {
    return 0;
  }
  if (windowWidth < 1000) {
    return Math.floor(windowWidth / 250);
  }
  return 6;
}

export function FullSearch({
  headline,
  tagline,
  searchQuery = '',
}: SearchPageProps) {
  const facetsContainer = useRef<HTMLDivElement>(null);
  const numFacetsInline = useNumFacetsInline();
  const productList = useProductList();

  const hasResults = productList.state.products.length > 0;

  return (
    <main className="bg-gray-50">
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {headline}
          </h1>
          <p className="mt-4 max-w-xl text-base text-gray-500">{tagline}</p>
        </div>
      </div>
      <section aria-labelledby="filter-heading">
        <h2 id="filter-heading" className="sr-only">
          Filters
        </h2>

        <div className="border-b border-gray-200 bg-white pb-4">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <MenuButton className="sort-by group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
                  Sort
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="-mr-1 ml-1 size-5 shrink-0 text-gray-400 group-hover:text-gray-500"
                  />
                </MenuButton>
              </div>

              <MenuItems
                transition
                className="absolute left-0 z-10 mt-2 w-40 origin-top-left rounded-md bg-white shadow-2xl ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
              >
                <div className="py-1">
                  <Sorts />
                </div>
              </MenuItems>
            </Menu>

            <div className="flow-root" ref={facetsContainer}>
              <Facets numFacetsInLine={numFacetsInline} />
            </div>
          </div>
        </div>

        <Breadcrumbs />
      </section>

      {searchQuery && <SearchSummary searchQuery={searchQuery} />}

      <section
        aria-labelledby="products-heading"
        className="mx-auto max-w-screen-xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16 lg:px-8"
      >
        <h2 id="products-heading" className="sr-only">
          Products
        </h2>
        {hasResults ? (
          <>
            <ProductList searchQuery={searchQuery} />
            <PaginationFooter />
          </>
        ) : (
          <NoProductsFound />
        )}
      </section>
    </main>
  );
}
