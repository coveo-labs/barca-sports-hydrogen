import {memo} from 'react';
import cx from '~/lib/cx';
import type {ConversationMessage} from '~/types/conversation';
import {ProductResultsMessage} from '~/components/Generative/ProductResultsMessage';

type MessageBubbleProps = {
  message: ConversationMessage;
  isStreaming: boolean;
  showTrailingSpinner: boolean;
};

function MessageBubbleComponent({
  message,
  isStreaming,
  showTrailingSpinner,
}: MessageBubbleProps) {
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

  const bubbleClass = isAssistant
    ? cx(
        normalizedKind === 'status' || normalizedKind === 'tool'
          ? 'max-w-md'
          : 'w-full',
        assistantClass,
      )
    : 'max-w-xl bg-indigo-600 text-white';

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
            'whitespace-pre-wrap break-words',
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
          <span className={shouldShowLeadingSpinner ? 'flex-1' : undefined}>
            <span className="whitespace-pre-wrap break-words">
              {message.content}
            </span>
          </span>
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
