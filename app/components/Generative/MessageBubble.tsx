import {memo} from 'react';
import type {ReactNode} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import cx from '~/lib/cx';
import type {ConversationMessage} from '~/types/conversation';
import {ProductResultsMessage} from '~/components/Generative/ProductResultsMessage';
import {ProductCard} from '~/components/Products/ProductCard';

type MessageBubbleProps = {
  message: ConversationMessage;
  isStreaming: boolean;
  showTrailingSpinner: boolean;
};

function MessageBubbleComponent({
  message,
  isStreaming,
  showTrailingSpinner,
}: Readonly<MessageBubbleProps>) {
  const isUser = message.role === 'user';
  const kind = message.kind ?? 'text';
  const isAssistant = !isUser;

  if (isAssistant && kind === 'products') {
    return (
      <ProductResultsMessage message={message} isStreaming={isStreaming} />
    );
  }

  type AssistantBubbleKind = 'text' | 'status' | 'tool' | 'error';
  const normalizedKind =
    kind === 'products' ? 'text' : (kind as AssistantBubbleKind);

  const assistantVariants: Record<AssistantBubbleKind, string> = {
    text: 'bg-white text-slate-900 ring-1 ring-slate-200',
    status: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    tool: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
    error: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  };

  const assistantClass =
    assistantVariants[normalizedKind] ?? assistantVariants.text;
  const shouldShowTrailingSpinner = showTrailingSpinner;
  const shouldShowLeadingSpinner =
    isAssistant &&
    isStreaming &&
    normalizedKind !== 'text' &&
    normalizedKind !== 'error';

  const assistantWidthClass =
    normalizedKind === 'status' || normalizedKind === 'tool'
      ? 'max-w-md'
      : 'w-full';

  const bubbleClass = isAssistant
    ? cx(assistantWidthClass, assistantClass)
    : 'max-w-xl bg-indigo-600 text-white';

  const contentBody = isAssistant
    ? renderAssistantMessageContent(message)
    : message.content;

  return (
    <div
      className={cx('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cx(
          'rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
          bubbleClass,
        )}
      >
        <div
          className={cx(
            shouldShowLeadingSpinner ? 'flex items-baseline gap-2' : undefined,
          )}
        >
          {shouldShowLeadingSpinner ? (
            <span
              className="relative inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-indigo-200" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </span>
          ) : null}
          <div
            className={cx(
              'whitespace-pre-wrap break-words',
              shouldShowLeadingSpinner ? 'flex-1' : undefined,
            )}
          >
            {contentBody}
          </div>
        </div>
        {shouldShowTrailingSpinner ? (
          <span className="mt-2 inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-indigo-500" />
        ) : null}
      </div>
    </div>
  );
}

function arePropsEqual(
  prev: Readonly<MessageBubbleProps>,
  next: Readonly<MessageBubbleProps>,
) {
  if (prev.isStreaming !== next.isStreaming) {
    return false;
  }
  if (prev.showTrailingSpinner !== next.showTrailingSpinner) {
    return false;
  }
  const prevMessage = prev.message;
  const nextMessage = next.message;
  return (
    prevMessage === nextMessage ||
    (prevMessage.id === nextMessage.id &&
      prevMessage.content === nextMessage.content &&
      prevMessage.kind === nextMessage.kind &&
      prevMessage.role === nextMessage.role &&
      prevMessage.ephemeral === nextMessage.ephemeral &&
      prevMessage.metadata === nextMessage.metadata)
  );
}

export const MessageBubble = memo(MessageBubbleComponent, arePropsEqual);

const PRODUCT_REF_PATTERN = /<product_ref\b([^>]*)\s*\/>/gi;
const ATTRIBUTE_PATTERN = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

function renderAssistantMessageContent(message: ConversationMessage) {
  const {content = ''} = message;
  if ((message.kind ?? 'text') !== 'text') {
    return content;
  }

  if (!content.includes('<product_ref')) {
    return content;
  }

  const matches = [...content.matchAll(PRODUCT_REF_PATTERN)];
  if (!matches.length) {
    return content;
  }

  const products = message.metadata?.products ?? [];
  const productIndex = buildProductIndex(products);
  const segments: ReactNode[] = [];
  let cursor = 0;
  let segmentId = 0;

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      segments.push(
        <span key={`text-${segmentId}`}>
          {content.slice(cursor, matchIndex)}
        </span>,
      );
      segmentId += 1;
    }

    const rawAttributes = match[1] ?? '';
    const attributes = parseProductRefAttributes(rawAttributes);
    const productIdentifier = resolveProductRefIdentifier(attributes);
    const product =
      productIdentifier &&
      (productIndex.get(productIdentifier) ??
        productIndex.get(productIdentifier.toLowerCase()));

    if (product) {
      segments.push(
        <div key={`product-${segmentId}`} className="my-3 w-full max-w-[18rem]">
          <ProductCard product={product} className="w-full text-sm" />
        </div>,
      );
    } else {
      const fallbackLabel = productIdentifier?.length
        ? `Product ${productIdentifier} unavailable`
        : 'Product unavailable';
      segments.push(
        <span
          key={`missing-${segmentId}`}
          className="inline-flex items-center rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900"
        >
          {fallbackLabel}
        </span>,
      );
    }

    segmentId += 1;
    cursor = matchIndex + match[0].length;
  }

  if (cursor < content.length) {
    segments.push(
      <span key={`text-${segmentId}`}>{content.slice(cursor)}</span>,
    );
  }

  return segments;
}

function parseProductRefAttributes(raw: string) {
  const attributes: Record<string, string> = {};
  let match: RegExpExecArray | null;
  const pattern = new RegExp(ATTRIBUTE_PATTERN);

  while ((match = pattern.exec(raw)) !== null) {
    const key = match[1];
    const value = match[3] ?? match[4] ?? '';
    if (key) {
      attributes[key] = value;
    }
  }

  return attributes;
}

function resolveProductRefIdentifier(attributes: Record<string, string>) {
  const candidates = [
    attributes.ec_product_id,
    attributes.ec_productId,
    attributes.permanentid,
    attributes.permanentId,
    attributes.permanentID,
    attributes.permanent_url,
    attributes.permanentUrl,
    attributes.clickUri,
    attributes.id,
    attributes.sku,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeIdentifier(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function buildProductIndex(products: Product[]) {
  const index = new Map<string, Product>();

  for (const product of products) {
    const record = product as unknown as Record<string, unknown>;
    const candidates: unknown[] = [
      record.ec_product_id,
      record.ec_productId,
      record.ec_item_id,
      record.permanentid,
      record.permanentId,
      record.permanentID,
      record.permanent_url,
      record.permanentUrl,
      record.clickUri,
      record.sku,
    ];

    for (const candidate of candidates) {
      const normalized = normalizeIdentifier(candidate);
      if (!normalized) {
        continue;
      }
      if (!index.has(normalized)) {
        index.set(normalized, product);
      }
      const lowered = normalized.toLowerCase();
      if (!index.has(lowered)) {
        index.set(lowered, product);
      }
    }
  }

  return index;
}

function normalizeIdentifier(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}
