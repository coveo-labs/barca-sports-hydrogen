import {Popover, PopoverButton, PopoverPanel} from '@headlessui/react';
import {ChevronDownIcon} from '@heroicons/react/20/solid';
import type {CountryCode} from '@shopify/hydrogen/customer-account-api-types';
import {Form, useLocation, useRouteLoaderData} from 'react-router';
import {type I18nLocale, SupportedMarkets} from '~/lib/i18n';
import type {RootLoader} from '~/root';

export function CountrySelector() {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const {pathname, search} = useLocation();
  const countries = Object.keys(SupportedMarkets) as CountryCode[];

  if (!rootData) {
    return null;
  }

  const currentMarket = SupportedMarkets[rootData.locale.country];

  if (!currentMarket) {
    return null;
  }

  const strippedPathname = pathname.replace(currentMarket.pathPrefix, '');

  return (
    <Popover className="relative">
      <PopoverButton className="currency-cta flex items-center gap-x-1 text-sm/6 font-semibold text-gray-900">
        <CountryFlag {...currentMarket} />
        <ChevronDownIcon aria-hidden="true" className="size-5" />
      </PopoverButton>

      <PopoverPanel
        transition
        className="absolute left-1/2 z-10 mt-2 flex w-screen max-w-min -translate-x-1/2 px-4 transition data-[closed]:translate-y-1 data-[closed]:opacity-0 data-[enter]:duration-200 data-[leave]:duration-150 data-[enter]:ease-out data-[leave]:ease-in"
      >
        <div className="w-32 shrink rounded-xl bg-white p-4 text-sm/6 font-semibold text-gray-900 shadow-lg ring-1 ring-gray-900/5">
          {countries.map((countryKey) => {
            const countryInfo = SupportedMarkets[countryKey]!;
            const hreflang = `${countryInfo.language.toLowerCase()}-${countryInfo.country.toLowerCase()}`;

            return (
              <Form method="post" action="/locale" key={hreflang}>
                <input
                  type="hidden"
                  name="language"
                  value={countryInfo.language}
                />
                <input
                  type="hidden"
                  name="country"
                  value={countryInfo.country}
                />
                <input
                  type="hidden"
                  name="path"
                  value={`${strippedPathname}${search}`}
                />
                <button
                  className="flex items-center text-gray-700 p-2 hover:text-indigo-600"
                  type="submit"
                >
                  <CountryFlag {...countryInfo} />
                  <span className="sr-only">, change currency</span>
                </button>
              </Form>
            );
          })}
        </div>
      </PopoverPanel>
    </Popover>
  );
}

function CountryFlag({countryName, currency}: I18nLocale) {
  return (
    <>
      <img
        alt=""
        src={`https://tailwindui.com/plus-assets/img/flags/flag-${countryName!}.svg`}
        className="block h-auto w-5 shrink-0"
      />
      <span className="ml-3 block text-sm font-medium">{currency}</span>
    </>
  );
}
