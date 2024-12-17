import {Radio, RadioGroup} from '@headlessui/react';
import {useState} from 'react';
import cx from '~/lib/cx';

const mapColor = (color: string) => {
  switch (color.toLowerCase()) {
    case 'black':
      return 'zinc-950';
    case 'brown':
      return 'stone-700';
    case 'khaki':
      return 'yellow-600';
    case 'silver':
      return 'zinc-100';
    case 'white':
      return 'slate-200';
    case 'yellow':
      return 'yellow-300';
    default:
      return `${color.toLowerCase()}-700`;
  }
};

export function Colors({
  currentColor,
  availableColors,
  headline = 'Color',
  onSelect,
}: {
  currentColor: string;
  availableColors: string[];
  headline?: string;
  onSelect?: (color: string) => void;
}) {
  return (
    <div>
      <h3 className="text-sm text-gray-600">{headline}</h3>

      <fieldset aria-label="Choose a color" className="mt-2">
        <RadioGroup
          value={currentColor}
          onChange={(color) => {
            onSelect?.(color);
          }}
          className="flex items-center space-x-3"
        >
          {availableColors.map((color) => (
            <Radio
              key={color}
              value={color}
              aria-label={color}
              className={cx(
                `ring-${mapColor(color)}`,
                'relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-none data-[checked]:ring-2 data-[focus]:data-[checked]:ring data-[focus]:data-[checked]:ring-offset-1',
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  'color-swatch',
                  `bg-${mapColor(color)}`,
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
