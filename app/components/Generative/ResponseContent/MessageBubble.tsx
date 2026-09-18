import {memo} from 'react';
import {useNavigate} from 'react-router';
import cx from '~/lib/cx';
import type {ConversationMessage} from '~/types/conversation';
import {Answer} from './components/Answer';
import {SurfaceRenderer} from './rendering/SurfaceRenderer';
import type {
  SerializableSurfaceState,
  SurfaceState,
} from '~/lib/generative/a2ui/surface-manager';
import {deserializeSurface} from '~/lib/generative/a2ui/surface-manager';

type MessageBubbleProps = {
  message: ConversationMessage;
  isStreaming: boolean;
  onFollowUpClick?: (message: string) => void;
  onProductSelect?: (productId: string) => void;
};

function isNextActionsSurface(surface: SurfaceState): boolean {
  return Array.from(surface.components.values()).some(
    (component) => component.catalogComponentId === 'NextActionsBar',
  );
}

function MessageBubbleComponent({
  message,
  isStreaming,
  onFollowUpClick,
  onProductSelect,
}: Readonly<MessageBubbleProps>) {
  const isUser = message.role === 'user';
  const kind = message.kind;
  const isAssistant = !isUser;
  const navigate = useNavigate();

  type AssistantBubbleKind = 'text' | 'status' | 'tool' | 'error';
  const normalizedKind = kind as AssistantBubbleKind;

  const assistantVariants: Record<AssistantBubbleKind, string> = {
    text: 'bg-white text-slate-900 ring-1 ring-slate-200',
    status: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    tool: 'bg-sky-50 text-sky-800 ring-1 ring-sky-200',
    error: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  };

  const assistantClass =
    assistantVariants[normalizedKind] ?? assistantVariants.text;
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

  const contentBody = isAssistant ? (
    <AssistantMessageContent
      message={message}
      onFollowUpClick={onFollowUpClick}
      onProductSelect={onProductSelect}
      onSearchAction={(query) => {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }}
    />
  ) : (
    message.content
  );

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
  if (prev.onFollowUpClick !== next.onFollowUpClick) {
    return false;
  }
  if (prev.onProductSelect !== next.onProductSelect) {
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

type AssistantMessageContentProps = Readonly<{
  message: ConversationMessage;
  onFollowUpClick?: (message: string) => void;
  onProductSelect?: (productId: string) => void;
  onSearchAction?: (query: string) => void;
}>;

function AssistantMessageContent({
  message,
  onFollowUpClick,
  onProductSelect,
  onSearchAction,
}: AssistantMessageContentProps) {
  const a2uiSurfaces = message.metadata?.a2uiSurfaces as
    | Record<string, SerializableSurfaceState>
    | undefined;
  const surfaceEntries = a2uiSurfaces ? Object.values(a2uiSurfaces) : [];

  const {content = ''} = message;

  if (message.kind !== 'text') {
    return <>{content}</>;
  }

  if (surfaceEntries.length === 0) {
    return <Answer text={content} />;
  }

  let surfaceArray: SurfaceState[];
  try {
    surfaceArray = surfaceEntries.map((s) => deserializeSurface(s));
  } catch (error) {
    console.error('[MessageBubble] Error deserializing surfaces:', error);
    return <Answer text={content} />;
  }

  const surfaceMap = new Map<string, SurfaceState>(
    surfaceArray.map((s) => [s.surfaceId, s]),
  );

  const renderSurface = (surface: SurfaceState) => (
    <SurfaceRenderer
      key={surface.surfaceId}
      surface={surface}
      surfaceMap={surfaceMap}
      onProductSelect={onProductSelect}
      onSearchAction={onSearchAction}
      onFollowupAction={onFollowUpClick}
    />
  );

  const presentationSurfaces = surfaceArray.filter(
    (surface) => !isNextActionsSurface(surface),
  );
  const nextActionsSurfaces = surfaceArray.filter(isNextActionsSurface);

  return (
    <div className="flex flex-col gap-4 w-full">
      {presentationSurfaces.map(renderSurface)}
      {content.trim() && <Answer text={content.trim()} />}
      {nextActionsSurfaces.map(renderSurface)}
    </div>
  );
}
