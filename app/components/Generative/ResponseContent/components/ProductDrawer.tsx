import {NavLink} from 'react-router';
import {Money} from '@shopify/hydrogen';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import {Dialog, DialogPanel, Transition, TransitionChild} from '@headlessui/react';
import {XMarkIcon} from '@heroicons/react/24/outline';
import {Fragment} from 'react';
import {A2UIAddToCartButton} from './A2UIAddToCartButton';

/**
 * Parse Color and Size from a Coveo ec_name variant string.
 * Expected format: "Base Name - Color" or "Base Name - Color / Size"
 * e.g. "HydroGlide Inflatable Paddleboard - Yellow" → {Color: 'Yellow'}
 * e.g. "VividDenim Short - Green / L" → {Color: 'Green', Size: 'L'}
 */
function parseVariantsFromName(name: string): {Color?: string; Size?: string} {
  const dashIdx = name.lastIndexOf(' - ');
  if (dashIdx === -1) return {};
  const variantPart = name.slice(dashIdx + 3);
  const parts = variantPart.split(' / ').map((p) => p.trim()).filter(Boolean);
  return {
    ...(parts[0] ? {Color: parts[0]} : {}),
    ...(parts[1] ? {Size: parts[1]} : {}),
  };
}

interface ProductDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  name: string;
  brand?: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  description?: string;
  category?: string;
  rating?: number;
  productUrl: string;
}

export function ProductDrawer({
  isOpen,
  onClose,
  productId,
  name,
  brand,
  imageUrl,
  price,
  originalPrice,
  currency = 'USD',
  description,
  category,
  productUrl,
}: ProductDrawerProps) {
  const hasPromo = originalPrice !== undefined && originalPrice > price;

  const {Color, Size} = parseVariantsFromName(name);
  const params = new URLSearchParams();
  if (Color) params.set('Color', Color);
  if (Size) params.set('Size', Size);
  const qs = params.toString();
  const resolvedUrl = productUrl ? `${productUrl}${qs ? `?${qs}` : ''}` : '#';

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </TransitionChild>

        {/* Drawer panel */}
        <TransitionChild
          as={Fragment}
          enter="transform transition ease-out duration-300"
          enterFrom="translate-x-full"
          enterTo="translate-x-0"
          leave="transform transition ease-in duration-200"
          leaveFrom="translate-x-0"
          leaveTo="translate-x-full"
        >
          <DialogPanel className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl flex flex-col overflow-y-auto">
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 z-10 rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* Product image */}
            <div className="w-3xs aspect-square bg-gray-100 flex-shrink-0">
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-4 flex-1">
              {/* Name + brand */}
              <div>
                {/* {category && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {category}
                  </span>
                )} */}
                <h2 className="mt-2 text-lg font-semibold text-gray-900 leading-snug">
                  {name}
                </h2>
                {brand && (
                  <p className="text-sm text-gray-400 mt-0.5">Brand: {brand}</p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-gray-900">
                  <Money
                    data={{
                      amount: price.toString(),
                      currencyCode: currency as CurrencyCode,
                    }}
                  />
                </span>
                {hasPromo && (
                  <span className="text-base text-gray-400 line-through">
                    <Money
                      data={{
                        amount: originalPrice!.toString(),
                        currencyCode: currency as CurrencyCode,
                      }}
                    />
                  </span>
                )}
              </div>

              {/* Description */}
              {description && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">
                    Description
                  </p>
                  <p className="mt-1 text-xs text-gray-500 line-clamp-4">
                    {description}
                  </p>
                </div>
              )}

              {/* CTAs — pushed to bottom */}
              <div className="mt-4 flex flex-col gap-2 pt-4">
                <A2UIAddToCartButton
                  variant="full"
                  item={{
                    merchandiseId: productId,
                    name,
                    price,
                    currency,
                  }}
                />
                <NavLink
                  to={resolvedUrl}
                  onClick={onClose}
                  className="block w-full text-center text-sm font-medium text-gray-700 border border-gray-300 rounded-full py-2.5 hover:bg-gray-50 transition-colors"
                >
                  Go to Product Page
                </NavLink>
              </div>
            </div>
          </DialogPanel>
        </TransitionChild>
      </Dialog>
    </Transition>
  );
}
