import {engineDefinition} from '~/lib/coveo.engine';
import {ProductCard} from '../Products/ProductCard';
import type {
  SearchSummaryState,
  Product,
  ProductListState,
  ProductList as ProductListType,
} from '@coveo/headless/ssr-commerce';
import {useEffect, useRef} from 'react';
import '~/types/gtm';

export function ProductList() {
  const hasRunRef = useRef(false);
  const productList = engineDefinition.controllers.useProductList() as {
    state: ProductListState;
    methods: Pick<
      ProductListType,
      'interactiveProduct' | 'promoteChildToParent'
    >;
  };
  const summary = engineDefinition.controllers.useSummary() as {
    state: SearchSummaryState;
  };
  const noResultClass = !productList.state.products.length
    ? ' no-results '
    : ' ';

  const onSwapColor = (product: Product, color: string) => {
    const child = product.children?.find((c) => c.ec_color === color);
    if (child) {
      // TODO: https://coveord.atlassian.net/browse/KIT-3810
      // workaround to promote child to parent
      productList.methods?.promoteChildToParent(child);
    }
  };

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const listingsItemsArray: any[] = [];
    productList.state.products.forEach(
      (recommendationItem: any, index: number) => {
        listingsItemsArray.push({
          item_id: recommendationItem.permanentid,
          item_name: recommendationItem.ec_name,
          index,
          price: recommendationItem.ec_price,
          quantity: 1,
        });
      },
    );

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ecommerce: null}); // Clear the previous ecommerce object.
    window.dataLayer.push({
      event: 'view_item_list',
      ecommerce: {
        item_list_id: `listings_${productList.state.responseId}`,
        items: listingsItemsArray,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally only run once on mount for analytics tracking

  return (
    <section
      aria-labelledby="products-heading"
      data-bam-search-uid={productList.state.responseId}
      data-bam-search-query={summary.state.query}
      data-bam-result-count={summary.state.totalNumberOfProducts}
      className={
        'result-list' +
        noResultClass +
        'mx-auto  px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16  lg:px-8'
      }
    >
      <h2 id="products-heading" className="sr-only">
        Products
      </h2>

      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 xl:gap-x-8">
        {productList.state.products.map((product) => {
          return (
            <ProductCard
              className="result-card"
              key={product.permanentid}
              product={product}
              onSelect={() =>
                productList.methods
                  ?.interactiveProduct({
                    options: {
                      product,
                    },
                  })
                  .select()
              }
              onSwapColor={(color) => onSwapColor(product, color)}
            />
          );
        })}
      </div>
    </section>
  );
}
