import {memo} from 'react';
import cx from '~/lib/cx';
import {ProductCard} from '~/components/Products/ProductCard';
import type {ConversationMessage} from '~/types/conversation';

type ProductResultsMessageProps = {
  message: ConversationMessage;
  isStreaming: boolean;
};

function ProductResultsMessageComponent({
  message,
  isStreaming,
}: ProductResultsMessageProps) {
  const products = message.metadata?.products ?? [];

  if (products.length === 0) {
    return (
      <div className="flex w-full justify-start">
        <div className="max-w-xl rounded-2xl bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-sm ring-1 ring-slate-200">
          <span className="whitespace-pre-wrap break-words">
            {message.content}
          </span>
        </div>
      </div>
    );
  }

  const hasHeadline = Boolean(message.content);
  const showProgress = isStreaming;

  return (
    <div className="flex w-full justify-start">
      <div className="flex max-w-full flex-col rounded-2xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200">
        {hasHeadline ? (
          <p className="text-sm font-semibold text-slate-900">
            {message.content}
          </p>
        ) : null}
        {showProgress ? (
          <div
            className={cx(
              hasHeadline ? 'mt-3' : undefined,
              'flex items-center gap-2 text-xs font-medium text-slate-600',
            )}
          >
            <span
              className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-indigo-200" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </span>
            <span>
              Assistant is still summarizing insights for these picks...
            </span>
          </div>
        ) : null}
        <div
          className={cx(
            'flex gap-3 overflow-x-auto pb-2',
            hasHeadline || showProgress ? 'mt-4' : undefined,
          )}
        >
          {products.map((product, index) => (
            <ProductCard
              key={
                product.permanentid ??
                product.clickUri ??
                `${message.id}-${index}`
              }
              product={product}
              variant="compact"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const ProductResultsMessage = memo(ProductResultsMessageComponent);
