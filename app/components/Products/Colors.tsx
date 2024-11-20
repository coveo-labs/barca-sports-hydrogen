import {Radio, RadioGroup} from '@headlessui/react';
import {useState} from 'react';
import type {
  ProductFragment,
  ProductVariantFragment,
} from 'storefrontapi.generated';
import cx from '~/lib/cx';

const mapColor = (color: string) => {
  switch (color.toLowerCase()) {
    case 'black':
      return 'zinc';
    case 'brown':
      return 'stone';
    case 'khaki':
      return 'yellow';
    default:
      return color.toLowerCase();
  }
};

export function Colors({
  selectedVariant,
  product,
}: {
  product: ProductFragment;
  selectedVariant: ProductVariantFragment;
}) {
  const [selectedColor, setSelectedColor] = useState(
    selectedVariant?.selectedOptions.find((option) => option.name === 'Color')
      ?.value || 'Black',
  );

  return (
    <div>
      <h3 className="text-sm text-gray-600">Color</h3>

      <fieldset aria-label="Choose a color" className="mt-2">
        <RadioGroup
          value={selectedColor}
          onChange={setSelectedColor}
          className="flex items-center space-x-3"
        >
          {product.options
            .find((opt) => opt.name === 'Color')
            ?.optionValues.map(({name: color}) => (
              <Radio
                key={color}
                value={color}
                aria-label={color}
                className={cx(
                  `ring-${mapColor(color)}-700`,
                  'relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-none data-[checked]:ring-2 data-[focus]:data-[checked]:ring data-[focus]:data-[checked]:ring-offset-1',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    `bg-${mapColor(color)}-700`,
                    'size-8 rounded-full border border-black/10',
                  )}
                />
              </Radio>
            ))}
        </RadioGroup>
      </fieldset>
    </div>
  );
}
