import type {
  FacetGenerator,
  FacetGeneratorState,
} from '@coveo/headless/ssr-commerce';

import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from '@headlessui/react';
import {ChevronDownIcon, MinusIcon, PlusIcon} from '@heroicons/react/20/solid';
import {engineDefinition} from '~/lib/coveo.engine';

export function Facets() {
  const facetGenerator = engineDefinition.controllers.useFacetGenerator();
  return (
    <PopoverGroup className="-mx-4 flex items-center divide-x divide-gray-200">
      {facetGenerator.state.map((facet, sectionIdx) => {
        if (facet.type === 'regular') {
          const facetController = facetGenerator.methods?.getFacetController(
            facet.facetId,
            'regular',
          );

          return (
            <Popover
              key={facet.facetId}
              className="relative inline-block px-4 text-left"
            >
              <PopoverButton className="group inline-flex justify-center text-sm font-medium text-gray-700 hover:text-gray-900">
                <span>{facet.displayName}</span>
                {facet.hasActiveValues ? (
                  <span className="ml-1.5 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-gray-700">
                    {
                      facet.values.filter((value) => value.state === 'selected')
                        .length
                    }
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
                <form className="space-y-4">
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
                </form>
              </PopoverPanel>
            </Popover>
          );
        }
        return null;
      })}
    </PopoverGroup>
  );
}
