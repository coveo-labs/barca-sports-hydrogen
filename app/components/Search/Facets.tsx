import type {
  FacetGenerator,
  MappedFacetState,
  RegularFacet,
  RegularFacetState,
  NumericFacetState,
  NumericFacet,
  RegularFacetValue,
} from '@coveo/headless/ssr-commerce';

import {
  Popover,
  PopoverButton,
  PopoverGroup,
  PopoverPanel,
} from '@headlessui/react';
import {
  ChevronDownIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/20/solid';
import type {ReactNode} from 'react';
import {engineDefinition} from '~/lib/coveo.engine';

export function Facets() {
  const facetGenerator = engineDefinition.controllers.useFacetGenerator();
  const facetsInline = facetGenerator.state.slice(0, 6);
  const facetsInPanel = facetGenerator.state.slice(6);

  return (
    <>
      <PopoverGroup className="ml-40 flex items-center divide-x divide-gray-200 flex-wrap justify-end">
        <FacetsInline facets={facetsInline} facetGenerator={facetGenerator} />
        <FacetsInPanel facets={facetsInPanel} facetGenerator={facetGenerator} />
      </PopoverGroup>
    </>
  );
}

function FacetsInline({
  facets,
  facetGenerator,
}: {
  facets: FacetGenerator['state'];
  facetGenerator: ReturnType<
    typeof engineDefinition.controllers.useFacetGenerator
  >;
}) {
  return (
    <>
      {facets.map((facet) => {
        if (facet.type === 'regular') {
          const facetController = facetGenerator.methods?.getFacetController(
            facet.facetId,
            'regular',
          );

          return (
            <FacetInline
              key={facet.facetId}
              facet={facet}
              numActiveValues={
                facet.values.filter((value) => value.state === 'selected')
                  .length
              }
            >
              <RegularFacetContent
                facet={facet}
                facetController={facetController}
                cx="flex items-center"
              />
            </FacetInline>
          );
        }

        if (facet.type === 'numericalRange') {
          const facetController = facetGenerator.methods?.getFacetController(
            facet.facetId,
            'numericalRange',
          );

          return (
            <FacetInline
              key={facet.facetId}
              numActiveValues={
                facet.values.filter((value) => value.state === 'selected')
                  .length
              }
              facet={facet}
            >
              <NumericFacetContent
                facet={facet}
                facetController={facetController}
                cx="flex items-center"
              />
            </FacetInline>
          );
        }
        return null;
      })}
    </>
  );
}

function FacetsInPanel({
  facets,
  facetGenerator,
}: {
  facets: FacetGenerator['state'];
  facetGenerator: ReturnType<
    typeof engineDefinition.controllers.useFacetGenerator
  >;
}) {
  if (facets.length === 0) {
    return null;
  }
  const numActiveValues = facets.reduce((acc, f) => {
    return (
      (f.values as RegularFacetValue[]).filter(
        (v) => v && v.state && v.state !== 'idle',
      ).length + acc
    );
  }, 0);

  return (
    <Popover
      as="section"
      aria-labelledby="filter-heading"
      className="relative grid items-center"
    >
      <h2 id="filter-heading" className="sr-only">
        Filters
      </h2>
      <div className="relative col-start-1 row-start-1">
        <div className="mx-auto flex max-w-7xl space-x-6 divide-x divide-gray-200 px-4 text-sm sm:px-6 lg:px-8">
          <div>
            <PopoverButton className="group flex items-center font-medium text-gray-700">
              <AdjustmentsHorizontalIcon
                aria-hidden="true"
                className="mr-2 size-5 flex-none text-gray-400 group-hover:text-gray-500"
              />
              {numActiveValues > 0 && (
                <span className="ml-1.5 rounded bg-gray-200 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-gray-700">
                  {numActiveValues}
                </span>
              )}
            </PopoverButton>
          </div>
        </div>
      </div>

      <PopoverPanel
        transition
        anchor="top end"
        className="absolute z-10 mt-2 rounded-md bg-white p-4 shadow-2xl ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in w-max"
      >
        <form
          style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}
          className="mx-auto grid max-w-7xl gap-10 p-4"
        >
          {facets.map((facet) => {
            if (facet.type === 'regular') {
              const facetController =
                facetGenerator.methods?.getFacetController(
                  facet.facetId,
                  'regular',
                );

              return (
                <fieldset key={facet.facetId}>
                  <legend className="block font-medium">
                    {facet.displayName}
                  </legend>
                  <RegularFacetContent
                    cx="space-y-6 pt-6 sm:space-y-4 sm:pt-4"
                    facet={facet}
                    facetController={facetController}
                  />
                </fieldset>
              );
            }
            if (facet.type === 'numericalRange') {
              const facetController =
                facetGenerator.methods?.getFacetController(
                  facet.facetId,
                  'numericalRange',
                );
              return (
                <fieldset key={facet.facetId}>
                  <legend className="block font-medium">
                    {facet.displayName}
                  </legend>
                  <NumericFacetContent
                    cx="space-y-6 pt-6 sm:space-y-4 sm:pt-4"
                    facet={facet}
                    facetController={facetController}
                  />
                </fieldset>
              );
            }
            return null;
          })}
        </form>
      </PopoverPanel>
    </Popover>
  );
}

function FacetInline<FacetType extends keyof MappedFacetState>({
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

function FacetInPanel<FacetType extends keyof MappedFacetState>({
  facet,
}: {
  facet: MappedFacetState[FacetType];
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="block font-medium">{facet.displayName}</legend>
      <RegularFacetContent
        cx="space-y-6 pt-6 sm:space-y-4 sm:pt-4"
        facet={facet}
        facetController={facetController}
      />
    </fieldset>
  );
}

function RegularFacetContent({
  facet,
  facetController,
  cx,
}: {
  facet: RegularFacetState;
  facetController?: RegularFacet;
  cx: string;
}) {
  return (
    <>
      {facet.values.map((facetValue, optionIdx) => (
        <div key={facetValue.value} className={cx}>
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
  );
}

function NumericFacetContent({
  facet,
  facetController,
  cx,
}: {
  facet: NumericFacetState;
  facetController?: NumericFacet;
  cx: string;
}) {
  const formattedValue =
    ['ec_price', 'ec_promo_price'].indexOf(facet.field) !== -1
      ? (value: {start: number; end: number}) => {
          const asMoney = (value: number) => {
            return value.toLocaleString('en', {
              style: 'currency',
              compactDisplay: 'short',
              maximumFractionDigits: 0,
              currency: 'USD',
            });
          };
          return `${asMoney(value.start)} to ${asMoney(value.end)}`;
        }
      : (value: {start: number; end: number}) =>
          `${value.start} to ${value.end}`;

  return (
    <>
      {facet.values.map((facetValue, optionIdx) => (
        <div key={`${facetValue.start}--${facetValue.end}`} className={cx}>
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
            {`${formattedValue(facetValue)}`} ({facetValue.numberOfResults})
          </label>
        </div>
      ))}
    </>
  );
}
