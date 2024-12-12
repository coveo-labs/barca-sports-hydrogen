import {Await, useRouteLoaderData} from '@remix-run/react';
import type {HeaderQuery, CartApiQueryFragment} from 'storefrontapi.generated';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Popover,
  PopoverBackdrop,
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
import BarcaLogo from '~/assets/barca-logo.svg';
import {Fragment, Suspense, useState} from 'react';
import {StandaloneSearchBox} from './Search/StandaloneSearchBox';
import {CountrySelector} from './CountrySelector';
import type {RootLoader} from '~/root';
import {NavLinkWithLocale, relativeLink} from './NavLinkWithLocale';
interface HeaderProps {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  publicStoreDomain: string;
}
export function Header({header, cart}: HeaderProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <MenuDesktop header={header} setOpen={setOpen} cart={cart} />
      <MenuMobile header={header} open={open} setOpen={setOpen} />
    </>
  );
}

interface MenuMobileProps {
  header: HeaderQuery;
  open: boolean;
  setOpen: (open: boolean) => void;
}
function MenuMobile({header, open, setOpen}: MenuMobileProps) {
  const {menu, collections} = header;

  return (
    <Dialog open={open} onClose={setOpen} className="relative z-40 lg:hidden">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black bg-opacity-25 transition-opacity duration-300 ease-linear data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 z-40 flex">
        <DialogPanel
          transition
          className="relative flex w-full max-w-xs transform flex-col overflow-y-auto bg-white pb-12 shadow-xl transition duration-300 ease-in-out data-[closed]:-translate-x-full"
        >
          <div className="flex px-4 pb-2 pt-5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="relative -m-2 inline-flex items-center justify-center rounded-md p-2 text-gray-400"
            >
              <span className="absolute -inset-0.5" />
              <span className="sr-only">Close menu</span>
              <XMarkIcon aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
          <TabGroup className="mt-2">
            <div className="border-b border-gray-200">
              <TabList className="-mb-px flex space-x-8 px-4">
                {menu?.items.map((menuItem) => {
                  if (menuItem.items.length === 0) {
                    return null;
                  }
                  return (
                    <Tab
                      key={menuItem.id}
                      className="flex-1 whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-base font-medium text-gray-900 data-[selected]:border-indigo-600 data-[selected]:text-indigo-600"
                    >
                      {menuItem.title}
                    </Tab>
                  );
                })}
              </TabList>
            </div>
            <TabPanels as={Fragment}>
              {menu?.items.map((menuItem) => {
                const currentCollection = collections.edges.find(
                  (collection) => collection.node.title === menuItem.title,
                );

                if (menuItem.items.length === 0) {
                  return null;
                }

                return (
                  <TabPanel
                    key={menuItem.id}
                    className="space-y-10 px-4 pb-8 pt-10"
                  >
                    <div className="grid grid-cols-1 gap-x-4">
                      <div
                        key={currentCollection?.node.id}
                        className="group relative text-sm"
                      >
                        <div className="aspect-h-1 aspect-w-1 overflow-hidden rounded-lg bg-gray-100 group-hover:opacity-75">
                          <img
                            alt={menuItem.title}
                            src={currentCollection?.node.image?.url!}
                            className="object-cover object-center"
                          />
                        </div>
                        <NavLinkWithLocale
                          to={relativeLink(menuItem.url!)}
                          className="mt-6 block font-medium text-gray-900"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 z-10"
                          />
                          Shop all {currentCollection?.node.title}
                        </NavLinkWithLocale>
                      </div>
                    </div>
                    {menuItem.items.map((subItem) => (
                      <div key={subItem.id}>
                        <NavLinkWithLocale
                          to={relativeLink(subItem.url!)}
                          id={`${subItem.id}-${subItem.id}-heading-mobile`}
                          className="font-medium text-gray-900"
                        >
                          {subItem.title}
                        </NavLinkWithLocale>
                        <ul
                          aria-labelledby={`${subItem.id}-${subItem.id}-heading-mobile`}
                          className="mt-6 flex flex-col space-y-6"
                        >
                          {subItem.items.map((leafItems) => (
                            <li key={leafItems.id} className="flow-root">
                              <NavLinkWithLocale
                                to={relativeLink(leafItems.url!)}
                                className="-m-2 block p-2 text-gray-500"
                              >
                                {leafItems.title}
                              </NavLinkWithLocale>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </TabPanel>
                );
              })}
            </TabPanels>
          </TabGroup>

          <div className="space-y-6 border-t border-gray-200 px-4 py-6">
            {menu?.items
              .filter((menuItem) => menuItem.items.length === 0)
              .map((topMenuItem) => {
                return (
                  <div key={topMenuItem.id} className="flow-root">
                    <NavLinkWithLocale
                      to={relativeLink(topMenuItem.url!)}
                      className="-m-2 block p-2 font-medium text-gray-900"
                    >
                      {topMenuItem.title}
                    </NavLinkWithLocale>
                  </div>
                );
              })}
            <div className="flow-root">
              <button className="-m-2 block p-2 font-medium text-gray-900">
                Sign in
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-6">
            <button className="-m-2 flex items-center p-2">
              <img
                alt=""
                src="https://tailwindui.com/plus/img/flags/flag-canada.svg"
                className="block h-auto w-5 shrink-0"
              />
              <span className="ml-3 block text-base font-medium text-gray-900">
                CAD
              </span>
              <span className="sr-only">, change currency</span>
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

interface MenuDesktopProps {
  header: HeaderQuery;
  setOpen: (open: boolean) => void;
  cart: Promise<CartApiQueryFragment | null>;
}
function MenuDesktop({header, setOpen, cart}: MenuDesktopProps) {
  const {shop, menu, collections} = header;
  const rootData = useRouteLoaderData<RootLoader>('root');

  return (
    <header className="sticky top-0 z-10 bg-white">
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
              <NavLinkWithLocale to="/">
                <span className="sr-only">{shop.name}</span>
                <img
                  src={BarcaLogo}
                  className="h-8 w-auto"
                  sizes="200"
                  alt="Barca logo"
                />
              </NavLinkWithLocale>
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
                      <NavLinkWithLocale
                        className="relative z-10 -mb-px flex items-center border-b-2 border-transparent pt-px text-sm font-medium text-gray-700 transition-colors duration-200 ease-out hover:text-gray-800 data-[open]:border-indigo-600 data-[open]:text-indigo-600 focus:outline-none"
                        key={menuItem.id}
                        to={relativeLink(menuItem.url!)}
                      >
                        {menuItem.title}
                      </NavLinkWithLocale>
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
                                  <PopoverButton
                                    as={NavLinkWithLocale}
                                    to={relativeLink(menuItem.url!)}
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
                                  </PopoverButton>
                                </div>
                              </div>
                              <div className="row-start-1 grid grid-cols-3 gap-x-8 gap-y-10 text-sm">
                                {menuItem.items.map((subMenuItem) => {
                                  return (
                                    <div key={subMenuItem.id}>
                                      <PopoverButton
                                        as={NavLinkWithLocale}
                                        key={subMenuItem.id}
                                        to={relativeLink(subMenuItem.url!)}
                                        className="font-medium text-gray-900 hover:underline"
                                      >
                                        {subMenuItem.title}
                                      </PopoverButton>
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
                                              <PopoverButton
                                                as={NavLinkWithLocale}
                                                to={relativeLink(
                                                  leafMenuItem.url!,
                                                )}
                                                className="-m-2 block p-2 text-gray-500 hover:text-gray-800 hover:underline"
                                              >
                                                {leafMenuItem.title}
                                              </PopoverButton>
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
                <NavLinkWithLocale
                  className="text-sm font-medium text-gray-700 hover:text-gray-800 flex items-center gap-x-4"
                  to="/account"
                >
                  <div>
                    {rootData?.loggedIn
                      ? `Welcome back, ${rootData.customerDisplayName}`
                      : 'Sign in'}
                  </div>
                  <div>
                    {rootData?.loggedIn ? (
                      <img
                        alt=""
                        src={rootData.customerImageUrl}
                        className="size-8 rounded-full bg-gray-800"
                      />
                    ) : null}
                  </div>
                </NavLinkWithLocale>
                <span aria-hidden="true" className="h-6 w-px bg-gray-200" />
              </div>

              <div className="hidden lg:ml-8 lg:flex">
                <CountrySelector />
              </div>

              {/* Search */}

              <Popover className="flex lg:ml-6">
                <PopoverBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20" />
                <PopoverButton className="rp-2 text-gray-400 hover:text-gray-500 data-[open]:border-indigo-600 data-[open]:text-indigo-600 focus:outline-none">
                  <span className="sr-only">Search</span>
                  <MagnifyingGlassIcon aria-hidden="true" className="h-6 w-6" />
                </PopoverButton>

                <PopoverPanel
                  transition
                  className="absolute bg-white inset-x-0 top-fulltext-sm text-gray-500 transition data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150 data-[enter]:ease-out data-[leave]:ease-in"
                >
                  {({close}) => (
                    <>
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 top-1/2 bg-white shadow"
                      />
                      <div className="relative -top-1 bg-white mx-auto max-w-7xl p-0 z-50">
                        <StandaloneSearchBox close={close} />
                      </div>
                    </>
                  )}
                </PopoverPanel>
              </Popover>

              {/* Cart */}
              <div className="ml-4 flow-root lg:ml-6">
                <NavLinkWithLocale
                  to="/cart"
                  className="group -m-2 flex items-center p-2"
                >
                  <ShoppingBagIcon
                    aria-hidden="true"
                    className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-gray-500"
                  />
                  <Suspense>
                    <Await resolve={cart}>
                      {(cartLoaded) => (
                        <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-800">
                          {cartLoaded?.totalQuantity}
                        </span>
                      )}
                    </Await>
                  </Suspense>
                  <span className="sr-only">items in cart, view bag</span>
                </NavLinkWithLocale>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
