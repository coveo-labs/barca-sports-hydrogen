import {engineDefinition} from '~/lib/coveo.engine';
import {ProductCard} from './ProductCard';

export function ProductList() {
  const productList = engineDefinition.controllers.useProductList();
  return (
    <>
      {productList?.state.products.map((product) => (
        <ProductCard product={product} key={product.permanentid} />
      ))}
    </>
  );
}
