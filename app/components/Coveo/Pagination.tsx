import {engineDefinition} from '~/lib/coveo.engine';

export function PaginationFooter() {
  const summary = engineDefinition.controllers.useSummary();
  const pagination = engineDefinition.controllers.usePagination();
  return (
    <div className="flex justify-between">
      <div className="text-sm text-gray-700 self-center mr-auto">
        Showing{' '}
        <span className="font-medium">{summary.state.firstProduct}</span> to{' '}
        <span className="font-medium">{summary.state.lastProduct}</span> of{' '}
        <span className="font-medium">
          {summary.state.totalNumberOfProducts}
        </span>{' '}
        products
      </div>
      {pagination.state.totalPages > 1 && (
        <div>
          <button
            onClick={() => {
              pagination.methods?.previousPage();
              scrollTo({top: 0, behavior: 'smooth'});
            }}
            className="relative inline-flex items-center rounded-md border border-gray-300  px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={() => {
              pagination.methods?.nextPage();
              scrollTo({top: 0, behavior: 'smooth'});
            }}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300  px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
