import {memo} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import cx from '~/lib/cx';
import type {ConversationMessage} from '~/types/conversation';
import {ProductResultsMessage} from '~/components/Generative/ProductResultsMessage';
import {registerProducts} from '~/lib/generative/product-index';
import {NextActionsSkeleton} from '~/components/Generative/Skeletons';
import {
  detectPendingRichContent,
  extractNextActions,
  extractRefinementChips,
  hasSpecialMarkup,
  hasPotentialStreamingMarkup,
  splitContentByCarousels,
} from '~/lib/generative/message-markup-parser';
import {
  ProductCarousel,
  renderPendingContentSkeleton,
  renderTextSegmentWithInlineProducts,
} from '~/components/Generative/MessageSegmentRenderers';
import {
  NextActionsBar,
  RefinementChipsBar,
} from '~/components/Generative/MessageActions';

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
  const kind = message.kind;
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
    error: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
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
    ? renderAssistantMessageContent(
        message,
        isStreaming,
        productLookup,
        onFollowUpClick,
      )
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

function renderAssistantMessageContent(
  message: ConversationMessage,
  isStreaming: boolean,
  productLookup?: ReadonlyMap<string, Product>,
  onFollowUpClick?: (message: string) => void,
) {
  const {content = ''} = message;
  if (message.kind !== 'text') {
    return content;
  }

  const hasPotentialMarkup =
    hasSpecialMarkup(content) ||
    (isStreaming && hasPotentialStreamingMarkup(content));

  if (!hasPotentialMarkup) {
    return content;
  }

  const pendingContent = isStreaming ? detectPendingRichContent(content) : null;

  let processableContent = content;
  if (pendingContent) {
    processableContent = content.slice(
      0,
      content.length - pendingContent.partialText.length,
    );
  }

  const {cleanedContent: contentAfterNextActions, nextActions} =
    extractNextActions(processableContent);
  const {cleanedContent, refinementChips} = extractRefinementChips(
    contentAfterNextActions,
  );

  const segments = splitContentByCarousels(cleanedContent);
  if (
    segments.length === 0 &&
    nextActions.length === 0 &&
    refinementChips.length === 0 &&
    !pendingContent
  ) {
    return content;
  }

  const productIndex = ensureProductLookup(message, productLookup);
  const renderedSegments = segments.map((segment, index) => {
    const key = `${message.id}-${index}`;
    if (segment.type === 'carousel') {
      return (
        <ProductCarousel
          key={key}
          identifiers={segment.identifiers}
          productIndex={productIndex}
        />
      );
    }
    return renderTextSegmentWithInlineProducts(
      segment.value,
      productIndex,
      key,
    );
  });

  const pendingSkeleton = renderPendingContentSkeleton(
    pendingContent,
    message.id,
  );

  const hasNextActions = nextActions.length > 0;
  const hasRefinementChips = refinementChips.length > 0;
  const isActivelyStreaming = isStreaming && pendingContent !== null;
  const showNextActionsSkeleton = isActivelyStreaming && hasNextActions;
  const showNextActionsBar = hasNextActions && !showNextActionsSkeleton;

  return (
    <>
      {renderedSegments}
      {pendingSkeleton}
      {hasRefinementChips && (
        <RefinementChipsBar chips={refinementChips} messageId={message.id} />
      )}
      {showNextActionsSkeleton && (
        <NextActionsSkeleton key={`${message.id}-nextactions-skeleton`} />
      )}
      {showNextActionsBar && (
        <NextActionsBar
          actions={nextActions}
          messageId={message.id}
          onFollowUpClick={onFollowUpClick}
        />
      )}
    </>
  );
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