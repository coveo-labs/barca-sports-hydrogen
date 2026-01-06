import type {ReactNode} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import {ProductCard} from '~/components/Products/ProductCard';
import {
  CarouselSkeleton,
  InlineProductSkeleton,
  MarkdownSkeleton,
} from '~/components/Generative/Skeletons';
import {
  extractInlineProductRefs,
  type PendingRichContent,
} from '~/lib/generative/message-markup-parser';
import {Answer} from '~/components/Generative/Answer';

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
    case 'table':
    case 'code_block':
      return <MarkdownSkeleton key={key} />;
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
    // No inline products - render with markdown support
    return <Answer key={key} text={text} />;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  productRefs.forEach((ref, index) => {
    if (ref.startIndex > cursor) {
      const textSegment = text.slice(cursor, ref.startIndex);
      // Render text segments with markdown support
      nodes.push(<Answer key={`${key}-text-${index}`} text={textSegment} />);
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
    const textSegment = text.slice(cursor);
    nodes.push(<Answer key={`${key}-text-end`} text={textSegment} />);
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

  if (!product) {
    // Silently skip products that aren't in the index
    return null;
  }

  return (
    <div className="my-3">
      <ProductCard product={product} variant="compact" />
    </div>
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
  // Filter to only include products that exist in the index
  const availableProducts = identifiers
    .map((identifier) => ({
      identifier,
      product: lookupProduct(identifier, productIndex),
    }))
    .filter(
      (item): item is {identifier: string; product: Product} =>
        item.product !== null,
    );

  if (availableProducts.length === 0) {
    return null;
  }

  return (
    <div className="my-4 flex max-w-full flex-col rounded-2xl bg-gray-50 px-3 py-4 shadow-sm ring-1 ring-slate-200/70">
      <ul
        className="flex gap-3 list-none overflow-x-auto"
        aria-label="Product carousel"
      >
        {availableProducts.map(({identifier, product}) => (
          <li key={identifier} className="shrink-0">
            <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 h-full">
              <ProductCard product={product} variant="compact" />
            </div>
          </li>
        ))}
      </ul>
    </div>
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
