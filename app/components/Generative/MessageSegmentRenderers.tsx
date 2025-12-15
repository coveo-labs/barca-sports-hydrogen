import type {ReactNode} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import cx from '~/lib/cx';
import {ProductCard} from '~/components/Products/ProductCard';
import {
  CarouselSkeleton,
  InlineProductSkeleton,
} from '~/components/Generative/Skeletons';
import {
  extractInlineProductRefs,
  type PendingRichContent,
} from '~/lib/generative/message-markup-parser';

export function renderPendingContentSkeleton(
  pendingContent: PendingRichContent | null,
  messageId: string,
): ReactNode {
  if (!pendingContent) {
    return null;
  }

  const key = `${messageId}-pending-skeleton`;

  switch (pendingContent.type) {
    case 'carousel':
      return <CarouselSkeleton key={key} />;
    case 'product_ref':
      return <InlineProductSkeleton key={key} />;
    case 'nextaction':
    default:
      return null;
  }
}

export function renderTextSegmentWithInlineProducts(
  text: string,
  productIndex: ReadonlyMap<string, Product>,
  key: string,
): ReactNode {
  if (!text) {
    return null;
  }

  const productRefs = extractInlineProductRefs(text);
  if (productRefs.length === 0) {
    return <span key={key}>{text}</span>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  productRefs.forEach((ref, index) => {
    if (ref.startIndex > cursor) {
      nodes.push(
        <span key={`${key}-text-${index}`}>
          {text.slice(cursor, ref.startIndex)}
        </span>,
      );
    }

    nodes.push(
      <InlineProduct
        key={`${key}-product-${index}`}
        identifier={ref.identifier}
        productIndex={productIndex}
      />,
    );

    cursor = ref.endIndex;
  });

  if (cursor < text.length) {
    nodes.push(<span key={`${key}-text-end`}>{text.slice(cursor)}</span>);
  }

  return (
    <span key={key} className="contents">
      {nodes}
    </span>
  );
}

type InlineProductProps = Readonly<{
  identifier: string | null;
  productIndex: ReadonlyMap<string, Product>;
}>;

function InlineProduct({identifier, productIndex}: InlineProductProps) {
  const product = lookupProduct(identifier, productIndex);

  if (product) {
    return (
      <div className="my-3 w-full max-w-[14rem]">
        <ProductCard
          product={product}
          variant="compact"
          className="w-full text-sm"
        />
      </div>
    );
  }

  const fallbackLabel = identifier?.length
    ? `Product ${identifier} unavailable`
    : 'Product unavailable';

  return (
    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
      {fallbackLabel}
    </span>
  );
}

type ProductCarouselProps = Readonly<{
  identifiers: string[];
  productIndex: ReadonlyMap<string, Product>;
}>;

export function ProductCarousel({
  identifiers,
  productIndex,
}: ProductCarouselProps) {
  if (identifiers.length === 0) {
    return null;
  }

  const gridColsClass = getGridColsClass(identifiers.length);

  return (
    <div className="my-4 rounded-2xl bg-gray-50 px-3 py-4 shadow-sm ring-1 ring-slate-200/70">
      <ul
        className={cx('grid gap-3 list-none', gridColsClass)}
        aria-label="Product carousel"
      >
        {identifiers.map((identifier, index) => (
          <CarouselItem
            key={identifier || `missing-${index}`}
            identifier={identifier}
            productIndex={productIndex}
          />
        ))}
      </ul>
    </div>
  );
}

function getGridColsClass(count: number): string {
  if (count === 1) return 'grid-cols-1 max-w-[14rem]';
  if (count === 2) return 'grid-cols-2';
  return 'grid-cols-3';
}

type CarouselItemProps = Readonly<{
  identifier: string;
  productIndex: ReadonlyMap<string, Product>;
}>;

function CarouselItem({identifier, productIndex}: CarouselItemProps) {
  const product = lookupProduct(identifier, productIndex);

  if (product) {
    return (
      <li>
        <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 h-full">
          <ProductCard
            product={product}
            variant="compact"
            className="block w-full text-sm"
          />
        </div>
      </li>
    );
  }

  const fallbackLabel = identifier?.length
    ? `Product ${identifier} unavailable`
    : 'Product unavailable';

  return (
    <li className="rounded-xl border border-dashed border-amber-200 bg-amber-50/80 px-3 py-4 text-xs font-medium text-amber-900 flex items-center justify-center">
      {fallbackLabel}
    </li>
  );
}

function lookupProduct(
  identifier: string | null,
  productIndex: ReadonlyMap<string, Product>,
): Product | null {
  if (!identifier) {
    return null;
  }
  return (
    productIndex.get(identifier) ??
    productIndex.get(identifier.toLowerCase()) ??
    null
  );
}
