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
};

// Additional market configurations for language variants
export const MarketLanguageVariants: Record<string, I18nLocale> = {
  'fr-ca': {
    country: 'CA',
    language: 'FR',
    currency: 'CAD',
    pathPrefix: '/fr-ca',
    countryName: 'canada',
  },
};

export function getLocaleFromURL(url: URL): I18nLocale {
  const firstPathPart = url.pathname.split('/')[1]?.toLowerCase() ?? '';

  // Check if the path matches a language variant first
  if (firstPathPart && MarketLanguageVariants[firstPathPart]) {
    return MarketLanguageVariants[firstPathPart];
  }

  // Fall back to original market handling
  const upperPathPart = firstPathPart.toUpperCase();
  type I18nFromUrl = [I18nLocale['language'], I18nLocale['country']];

  let pathPrefix = '';
  let {language, country} = SupportedMarkets['US']!;

  if (/^[A-Z]{2}-[A-Z]{2}$/i.test(upperPathPart)) {
    pathPrefix = '/' + firstPathPart;
    [language, country] = upperPathPart.split('-') as I18nFromUrl;
  }

  const supportedMarket = SupportedMarkets[country] || SupportedMarkets['US']!;
  return supportedMarket;
}

export function getLocaleFromRequest(request: Request): I18nLocale {
  const url = new URL(request.url);
  return getLocaleFromURL(url);
}
