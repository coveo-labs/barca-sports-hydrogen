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

// Global tracking to ensure analytics only fire once per response
const trackedResponseIds = new Set<string>();

export function ProductList() {
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
    const responseId = productList.state.responseId;

    // Check if we've already tracked this response
    if (!responseId || trackedResponseIds.has(responseId)) {
      return;
    }

    // Mark this response as tracked
    trackedResponseIds.add(responseId);

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
        item_list_id: `listings_${responseId}`,
        items: listingsItemsArray,
      },
    });
  }, [productList.state.responseId, productList.state.products]); // Track responseId and products changes

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
