import {MagnifyingGlassIcon} from '@heroicons/react/24/outline';
import {useSearchParams} from 'react-router';

export function NoProductsFound() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-gray-100 p-6 mb-6">
        <MagnifyingGlassIcon className="h-16 w-16 text-gray-400" />
      </div>

      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
        No products found
      </h3>

      {query && (
        <p className="text-base text-gray-600 mb-6 max-w-md text-center">
          We couldn&apos;t find any products matching{' '}
          <span className="font-semibold text-gray-900">
            &quot;{query}&quot;
          </span>
        </p>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">
          Try these suggestions:
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Check your spelling or try different keywords</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Use more general terms or fewer filters</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Try browsing our categories to discover products</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
