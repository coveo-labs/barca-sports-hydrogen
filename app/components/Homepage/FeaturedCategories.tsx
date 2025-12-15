import {NavLink} from 'react-router';
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
        </div>

        <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:grid-rows-2 sm:gap-x-6 lg:gap-8">
          {header.collections.edges
            .filter((collection) => {
              const title = collection.node.title;
              return (
                title === 'Apparel & Accessories' ||
                title === 'Water Sports' ||
                title === 'Toys & Games' 
              );
            })
            .map((collection) => {
              const title = collection.node.title;
              let url = '';
              
              if (title === 'Apparel & Accessories') {
                url = '/plp/Apparel-Accessories';
              } else if (title === 'Water Sports') {
                url = 'plp/Sporting-Goods/Outdoor-Recreation/Boating-Water-Sports/Boating-Rafting';
              } else if (title === 'Toys & Games') {
                url = '/plp/Toys-Games/';
              }
              // First collection (Apparel & Accessories) gets the larger layout
              const isFirst = title === 'Apparel & Accessories';
              return (
                <div
                  key={collection.node.id}
                  className={
                    isFirst
                      ? 'group aspect-h-1 aspect-w-2 overflow-hidden rounded-lg sm:aspect-h-1 sm:aspect-w-1 sm:row-span-2'
                      : 'group aspect-h-1 aspect-w-2 overflow-hidden rounded-lg sm:aspect-none sm:relative sm:h-full'
                  }
                >
                  <img
                    height={isFirst ? 550 : 259}
                    width={550}
                    loading="lazy"
                    alt={collection.node.title}
                    src={collection.node.image?.url}
                    className={
                      isFirst
                        ? 'object-cover object-center group-hover:opacity-75'
                        : 'object-cover object-center group-hover:opacity-75 sm:absolute sm:inset-0 sm:size-full'
                    }
                  />
                  <div
                    aria-hidden="true"
                    className={
                      isFirst
                        ? 'bg-gradient-to-b from-transparent to-black opacity-50'
                        : 'bg-gradient-to-b from-transparent to-black opacity-50 sm:absolute sm:inset-0'
                    }
                  />
                  <div
                    className={
                      isFirst
                        ? 'flex items-end p-6'
                        : 'flex items-end p-6 sm:absolute sm:inset-0'
                    }
                  >
                    <div>
                      <h3 className="font-semibold text-white">
                        <NavLink to={url}>
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
      </div>
    </section>
  );
}
