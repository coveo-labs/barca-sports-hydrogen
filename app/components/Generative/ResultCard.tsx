import type {Result} from '@coveo/headless';
import {BookOpenIcon} from '@heroicons/react/20/solid';

import {NavLink} from '@remix-run/react';

interface ResultCardProps {
  result: Result;
}
export function ResultCard({result}: ResultCardProps) {
  return (
    <li key={result.uniqueId} className="flex justify-between gap-x-6 py-5">
      <div className="flex min-w-0 gap-x-4">
        <div className="min-w-0 flex-auto">
          <p className="text-md font-semibold text-gray-900">{result.title}</p>
          <p className="mt-1 truncate text-sm/6 underline text-gray-500 flex">
            <BookOpenIcon width={12} className="mr-4 text-indigo-400" />
            {result.raw.source}
          </p>

          <p className="mt-1 text-md text-gray-500">{result.excerpt}</p>
        </div>
      </div>
      <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
        <p className="text-sm/6 text-gray-900">{result.raw.objecttype}</p>
        <p className="text-sm/6 text-gray-900">
          {new Date(result.raw.date!).toLocaleDateString()}
        </p>
      </div>
    </li>
  );
}
