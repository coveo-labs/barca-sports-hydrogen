import {type ReactNode, memo} from 'react';
import {useNavigate} from 'react-router';
import cx from '~/lib/cx';
import type {ConversationMessage} from '~/types/conversation';
import {Answer} from './components/Answer';
import {SurfaceRenderer} from './rendering/SurfaceRenderer';
import type {
  SerializableSurfaceState,
  SurfaceState,
} from '~/lib/a2ui/surface-manager';
import {deserializeSurface} from '~/lib/a2ui/surface-manager';

function resolveStringProp(value: unknown): string | null {
  if (typeof value === 'string') return value || null;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.literalString === 'string') return obj.literalString || null;
  }
  return null;
}

function extractSurfaceHeadline(
  serialized: SerializableSurfaceState,
): string | null {
  if (!serialized.root) return null;
  const rootComp = serialized.components.find((c) => c.id === serialized.root);
  if (!rootComp) return null;
  const catalogId = rootComp.catalogComponentId;
  const props = (rootComp.component as Record<string, unknown>)[catalogId] as
    | Record<string, unknown>
    | undefined;
  if (!props) return null;
  return resolveStringProp(props.heading) ?? resolveStringProp(props.headline);
}

function splitTextIntoSections(
  text: string,
): Array<{heading: string | null; body: string}> {
  const normalised = text.replace(/([^\n])(#{2,3} )/g, '$1\n$2');

  const lines = normalised.split('\n');
  const sections: Array<{heading: string | null; body: string}> = [];
  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,3}\s+(.+)/);
    if (headingMatch) {
      const body = currentLines.join('\n').trim();
      if (body || currentHeading !== null) {
        sections.push({heading: currentHeading, body});
      }
      currentHeading = headingMatch[1].trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  const body = currentLines.join('\n').trim();
  if (body || currentHeading !== null) {
    sections.push({heading: currentHeading, body});
  }

  return sections;
}

type MessageBubbleProps = {
  message: ConversationMessage;
  isStreaming: boolean;
  onFollowUpClick?: (message: string) => void;
  onProductSelect?: (productId: string) => void;
};

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

  const headlineToSurface = new Map<string, SurfaceState>();

  for (let i = 0; i < surfaceEntries.length; i++) {
    const headline = extractSurfaceHeadline(surfaceEntries[i]);
    if (headline) {
      headlineToSurface.set(headline.toLowerCase(), surfaceArray[i]);
    }
  }

  const sections = splitTextIntoSections(content);
  const hasSplitPoints = sections.some((s) => s.heading !== null);

  if (!hasSplitPoints) {
    return (
      <div className="flex flex-col gap-4 w-full">
        {content.trim() && <Answer text={content.trim()} />}
        {surfaceArray.map(renderSurface)}
      </div>
    );
  }

  // Multi-intent: interleave text sections with their matched surfaces.
  const renderedSurfaceIds = new Set<string>();
  const nodes: ReactNode[] = [];

  for (const section of sections) {
    if (section.body) {
      nodes.push(
        <Answer
          key={`text-${section.heading ?? 'intro'}`}
          text={section.body}
        />,
      );
    }

    if (section.heading) {
      const matched = headlineToSurface.get(section.heading.toLowerCase());
      if (matched) {
        nodes.push(renderSurface(matched));
        renderedSurfaceIds.add(matched.surfaceId);
      }
    }
  }

  for (const surface of surfaceArray) {
    if (!renderedSurfaceIds.has(surface.surfaceId)) {
      nodes.push(renderSurface(surface));
    }
  }

  return <div className="flex flex-col gap-4 w-full">{nodes}</div>;
}
