import {engineDefinition} from '~/lib/coveo.engine';
import {ProductCard} from '../Products/ProductCard';
import type {SearchSummaryState, Product} from '@coveo/headless/ssr-commerce';

export function ProductList() {
  const productList = engineDefinition.controllers.useProductList();
  const summary = engineDefinition.controllers.useSummary();
  const noResultClass = !productList.state.products.length
    ? ' no-results '
    : ' ';

  const onSwapColor = (product: Product, color: string) => {
    const child = product.children?.find((c) => c.ec_color === color);
    if (child) {
      // TODO: https://coveord.atlassian.net/browse/KIT-3810
      // workaround to promote child to parent
      (productList.methods as any)?.['promoteChildToParent'](child);
    }
  };

  return (
    <section
      aria-labelledby="products-heading"
      data-bam-search-uid={productList.state.responseId}
      data-bam-search-query={(summary.state as SearchSummaryState).query}
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
