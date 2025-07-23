import {Popover, PopoverButton, PopoverPanel} from '@headlessui/react';
import {ChevronDownIcon} from '@heroicons/react/20/solid';
import {Form, useLocation, useRouteLoaderData} from '@remix-run/react';
import {
  type I18nLocale,
  SupportedMarkets,
  MarketLanguageVariants,
} from '~/lib/i18n';
import type {RootLoader} from '~/root';

export function CountrySelector() {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const {pathname, search} = useLocation();

  if (!rootData) {
    return null;
  }

  const markets = [
    ...Object.values(SupportedMarkets),
    ...Object.values(MarketLanguageVariants),
  ];

  const currentMarket =
    markets.find(
      (market) =>
        market.country === rootData.locale.country &&
        market.language === rootData.locale.language,
    ) || SupportedMarkets['US']!;

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
          {markets.map((market) => {
            const hreflang = `${market.language.toLowerCase()}-${market.country.toLowerCase()}`;

            return (
              <Form method="post" action="/locale" key={hreflang}>
                <input type="hidden" name="language" value={market.language} />
                <input type="hidden" name="country" value={market.country} />
                <input
                  type="hidden"
                  name="path"
                  value={`${strippedPathname}${search}`}
                />
                <button
                  className="flex items-center text-gray-700 p-2 hover:text-indigo-600"
                  type="submit"
                >
                  <CountryFlag {...market} />
                  <span className="sr-only">
                    {market.language === 'FR' ? 'Français' : 'English'}
                    {' - change currency'}
                  </span>
                </button>
              </Form>
            );
          })}
        </div>
      </PopoverPanel>
    </Popover>
  );
}

function CountryFlag({countryName, country, currency, language}: I18nLocale) {
  return (
    <>
      <img
        alt=""
        src={`https://tailwindui.com/plus-assets/img/flags/flag-${countryName!}.svg`}
        className="block h-auto w-5 shrink-0"
      />
      <span className="ml-3 block text-sm font-medium">
        {country}
        {language === 'FR' ? '-fr' : ''}
      </span>
    </>
  );
}
