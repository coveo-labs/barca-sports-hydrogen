import {NavLink} from '@remix-run/react';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';

import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from '@headlessui/react';
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {Image} from '@shopify/hydrogen';
import BarcaLogo from '~/assets/barca-logo.svg';
import {useState} from 'react';

interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
}

type Viewport = 'desktop' | 'mobile';

export function Header({
  header,
  isLoggedIn,
  cart,
  publicStoreDomain,
}: HeaderProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuDesktop header={header} setOpen={setOpen} />
    </>
  );
}

interface MenuDesktopProps {
  header: HeaderQuery;
  setOpen: (open: boolean) => void;
}
function MenuDesktop({header, setOpen}: MenuDesktopProps) {
  const relativeLink = (url: string) => {
    return new URL(url).pathname;
  };
  const {shop, menu, collections} = header;

  return (
    <header className="sticky top-0 z-10 bg-white">
      <p className="flex h-10 items-center justify-center bg-indigo-600 px-4 text-sm font-medium text-white sm:px-6 lg:px-8">
        Get free delivery on orders over $100
      </p>

      <nav aria-label="Top" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="">
          <div className="flex h-16 items-center">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative rounded-md bg-white p-2 text-gray-400 lg:hidden"
            >
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Open menu</span>
              <Bars3Icon aria-hidden="true" className="h-6 w-6" />
            </button>

            {/* Logo */}
            <div className="ml-4 flex lg:ml-0">
              <a href="/">
                <span className="sr-only">{shop.name}</span>
                <Image src={BarcaLogo} className="h-8 w-auto" sizes="200" />
              </a>
            </div>

            {/* Flyout menus */}
            <PopoverGroup className="hidden lg:ml-8 lg:block lg:self-stretch">
              <div className="flex h-full space-x-8">
                {menu?.items.map((menuItem) => {
                  const currentCollection = collections.edges.find(
                    (collection) => collection.node.title === menuItem.title,
                  );
                  if (menuItem.items.length === 0) {
                    return (
                      <NavLink
                        className="relative z-10 -mb-px flex items-center border-b-2 border-transparent pt-px text-sm font-medium text-gray-700 transition-colors duration-200 ease-out hover:text-gray-800 data-[open]:border-indigo-600 data-[open]:text-indigo-600 focus:outline-none"
                        key={menuItem.id}
                        to={relativeLink(menuItem.url!)}
                      >
                        {menuItem.title}
                      </NavLink>
                    );
                  }
                  return (
                    <Popover key={menuItem.id} className="flex">
                      <div className="relative flex">
                        <PopoverButton className="relative z-10 -mb-px flex items-center border-b-2 border-transparent pt-px text-sm font-medium text-gray-700 transition-colors duration-200 ease-out hover:text-gray-800 data-[open]:border-indigo-600 data-[open]:text-indigo-600 focus:outline-none">
                          {menuItem.title}
                        </PopoverButton>
                      </div>

                      <PopoverPanel
                        transition
                        className="absolute inset-x-0 top-full text-sm text-gray-500 transition data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150 data-[enter]:ease-out data-[leave]:ease-in"
                      >
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 top-1/2 bg-white shadow"
                        />

                        <div className="relative bg-white">
                          <div className="mx-auto max-w-7xl px-8">
                            <div className="grid grid-cols-1 gap-x-8 gap-y-10 py-16">
                              <div className="col-start-2 grid grid-cols-2 gap-x-8">
                                <div
                                  key={menuItem.id}
                                  className="group relative text-base sm:text-sm"
                                >
                                  <a
                                    href={relativeLink(menuItem.url!)}
                                    className="mt-6 block font-medium text-gray-900 hover:underline"
                                  >
                                    <div className="aspect-h-1 aspect-w-1 overflow-hidden rounded-lg bg-gray-100 group-hover:opacity-75">
                                      <img
                                        alt={'replace'}
                                        src={
                                          currentCollection?.node.image?.url! ||
                                          'replace'
                                        }
                                        className="object-cover object-center"
                                      />
                                    </div>
                                    <span
                                      aria-hidden="true"
                                      className="absolute inset-0 z-10"
                                    />
                                    Shop all {menuItem.title}
                                  </a>
                                </div>
                              </div>
                              <div className="row-start-1 grid grid-cols-3 gap-x-8 gap-y-10 text-sm">
                                {menuItem.items.map((subMenuItem) => {
                                  return (
                                    <div key={subMenuItem.id}>
                                      <a
                                        key={subMenuItem.id}
                                        href={relativeLink(subMenuItem.url!)}
                                        className="font-medium text-gray-900 hover:underline"
                                      >
                                        {subMenuItem.title}
                                      </a>
                                      <ul
                                        aria-labelledby={`${subMenuItem.id}-heading`}
                                        className="mt-6 space-y-6 sm:mt-4 sm:space-y-4"
                                      >
                                        {subMenuItem.items.map(
                                          (leafMenuItem) => (
                                            <li
                                              key={leafMenuItem.id}
                                              className="flow-root"
                                            >
                                              <a
                                                href={relativeLink(
                                                  leafMenuItem.url!,
                                                )}
                                                className="-m-2 block p-2 text-gray-500 hover:text-gray-800 hover:underline"
                                              >
                                                {leafMenuItem.title}
                                              </a>
                                            </li>
                                          ),
                                        )}
                                      </ul>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverPanel>
                    </Popover>
                  );
                })}
              </div>
            </PopoverGroup>

            <div className="ml-auto flex items-center">
              <div className="hidden lg:flex lg:flex-1 lg:items-center lg:justify-end lg:space-x-6">
                <button className="text-sm font-medium text-gray-700 hover:text-gray-800">
                  Sign in
                </button>
                <span aria-hidden="true" className="h-6 w-px bg-gray-200" />
                <button className="text-sm font-medium text-gray-700 hover:text-gray-800">
                  Create account
                </button>
              </div>

              <div className="hidden lg:ml-8 lg:flex">
                <button className="flex items-center text-gray-700 hover:text-gray-800">
                  <img
                    alt=""
                    src="https://tailwindui.com/plus/img/flags/flag-canada.svg"
                    className="block h-auto w-5 shrink-0"
                  />
                  <span className="ml-3 block text-sm font-medium">CAD</span>
                  <span className="sr-only">, change currency</span>
                </button>
              </div>

              {/* Search */}
              <div className="flex lg:ml-6"></div>

              <Popover className="flex lg:ml-6">
                <PopoverButton className="rp-2 text-gray-400 hover:text-gray-500 data-[open]:border-indigo-600 data-[open]:text-indigo-600 focus:outline-none">
                  <span className="sr-only">Search</span>
                  <MagnifyingGlassIcon aria-hidden="true" className="h-6 w-6" />
                </PopoverButton>
                <PopoverPanel
                  transition
                  className="absolute bg-white inset-x-0 top-fulltext-sm text-gray-500 transition data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150 data-[enter]:ease-out data-[leave]:ease-in"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 top-1/2 bg-white shadow min-h-screen"
                  />
                  <div className="relative bg-white mx-auto max-w-7xl p-8 h-">
                    {/* <Combobox
                      immediate
                      value={searchBox.state.value}
                      onChange={(val) => {
                        if (val !== null) {
                          searchBox.updateText(val);
                        }
                        if (searchBox.state.suggestions[0]) {
                          instantProducts.updateQuery(
                            searchBox.state.suggestions[0].rawValue,
                          );
                        }
                      }}
                      onClose={() => {}}
                    >
                      <div className="relative">
                        <ComboboxInput
                          onFocus={() => {
                            searchBox.showSuggestions();
                          }}
                          className="w-full h-12 border rounded-sm p-4"
                          aria-label="Search"
                          placeholder="Search"
                          onChange={(event) => {
                            searchBox.updateText(event.target.value);
                            if (searchBox.state.suggestions[0]) {
                              instantProducts.updateQuery(
                                searchBox.state.suggestions[0].rawValue,
                              );
                            }
                          }}
                          onKeyDown={(
                            event: KeyboardEvent<HTMLInputElement>,
                          ) => {
                            if (event.key === 'Enter') {
                              searchBox.submit();
                            }
                          }}
                        />
                        <ComboboxButton
                          className="group absolute inset-y-0 right-0 px-2.5"
                          onClick={() => searchBox.submit()}
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
                          <ComboboxOption
                            value={searchBox.state.value}
                            className="hidden"
                          >
                            {searchBox.state.value}
                          </ComboboxOption>
                        )}
                        {searchBox.state.suggestions.map((suggestion, i) => {
                          return (
                            <ComboboxOption
                              key={suggestion.rawValue}
                              value={suggestion.rawValue}
                              className="data-[focus]:text-indigo-600 cursor-pointer p-2 z-20"
                            >
                              <span
                                dangerouslySetInnerHTML={{
                                  __html: suggestion.highlightedValue,
                                }}
                              />
                            </ComboboxOption>
                          );
                        })}
                      </ComboboxOptions>
                    </Combobox>
                    <div className="grid gap-x-8 gap-y-10 grid-cols-3 grid-rows-1 mt-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-8">
                      {instantProducts.state.products
                        .slice(0, 3)
                        .map((product) => {
                          return (
                            <ProductCard
                              key={product.permanentid}
                              product={product}
                            />
                          );
                        })}
                    </div>
                    */}
                  </div>
                </PopoverPanel>
              </Popover>

              {/* Cart */}
              <div className="ml-4 flow-root lg:ml-6">
                <button className="group -m-2 flex items-center p-2">
                  <ShoppingBagIcon
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-gray-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800">
                    0
                  </span>
                  <span className="sr-only">items in cart, view bag</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
