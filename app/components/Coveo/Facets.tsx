import type {MappedFacetState} from '@coveo/headless/ssr-commerce';

import {
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from '@headlessui/react';
import {ChevronDownIcon} from '@heroicons/react/20/solid';
import type {ReactNode} from 'react';
import {engineDefinition} from '~/lib/coveo.engine';

export function Facets() {
  const facetGenerator = engineDefinition.controllers.useFacetGenerator();
  return (
    <PopoverGroup className="-mx-4 flex items-center divide-x divide-gray-200">
      {facetGenerator.state.map((facet) => {
        if (facet.type === 'regular') {
          const facetController = facetGenerator.methods?.getFacetController(
            facet.facetId,
            'regular',
          );

          return (
            <FacetPopover
              key={facet.facetId}
              facet={facet}
              numActiveValues={
                facet.values.filter((value) => value.state === 'selected')
                  .length
              }
            >
              <>
                {facet.values.map((facetValue, optionIdx) => (
                  <div key={facetValue.value} className="flex items-center">
                    <input
                      defaultValue={facetValue.value}
                      defaultChecked={facetValue.state === 'selected'}
                      id={`filter-${facet.facetId}-${optionIdx}`}
                      name={`${facetValue.value}[]`}
                      type="checkbox"
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={() => {
                        facetController?.toggleSelect(facetValue);
                      }}
                    />
                    <label
                      htmlFor={`filter-${facet.facetId}-${optionIdx}`}
                      className="ml-3 whitespace-nowrap pr-6 text-sm font-medium text-gray-900"
                    >
                      {facetValue.value} ({facetValue.numberOfResults})
                    </label>
                  </div>
                ))}
              </>
            </FacetPopover>
          );
        }

        if (
          facet.type === 'numericalRange' &&
          (facet.field === 'ec_price' || facet.field === 'ec_promo_price')
        ) {
          const facetController = facetGenerator.methods?.getFacetController(
            facet.facetId,
            'numericalRange',
          );

          const formattedValue = (value: {start: number; end: number}) => {
            const asMoney = (value: number) => {
              return value.toLocaleString('en', {
                style: 'currency',
                compactDisplay: 'short',
                maximumFractionDigits: 0,
                currency: 'USD',
              });
            };
            return `${asMoney(value.start)} to ${asMoney(value.end)}`;
          };

          return (
            <FacetPopover
              key={facet.facetId}
              numActiveValues={
                facet.values.filter((value) => value.state === 'selected')
                  .length
              }
              facet={facet}
            >
              <>
                {facet.values.map((facetValue, optionIdx) => (
                  <div
                    key={`${facetValue.start}--${facetValue.end}`}
                    className="flex items-center"
                  >
                    <input
                      defaultValue={`${formattedValue(facetValue)}`}
                      defaultChecked={facetValue.state === 'selected'}
                      id={`filter-${facet.facetId}-${optionIdx}`}
                      name={`${facetValue.start}--${facetValue.end}[]`}
                      type="checkbox"
                      className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={() => {
                        facetController?.toggleSelect(facetValue);
                      }}
                    />
                    <label
                      htmlFor={`filter-${facet.facetId}-${optionIdx}`}
                      className="ml-3 whitespace-nowrap pr-6 text-sm font-medium text-gray-900"
                    >
                      {`${formattedValue(facetValue)}`} (
                      {facetValue.numberOfResults})
                    </label>
                  </div>
                ))}
              </>
            </FacetPopover>
          );
        }
        return null;
      })}
    </PopoverGroup>
  );
}

function FacetPopover<FacetType extends keyof MappedFacetState>({
  children,
  facet,
  numActiveValues,
}: {
  numActiveValues: number;
  children: ReactNode;
  facet: MappedFacetState[FacetType];
}) {
  return (
    <Popover className="relative inline-block px-4 text-left">
      <PopoverButton className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
        <span>{facet.displayName}</span>
        {facet.hasActiveValues ? (
          <span className="ml-1.5 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-gray-700">
            {numActiveValues}
          </span>
        ) : null}
        <ChevronDownIcon
          aria-hidden="true"
          className="-mr-1 ml-1 size-5 shrink-0 text-gray-400 group-hover:text-gray-500"
        />
      </PopoverButton>
      <PopoverPanel
        transition
        className="absolute right-0 z-10 mt-2 origin-top-right rounded-md bg-white p-4 shadow-2xl ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in"
      >
        <form className="space-y-4">{children}</form>
      </PopoverPanel>
    </Popover>
  );
}
