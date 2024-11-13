import type {
  FacetGenerator,
  FacetGeneratorState,
} from '@coveo/headless/ssr-commerce';

import {Disclosure, DisclosureButton, DisclosurePanel} from '@headlessui/react';
import {MinusIcon, PlusIcon} from '@heroicons/react/20/solid';
import {engineDefinition} from '~/lib/coveo.engine';

export function Facets() {
  const facetGenerator = engineDefinition.controllers.useFacetGenerator();
  return (
    <>
      {facetGenerator.state.map((facet) => {
        if (facet.type === 'regular') {
          const facetController = facetGenerator.methods?.getFacetController(
            facet.facetId,
            'regular',
          );

          return (
            <Disclosure
              key={facet.facetId}
              as="div"
              className="border-b border-gray-200 py-6"
            >
              <h3 className="-my-3 flow-root">
                <DisclosureButton className="group flex w-full items-center justify-between bg-white py-3 text-sm text-gray-400 hover:text-gray-500">
                  <span className="font-medium text-gray-900">
                    {facet.displayName}
                  </span>
                  <span className="ml-6 flex items-center">
                    <PlusIcon
                      aria-hidden="true"
                      className="h-5 w-5 group-data-[open]:hidden"
                    />
                    <MinusIcon
                      aria-hidden="true"
                      className="h-5 w-5 [.group:not([data-open])_&]:hidden"
                    />
                  </span>
                </DisclosureButton>
              </h3>
              <DisclosurePanel className="pt-6">
                <div className="space-y-4">
                  {facet.values.map((facetValue, facetValueIdx) => (
                    <div key={facetValue.value} className="flex items-center">
                      <input
                        defaultValue={facetValue.value}
                        defaultChecked={facetValue.state === 'selected'}
                        id={`filter-${facet.facetId}-${facetValueIdx}`}
                        name={`${facet.facetId}[]`}
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        onChange={() => {
                          facetController?.toggleSelect(facetValue);
                        }}
                      />
                      <label
                        htmlFor={`filter-${facet.facetId}-${facetValueIdx}`}
                        className="ml-3 text-sm text-gray-600"
                      >
                        {facetValue.value} ({facetValue.numberOfResults})
                      </label>
                    </div>
                  ))}
                </div>
              </DisclosurePanel>
            </Disclosure>
          );
        }
        return null;
      })}
    </>
  );
}
