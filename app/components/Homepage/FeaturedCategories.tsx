import {NavLink} from '@remix-run/react';
import type {HeaderQuery} from 'storefrontapi.generated';

interface FeaturedCategoriesProps {
  header: HeaderQuery;
}
export function FeaturedCategories({header}: FeaturedCategoriesProps) {
  return (
    <section aria-labelledby="category-heading" className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="sm:flex sm:items-baseline sm:justify-between">
          <h2
            id="category-heading"
            className="text-2xl font-bold tracking-tight text-gray-900"
          >
            Shop by Category
          </h2>
          <NavLink
            to="/categories"
            className="hidden text-sm font-semibold text-indigo-600 hover:text-indigo-500 sm:block"
          >
            Browse all categories
            <span aria-hidden="true"> &rarr;</span>
          </NavLink>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-6 lg:gap-8">
          {header.collections.edges.map((collection, i) => {
            if (collection.node.title === 'Home page') {
              return null;
            }
            if (collection.node.title === 'Accessories') {
              return (
                <div
                  key={collection.node.id}
                  className="group aspect-h-1 aspect-w-2 overflow-hidden rounded-lg sm:aspect-h-1 sm:aspect-w-1 sm:row-span-2"
                >
                  <img
                    height={550}
                    width={550}
                    loading="lazy"
                    alt={collection.node.title}
                    src={collection.node.image?.url}
                    className="object-cover object-center group-hover:opacity-75"
                  />
                  <div
                    aria-hidden="true"
                    className="bg-gradient-to-b from-transparent to-black opacity-50"
                  />
                  <div className="flex items-end p-6">
                    <div>
                      <h3 className="font-semibold text-white">
                        <NavLink
                          to={`/plp/${collection.node.title.toLowerCase()}`}
                        >
                          <span className="absolute inset-0" />
                          {collection.node.title}
                        </NavLink>
                      </h3>
                      <p aria-hidden="true" className="mt-1 text-sm text-white">
                        Shop now
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            return (
              <div
                key={collection.node.id}
                className="group aspect-h-1 aspect-w-2 overflow-hidden rounded-lg sm:aspect-none sm:relative sm:h-full"
              >
                <img
                  height={259}
                  width={550}
                  loading="lazy"
                  alt={collection.node.title}
                  src={collection.node.image?.url}
                  className="object-cover object-center group-hover:opacity-75 sm:absolute sm:inset-0 sm:size-full"
                />
                <div
                  aria-hidden="true"
                  className="bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0"
                />
                <div className="flex items-end p-6 sm:absolute sm:inset-0">
                  <div>
                    <h3 className="font-semibold text-white">
                      <NavLink
                        to={`/plp/${collection.node.title
                          .toLowerCase()
                          .replaceAll('&', '')
                          .replaceAll(' ', '-')
                          .replaceAll('--', '-')}`}
                      >
                        <span className="absolute inset-0" />
                        {collection.node.title}
                      </NavLink>
                    </h3>
                    <p aria-hidden="true" className="mt-1 text-sm text-white">
                      Shop now
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 sm:hidden">
          <NavLink
            to="#"
            className="block text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Browse all categories
            <span aria-hidden="true"> &rarr;</span>
          </NavLink>
        </div>
      </div>
    </section>
  );
}
