import {BrainIcon, ShoppingBag} from 'lucide-react';
import {LoadingDots} from './LoadingDots';
import type {BrowseCatalogResponse} from '~/routes/browse-catalog';
import {NavLink} from '@remix-run/react';
import {ProductCard} from '../Products/ProductCard';

export const LoadingBrowseCatalog = () => {
  return (
    <div className="p-4 text-xl flex items-center">
      <BrainIcon className="w-8 text-dark mr-4 text-indigo-600" />
      <LoadingDots
        loadingText={[
          'Finding products',
          'Browsing the catalog',
          'Analyzing the categories',
          'Personalizing the experience',
          'Loading relevant products',
        ]}
      />
    </div>
  );
};

export const BrowseCatalogSteps = ({
  catalog,
  close,
}: {
  catalog: BrowseCatalogResponse;
  close: () => void;
}) => {
  return (
    <div className="flex items-center px-4">
      <div className="divide-y">
        {Object.values(catalog.output.categories).map((category) => {
          const slugSplit = category.name.split('/');
          const lastLevel = slugSplit.pop()?.replaceAll('-', ' ');
          const parents = slugSplit.join(' / ').replaceAll('-', ' ');
          return (
            <div key={category.name} className="py-4">
              <>
                <h2 className="text-lg font-semibold text-indigo-600">
                  {lastLevel}
                </h2>

                <div className="my-4">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: category.whyTheseProducts,
                    }}
                    className="mt-4 space-y-4 text-md/6 text-gray-500"
                  />
                </div>
                <NavLink
                  to={`${category.urlPattern}`}
                  className="rounded-md bg-indigo-50 px-3.5 py-2.5 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 inline-block"
                >
                  {`Browse all available ${lastLevel}`}
                </NavLink>

                <div className="grid grid-cols-5 mt-8">
                  {category.products.map((product) => (
                    <ProductCard
                      product={product}
                      key={product.ec_product_id}
                      onSelect={close}
                    />
                  ))}
                </div>
              </>
            </div>
          );
        })}
      </div>
    </div>
  );
};
