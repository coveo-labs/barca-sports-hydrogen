import {memo} from 'react';
import type {ReactNode} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import cx from '~/lib/cx';
import type {ConversationMessage} from '~/types/conversation';
import {ProductResultsMessage} from '~/components/Generative/ProductResultsMessage';
import {ProductCard} from '~/components/Products/ProductCard';
import {
  normalizeProductIdentifier,
  registerProducts,
} from '~/lib/product-index';

type MessageBubbleProps = {
  message: ConversationMessage;
  isStreaming: boolean;
  showTrailingSpinner: boolean;
  productLookup?: ReadonlyMap<string, Product>;
  onFollowUpClick?: (message: string) => void;
};

function MessageBubbleComponent({
  message,
  isStreaming,
  showTrailingSpinner,
  productLookup,
  onFollowUpClick,
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
    ? renderAssistantMessageContent(message, productLookup, onFollowUpClick)
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
  if (prev.productLookup !== next.productLookup) {
    return false;
  }
  if (prev.onFollowUpClick !== next.onFollowUpClick) {
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

const PRODUCT_REF_PATTERN_SOURCE = '<product_ref\\b([^>]*)\\s*/>';
const CAROUSEL_PATTERN_SOURCE = '<carousel>([\\s\\S]*?)</carousel>';
const NEXT_ACTION_PATTERN_SOURCE = '<nextaction\\b([^>]*)\\s*/>';
const ATTRIBUTE_PATTERN = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;

type NextAction =
  | {type: 'search'; query: string}
  | {type: 'followup'; message: string};

type AssistantMessageSegment =
  | {type: 'text'; value: string}
  | {type: 'carousel'; identifiers: string[]};

function renderAssistantMessageContent(
  message: ConversationMessage,
  productLookup?: ReadonlyMap<string, Product>,
  onFollowUpClick?: (message: string) => void,
) {
  const {content = ''} = message;
  if ((message.kind ?? 'text') !== 'text') {
    return content;
  }

  const hasSpecialMarkup =
    content.includes('<product_ref') ||
    content.includes('<carousel') ||
    content.includes('<nextaction');

  if (!hasSpecialMarkup) {
    return content;
  }

  // Extract next actions from the end of the content
  const {cleanedContent, nextActions} = extractNextActions(content);

  const segments = splitContentByCarousels(cleanedContent);
  if (segments.length === 0 && nextActions.length === 0) {
    return content;
  }

  const productIndex = ensureProductLookup(message, productLookup);
  const renderedSegments = segments.map((segment, index) => {
    const key = `${message.id}-${index}`;
    if (segment.type === 'carousel') {
      return renderCarouselSegment(segment.identifiers, productIndex, key);
    }
    return renderTextSegmentWithInlineProducts(
      segment.value,
      productIndex,
      key,
    );
  });

  return (
    <>
      {renderedSegments}
      {nextActions.length > 0 && (
        <NextActionsBar
          actions={nextActions}
          messageId={message.id}
          onFollowUpClick={onFollowUpClick}
        />
      )}
    </>
  );
}

function splitContentByCarousels(content: string): AssistantMessageSegment[] {
  const segments: AssistantMessageSegment[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  const carouselPattern = new RegExp(CAROUSEL_PATTERN_SOURCE, 'gi');

  while ((match = carouselPattern.exec(content)) !== null) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      segments.push({type: 'text', value: content.slice(cursor, matchIndex)});
    }

    const rawCarousel = match[0] ?? '';
    const innerMarkup = match[1] ?? '';
    const identifiers = extractProductRefsFromMarkup(innerMarkup);
    if (identifiers.length > 0) {
      segments.push({type: 'carousel', identifiers});
    } else {
      segments.push({type: 'text', value: rawCarousel});
    }

    cursor = matchIndex + rawCarousel.length;
  }

  if (cursor < content.length) {
    segments.push({type: 'text', value: content.slice(cursor)});
  }

  return segments;
}

function extractProductRefsFromMarkup(markup: string) {
  const identifiers: string[] = [];
  let match: RegExpExecArray | null;
  const productPattern = new RegExp(PRODUCT_REF_PATTERN_SOURCE, 'gi');

  while ((match = productPattern.exec(markup)) !== null) {
    const rawAttributes = match[1] ?? '';
    const attributes = parseProductRefAttributes(rawAttributes);
    const identifier = resolveProductRefIdentifier(attributes);
    if (identifier) {
      identifiers.push(identifier);
    }
  }

  return identifiers;
}

function renderTextSegmentWithInlineProducts(
  text: string,
  productIndex: ReadonlyMap<string, Product>,
  key: string,
) {
  if (!text) {
    return null;
  }

  if (!text.includes('<product_ref')) {
    return <span key={key}>{text}</span>;
  }

  const inlinePattern = new RegExp(PRODUCT_REF_PATTERN_SOURCE, 'gi');
  const matches = [...text.matchAll(inlinePattern)];
  if (!matches.length) {
    return <span key={key}>{text}</span>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;
  let segmentId = 0;

  for (const match of matches) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      nodes.push(
        <span key={`${key}-text-${segmentId}`}>
          {text.slice(cursor, matchIndex)}
        </span>,
      );
      segmentId += 1;
    }

    const rawAttributes = match[1] ?? '';
    const attributes = parseProductRefAttributes(rawAttributes);
    const productIdentifier = resolveProductRefIdentifier(attributes);
    nodes.push(
      renderInlineProductSegment(
        productIdentifier,
        productIndex,
        `${key}-product-${segmentId}`,
      ),
    );

    segmentId += 1;
    cursor = matchIndex + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(
      <span key={`${key}-text-${segmentId}`}>{text.slice(cursor)}</span>,
    );
  }

  return (
    <span key={key} className="contents">
      {nodes}
    </span>
  );
}

function renderInlineProductSegment(
  productIdentifier: string | null,
  productIndex: ReadonlyMap<string, Product>,
  key: string,
) {
  const product = lookupProduct(productIdentifier, productIndex);
  if (product) {
    return (
      <div key={key} className="my-3 w-full max-w-[18rem]">
        <ProductCard product={product} className="w-full text-sm" />
      </div>
    );
  }

  const fallbackLabel = productIdentifier?.length
    ? `Product ${productIdentifier} unavailable`
    : 'Product unavailable';
  return (
    <span
      key={key}
      className="inline-flex items-center rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900"
    >
      {fallbackLabel}
    </span>
  );
}

function renderCarouselSegment(
  identifiers: string[],
  productIndex: ReadonlyMap<string, Product>,
  key: string,
) {
  if (identifiers.length === 0) {
    return null;
  }

  return (
    <div
      key={key}
      className="my-4 rounded-2xl bg-gray-50 px-4 py-5 shadow-sm ring-1 ring-slate-200/70"
    >
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:snap-none"
        role="list"
        aria-label="Product carousel"
      >
        {identifiers.map((identifier, index) => {
          const product = lookupProduct(identifier, productIndex);
          if (product) {
            return (
              <div
                key={`${key}-product-${identifier ?? index}`}
                className="min-w-[11.25rem] max-w-[11.25rem] flex-shrink-0 snap-center lg:min-w-0 lg:max-w-none"
                role="listitem"
              >
                <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200">
                  <ProductCard
                    product={product}
                    className="block w-full text-sm"
                  />
                </div>
              </div>
            );
          }

          const fallbackLabel = identifier?.length
            ? `Product ${identifier} unavailable`
            : 'Product unavailable';
          return (
            <div
              key={`${key}-missing-${index}`}
              className="min-w-[11.25rem] max-w-[11.25rem] flex-shrink-0 rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 px-4 py-6 text-sm font-medium text-amber-900 snap-center lg:min-w-0 lg:max-w-none"
              role="listitem"
            >
              {fallbackLabel}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function lookupProduct(
  identifier: string | null,
  productIndex: ReadonlyMap<string, Product>,
) {
  if (!identifier) {
    return null;
  }
  return (
    productIndex.get(identifier) ??
    productIndex.get(identifier.toLowerCase()) ??
    null
  );
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
    const normalized = normalizeProductIdentifier(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function ensureProductLookup(
  message: ConversationMessage,
  explicitLookup?: ReadonlyMap<string, Product>,
) {
  if (explicitLookup) {
    return explicitLookup;
  }
  const fallback = new Map<string, Product>();
  registerProducts(fallback, message.metadata?.products);
  return fallback;
}

function extractNextActions(content: string): {
  cleanedContent: string;
  nextActions: NextAction[];
} {
  const nextActions: NextAction[] = [];
  const nextActionPattern = new RegExp(NEXT_ACTION_PATTERN_SOURCE, 'gi');
  let cleanedContent = content;
  let match: RegExpExecArray | null;

  while ((match = nextActionPattern.exec(content)) !== null) {
    const rawAttributes = match[1] ?? '';
    const attributes = parseProductRefAttributes(rawAttributes);
    const actionType = attributes.type;

    if (actionType === 'search' && attributes.query) {
      nextActions.push({type: 'search', query: attributes.query});
    } else if (actionType === 'followup' && attributes.message) {
      nextActions.push({type: 'followup', message: attributes.message});
    }

    cleanedContent = cleanedContent.replace(match[0], '');
  }

  // Trim any trailing whitespace left after removing next actions
  cleanedContent = cleanedContent.trimEnd();

  return {cleanedContent, nextActions};
}

type NextActionsBarProps = {
  actions: NextAction[];
  messageId: string;
  onFollowUpClick?: (message: string) => void;
};

function NextActionsBar({
  actions,
  messageId,
  onFollowUpClick,
}: Readonly<NextActionsBarProps>) {
  const searchActions = actions.filter((a) => a.type === 'search');
  const followupActions = actions.filter((a) => a.type === 'followup');

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
      {searchActions.map((action, index) => (
        <a
          key={`${messageId}-search-${index}`}
          href={`/search?q=${encodeURIComponent(action.query)}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          {action.query}
        </a>
      ))}
      {followupActions.map((action, index) => (
        <button
          key={`${messageId}-followup-${index}`}
          type="button"
          onClick={() => onFollowUpClick?.(action.message)}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
            />
          </svg>
          {action.message}
        </button>
      ))}
    </div>
  );
}
