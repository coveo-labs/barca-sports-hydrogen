import {engineDefinition} from '~/lib/coveo/engine';
import {ProductCard} from '../Products/ProductCard';
import type {
  SearchSummaryState,
  Product,
  ProductListState,
  ProductList as ProductListType,
  DidYouMeanState,
} from '@coveo/headless/ssr-commerce';
import {useEffect} from 'react';
import {createGTMItemFromProduct} from '~/lib/coveo/map.coveo.shopify';
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
      (recommendationItem: Product, index: number) => {
        listingsItemsArray.push(
          createGTMItemFromProduct(recommendationItem, index),
        );
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

  let searchQuery = summary.state.query || '';
  if (summary.state.query) {
    // useDidYouMean is avaialble only when ProductList is used with Search, not listing.
    const didYouMean = engineDefinition.controllers.useDidYouMean() as {
      state: DidYouMeanState;
    };
    searchQuery = didYouMean.state.originalQuery;
  }

  return (
    <section
      aria-labelledby="products-heading"
      data-bam-search-uid={productList.state.responseId}
      {...(searchQuery && {'data-bam-search-query': searchQuery})}
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
              onSelect={() => {
                productList.methods
                  ?.interactiveProduct({
                    options: {
                      product,
                    },
                  })
                  .select();
              }}
              onSwapColor={(color) => onSwapColor(product, color)}
            />
          );
        })}
      </div>
    </section>
  );
}
