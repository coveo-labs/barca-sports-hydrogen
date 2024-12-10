import type {Result} from '@coveo/headless';
import {BookOpenIcon} from '@heroicons/react/20/solid';

import {NavLink} from '@remix-run/react';
import cx from '~/lib/cx';

interface ResultCardProps {
  result: Result;
}
export function ResultCard({result}: ResultCardProps) {
  const timeToRead = Math.ceil((result.raw.wordcount as number) / 200);
  const tags = (result.raw['articletags'] || []) as string[];
  return (
    <li key={result.uniqueId} className="flex justify-between gap-x-6 py-5">
      <div className="flex min-w-0 gap-x-4">
        <div className="min-w-0 flex-auto">
          <NavLink
            to={result.clickUri}
            className="text-md font-semibold text-gray-900 hover:underline"
          >
            {result.title}
          </NavLink>

          <p className="mt-1 truncate text-sm/6 font-semibold text-indigo-400">
            Reading time {timeToRead} minute{timeToRead > 1 ? 's' : ''}
          </p>

          <p className="mt-1 text-md font-semibold">
            {result.raw['ec_shortdesc'] as string}
          </p>
          <p className="mt-1 text-md text-gray-500">{result.excerpt}</p>
          <div className="flex gap-4 flex-wrap mt-1">
            {tags.map((tag) => {
              return (
                <span
                  key={tag}
                  className={cx(
                    'text-green-700 bg-green-50 ring-green-600/20',
                    'mt-0.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                  )}
                >
                  {tag}
                </span>
              );
            })}
          </div>
          <NavLink
            to={result.clickUri}
            className="mt-2 block underline text-xs/6 text-gray-500"
          >
            {decodeURIComponent(result.clickUri)}
          </NavLink>
        </div>
      </div>
      <div className="hidden shrink-0 sm:flex sm:flex-col sm:items-end">
        <p className="mt-1 truncate text-sm/6 text-indigo-400 flex">
          <BookOpenIcon width={12} className="mr-4 " />
          {result.raw.source}
        </p>
      </div>
    </li>
  );
}
