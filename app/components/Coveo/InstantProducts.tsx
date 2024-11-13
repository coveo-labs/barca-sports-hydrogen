/* eslint-disable jsx-a11y/anchor-has-content */
import type {InstantProducts} from '@coveo/headless/commerce';
import {useController} from './Context';
import {ProductCard} from './ProductCard';
import {useAside} from '../Aside';
import {Summary} from './Summary';

interface CoveoInstantProductProps {
  instantProducts: InstantProducts;
}
export function CoveoInstantProducts({
  instantProducts,
}: CoveoInstantProductProps) {
  const {products} = useController(instantProducts);
  const {close} = useAside();
  if (!products || products.length === 0) {
    return null;
  }
  return null; /*(
    <Stack>
      <Summary
        query={instantProducts.state.query}
        totalCount={instantProducts.state.totalCount}
      />
      <NavLink
        onClick={close}
        label="See more"
        href={`/search?q=${instantProducts.state.query}`}
        active
      />
      <ScrollArea h={'90vh'}>
        <Stack>
          {products.map((product) => {
            return <ProductCard key={product.permanentid} product={product} />;
          })}
        </Stack>
      </ScrollArea>
    </Stack>
  );*/
}
