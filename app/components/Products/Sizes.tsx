import {Radio, RadioGroup} from '@headlessui/react';
import {useState} from 'react';
import type {
  ProductFragment,
  ProductVariantFragment,
} from 'storefrontapi.generated';

export function Sizes({
  selectedVariant,
  product,
}: {
  selectedVariant: ProductVariantFragment;
  product: ProductFragment;
}) {
  const [selectedSize, setSelectedSize] = useState(
    selectedVariant?.selectedOptions.find((option) => option.name === 'Size')
      ?.value || 'Medium',
  );

  const sizeValues =
    product.options.find((opt) => opt.name === 'Size')?.optionValues || [];

  if (sizeValues.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Size</h2>
      </div>

      <fieldset aria-label="Choose a size" className="mt-2">
        <RadioGroup
          value={selectedSize}
          onChange={setSelectedSize}
          className="grid grid-cols-3 gap-3 sm:grid-cols-6"
        >
          {sizeValues.map(({name: size}) => (
            <Radio
              key={size}
              value={size}
              className={
                'cursor-pointer focus:outline-none flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-3 text-sm font-medium uppercase text-gray-900 hover:bg-gray-50 data-[checked]:border-transparent data-[checked]:bg-indigo-600 data-[checked]:text-white data-[focus]:ring-2 data-[focus]:ring-indigo-500 data-[focus]:ring-offset-2 data-[checked]:hover:bg-indigo-700 sm:flex-1'
              }
            >
              {size}
            </Radio>
          ))}
        </RadioGroup>
      </fieldset>
    </div>
  );
}
