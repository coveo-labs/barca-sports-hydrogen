import type {I18nBase} from '@shopify/hydrogen';
import type {
  CountryCode,
  CurrencyCode,
} from '@shopify/hydrogen/storefront-api-types';

export interface I18nLocale extends I18nBase {
  pathPrefix: string;
  currency: CurrencyCode;
  countryName: string;
}
export const SupportedMarkets: Partial<Record<CountryCode, I18nLocale>> = {
  US: {
    country: 'US',
    language: 'EN',
    currency: 'USD',
    pathPrefix: '/en-us',
    countryName: 'united-states',
  },
  CA: {
    country: 'CA',
    language: 'EN',
    currency: 'CAD',
    pathPrefix: '/en-ca',
    countryName: 'canada',
  },
  GB: {
    country: 'GB',
    language: 'EN',
    currency: 'GBP',
    countryName: 'united-kingdom',
    pathPrefix: '/en-gb',
  },
};

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  const firstPathPart = url.pathname.split('/')[1]?.toUpperCase() ?? '';

  type I18nFromUrl = [I18nLocale['language'], I18nLocale['country']];

  let pathPrefix = '';
  let {language, country} = SupportedMarkets['US']!;

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(firstPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = firstPathPart.split('-') as I18nFromUrl;
  }

  const supportedMarket = SupportedMarkets[country] || SupportedMarkets['US']!;

  return supportedMarket;
}
