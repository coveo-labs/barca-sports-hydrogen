import {MenuItem} from '@headlessui/react';
import {engineDefinition} from '~/lib/coveo.engine';
import {SortBy} from '@coveo/headless/commerce';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Sorts() {
  const sort = engineDefinition.controllers.useSort();
  return (
    <>
      {sort.state.availableSorts.map((option) => (
        <MenuItem
          key={
            option.by === SortBy.Fields
              ? option.fields[0].displayName
              : option.by
          }
        >
          <button
            onClick={() => {
              sort.methods?.sortBy(option);
            }}
            className={classNames(
              'bg-white',
              sort.methods?.isSortedBy(option)
                ? 'font-medium text-gray-900'
                : 'text-gray-500',
              'block px-4 py-2 text-sm data-[focus]:bg-gray-100 data-[focus]:outline-none w-full text-left capitalize text-nowrap',
            )}
          >
            {option.by === SortBy.Fields
              ? option.fields[0].displayName
              : option.by}
          </button>
        </MenuItem>
      ))}
    </>
  );
}
