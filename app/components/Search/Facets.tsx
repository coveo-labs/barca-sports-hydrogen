import type {
  MappedFacetState,
  RegularFacet,
  RegularFacetState,
  NumericFacetState,
  NumericFacet,
  RegularFacetValue,
  CategoryFacetState,
  CategoryFacet,
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
import {ChevronRightIcon} from '@heroicons/react/24/outline';
import {type ReactNode} from 'react';
import {engineDefinition} from '~/lib/coveo.engine';
import cx from '~/lib/cx';

type FacetGenerator = ReturnType<
  typeof engineDefinition.controllers.useFacetGenerator
>;

export function Facets({numFacetsInLine}: {numFacetsInLine: number}) {
  const facetGenerator = engineDefinition.controllers.useFacetGenerator();
  const facetsInline = facetGenerator.state.slice(0, numFacetsInLine);
  const facetsInPanel = facetGenerator.state.slice(numFacetsInLine);

  return (
    <>
      <PopoverGroup className="ml-40 flex items-center divide-x divide-gray-200 flex-wrap justify-end flex-nowrap">
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
  facetGenerator: FacetGenerator;
}) {
  return (
    <>
      {facets.map((facet) => {
        return (
          <FacetInline
            key={facet.facetId}
            facet={facet}
            numActiveValues={
              (facet.values as RegularFacetValue[]).filter(
                (value) => value.state !== 'idle',
              ).length
            }
          >
            {getFacetContent({cx: 'flex items-center', facet, facetGenerator})}
          </FacetInline>
        );
      })}
    </>
  );
}

function FacetsInPanel({
  facets,
  facetGenerator,
}: {
  facets: FacetGenerator['state'];
  facetGenerator: FacetGenerator;
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
        className="absolute z-10 mt-2 rounded-md bg-gray-50 p-4 shadow-2xl ring-1 ring-black/5 transition focus:outline-none data-[closed]:scale-95 data-[closed]:transform data-[closed]:opacity-0 data-[enter]:duration-100 data-[leave]:duration-75 data-[enter]:ease-out data-[leave]:ease-in w-screen h-screen"
      >
        <form className="bg-white divide-y divide-x divide-gray-200 overflow-hidden rounded-lg shadow grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6 mx-24 mt-4">
          {facets.map((facet, facetIdx) => {
            let border = '';
            if (facetIdx === 0) {
              border = 'border-l border-t rounded-tl-lg rounded-tr-none';
            }
            if (facetIdx === facets.length - 1) {
              border = `rounded-br-lg col-span-${6 - (facets.length % 6) + 1}`;
            }

            return (
              <FacetInPanel
                facet={facet}
                key={facet.facetId}
                cx={`group relative bg-white p-6 min-w-0 ${border}`}
              >
                {getFacetContent({
                  facet,
                  facetGenerator,
                  cx: 'space-y-6 pt-6 sm:space-y-4 sm:pt-4',
                })}
              </FacetInPanel>
            );
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
    <Popover className="relative inline-block px-4 text-left text-nowrap">
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
  cx,
  children,
}: {
  cx: string;
  facet: MappedFacetState[FacetType];
  children: ReactNode;
}) {
  return (
    <div className={cx}>
      <div className="block font-medium">{facet.displayName}</div>
      {children}
    </div>
  );
}

function getFacetContent({
  facet,
  facetGenerator,
  cx,
}: {
  facet: FacetGenerator['state'][number];
  facetGenerator: FacetGenerator;
  cx: string;
}) {
  let facetContent: ReactNode | null = null;
  switch (facet.type) {
    case 'regular':
      facetContent = (
        <RegularFacetContent
          facet={facet}
          facetController={facetGenerator.methods?.getFacetController(
            facet.facetId,
            'regular',
          )}
          cx={cx}
        />
      );
      break;
    case 'numericalRange':
      facetContent = (
        <NumericFacetContent
          facet={facet}
          facetController={facetGenerator.methods?.getFacetController(
            facet.facetId,
            'numericalRange',
          )}
          cx={cx}
        />
      );
      break;
    case 'hierarchical':
      facetContent = (
        <CategoryFacetContent
          facet={facet}
          facetController={facetGenerator.methods?.getFacetController(
            facet.facetId,
            'hierarchical',
          )}
          cx={cx}
        />
      );
      break;
    case 'dateRange':
    case 'location':
      console.log('TODO facet: ', facet.type);
  }

  return facetContent;
}

function RegularFacetContent({
  facet,
  facetController,
  cx: classes,
}: {
  facet: RegularFacetState;
  facetController?: RegularFacet;
  cx: string;
}) {
  return (
    <>
      {facet.values.map((facetValue, optionIdx) => (
        <div key={facetValue.value} className={cx(classes, 'truncate')}>
          <input
            defaultValue={facetValue.value}
            defaultChecked={facetValue.state === 'selected'}
            id={`filter-${facet.facetId}-${optionIdx}`}
            name={`${facetValue.value}[]`}
            type="checkbox"
            className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-0"
            onChange={() => {
              facetController?.toggleSelect(facetValue);
            }}
          />
          <label
            htmlFor={`filter-${facet.facetId}-${optionIdx}`}
            className="ml-3 pr-6 text-sm font-medium text-gray-900 truncate"
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
      {facet.values.map((facetValue, optionIdx) => {
        if (facetValue.numberOfResults === 0) {
          return null;
        }
        return (
          <div key={`${facetValue.start}--${facetValue.end}`} className={cx}>
            <input
              defaultValue={`${formattedValue(facetValue)}`}
              defaultChecked={facetValue.state === 'selected'}
              id={`filter-${facet.facetId}-${optionIdx}`}
              name={`${facetValue.start}--${facetValue.end}[]`}
              type="checkbox"
              className="size-4 rounded border-gray-300 text-indigo-600 focus:ring-0"
              onChange={() => {
                facetController?.toggleSelect(facetValue);
              }}
            />
            <label
              htmlFor={`filter-${facet.facetId}-${optionIdx}`}
              className="ml-3 pr-6 text-sm font-medium text-gray-900"
            >
              {`${formattedValue(facetValue)}`} ({facetValue.numberOfResults})
            </label>
          </div>
        );
      })}
    </>
  );
}

function CategoryFacetContent({
  facet,
  facetController,
  cx,
  values = facet.values,
}: {
  facet: CategoryFacetState;
  facetController?: CategoryFacet;
  cx: string;
  values?: CategoryFacetState['values'];
}) {
  return (
    <>
      {values.map((facetValue, optionIdx) => {
        const hasChildrenSelected =
          facetValue.children.find((c) => c.state === 'selected') !== undefined;
        const isSelected = facetValue.state === 'selected';
        const isLeaf = facetValue.isLeafValue;

        const isStaggered =
          facetValue.path.length > 1 &&
          (!isSelected || isLeaf) &&
          !hasChildrenSelected;

        const marginLeft = isStaggered ? '40px' : '0';

        const hasChevron =
          (facetValue.children.length > 0 && facetValue.state === 'selected') ||
          hasChildrenSelected;

        return (
          <div
            key={facetValue.value}
            style={{
              marginLeft,
            }}
            className="mt-4"
          >
            <div key={facetValue.value} className={cx}>
              <input
                defaultValue={facetValue.value}
                defaultChecked={facetValue.state === 'selected'}
                id={`filter-${facet.facetId}-${facetValue.value}-${optionIdx}`}
                name={`${facetValue.value}[]`}
                type="radio"
                className="hidden size-4 rounded border-gray-300 text-indigo-600 focus:ring-0"
                onClick={() => {
                  facetValue.state === 'selected'
                    ? facetController?.deselectAll()
                    : facetController?.toggleSelect(facetValue);
                }}
              />
              <label
                htmlFor={`filter-${facet.facetId}-${facetValue.value}-${optionIdx}`}
                className={`cursor-pointer ml-3 pr-6 text-sm text-gray-900 text-ellipsis ${
                  facetValue.state === 'selected' ? 'font-bold' : 'font-medium'
                }`}
              >
                {hasChevron && (
                  <ChevronRightIcon width={20} className="inline" />
                )}
                {facetValue.value} ({facetValue.numberOfResults})
              </label>
            </div>
            {facetValue.children.length > 0 && (
              <CategoryFacetContent
                values={facetValue.children}
                cx={cx}
                facet={facet}
                facetController={facetController}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
