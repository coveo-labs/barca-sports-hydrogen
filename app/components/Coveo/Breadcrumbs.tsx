import type {BreadcrumbValue} from '@coveo/headless-react/ssr';
import type {
  CategoryFacetValue,
  DateFacetValue,
  LocationFacetValue,
  NumericFacetValue,
  RegularFacetValue,
} from '@coveo/headless-react/ssr-commerce';
import {useBreadcrumbManager} from '~/lib/coveo.engine';

type AnyFacet =
  | RegularFacetValue
  | LocationFacetValue
  | NumericFacetValue
  | DateFacetValue
  | CategoryFacetValue;

export function Breadcrumbs() {
  const breadcrumbs = useBreadcrumbManager();
  const flatBreadcrumbs = breadcrumbs.state.facetBreadcrumbs.flatMap(
    (facetBreadcrumb) => {
      return facetBreadcrumb.values;
    },
  );
  if (flatBreadcrumbs.length === 0) {
    return null;
  }
  return (
    <div className="bg-gray-100">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:flex sm:items-center sm:px-6 lg:px-8">
        <h3 className="text-sm font-medium text-gray-500">
          Filters
          <span className="sr-only">, active</span>
        </h3>

        <div
          aria-hidden="true"
          className="hidden h-5 w-px bg-gray-300 sm:ml-4 sm:block"
        />

        <div className="mt-2 sm:ml-4 sm:mt-0">
          <div className="-m-1 flex flex-wrap items-center">
            {flatBreadcrumbs.map((facetBreadcrumb, i) => {
              let display = '';
              if (isBreadcrumbWithSimpleValue(facetBreadcrumb)) {
                display = facetBreadcrumb.value.value;
              }
              if (isBreadcrumbWithRangeValue(facetBreadcrumb)) {
                display = `${facetBreadcrumb.value.start} - ${facetBreadcrumb.value.end}`;
              }

              return (
                <span
                  key={`facet-breadcrumb-${i}`}
                  className="m-1 inline-flex items-center rounded-full border border-gray-200 bg-white py-1.5 pl-3 pr-2 text-sm font-medium text-gray-900"
                >
                  <span>{display}</span>
                  <button
                    onClick={() => facetBreadcrumb.deselect()}
                    type="button"
                    className="ml-1 inline-flex size-4 shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-500"
                  >
                    <span className="sr-only">Remove filter for {display}</span>
                    <svg
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 8 8"
                      className="size-2"
                    >
                      <path
                        d="M1 1l6 6m0-6L1 7"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function isBreadcrumbWithSimpleValue(
  breadcrumb: BreadcrumbValue<AnyFacet>,
): breadcrumb is BreadcrumbValue<
  RegularFacetValue | LocationFacetValue | CategoryFacetValue
> {
  return (
    (
      breadcrumb.value as
        | RegularFacetValue
        | LocationFacetValue
        | CategoryFacetValue
    ).value !== undefined
  );
}

function isBreadcrumbWithRangeValue(
  breadcrumb: BreadcrumbValue<AnyFacet>,
): breadcrumb is BreadcrumbValue<NumericFacetValue | DateFacetValue> {
  return (
    (breadcrumb.value as NumericFacetValue | DateFacetValue).start !== undefined
  );
}
