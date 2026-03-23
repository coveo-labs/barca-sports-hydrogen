import {useCallback, useRef} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import type {ConversationRecord} from '~/lib/generative/chat';
import {logDebug, logError, logInfo, logWarn} from '~/lib/logger';
import {
  createBufferProcessor,
  parseAssistantStreamEvent,
  processSSEStream,
  type StreamArgs,
  type ThinkingUpdateSnapshot,
  CONNECTION_ERROR_MESSAGE,
  GENERIC_ERROR_MESSAGE,
} from '~/lib/generative/streaming';
import {StreamA2UIAdapter} from '~/lib/generative/adapters/a2ui/stream-a2ui-adapter';
import {ConversationStateUpdater} from '~/lib/generative/session/conversation-state-updater';
import {AssistantStreamSession} from '~/lib/generative/session/assistant-stream-session';

export type {
  ThinkingUpdateSnapshot,
  StreamArgs,
} from '~/lib/generative/streaming';

type UseAssistantStreamingOptions = {
  locale: unknown;
  setConversations: Dispatch<SetStateAction<ConversationRecord[]>>;
  setIsStreaming: Dispatch<SetStateAction<boolean>>;
  setStreamError: Dispatch<SetStateAction<string | null>>;
  endpoint: string;
  onThinkingUpdate?: (snapshot: ThinkingUpdateSnapshot) => void;
};

export function useAssistantStreaming({
  locale,
  setConversations,
  setIsStreaming,
  setStreamError,
  endpoint,
  onThinkingUpdate,
}: UseAssistantStreamingOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const streamAssistantResponse = useCallback(
    async ({
      conversationLocalId,
      sessionId,
      userMessage,
      showInitialStatus,
      onThinkingUpdate: streamCallback,
    }: StreamArgs) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const updateCallback = streamCallback ?? onThinkingUpdate;
      const view =
        typeof window !== 'undefined'
          ? {
              url: window.location.href,
              referrer: document.referrer || undefined,
            }
          : undefined;

      const updater = new ConversationStateUpdater({
        conversationLocalId,
        setConversations,
      });
      const structuredResponseAdapter = new StreamA2UIAdapter({
        onError: (error) => {
          logError('A2UI processing error', {error, conversationLocalId});
        },
      });
      const session = new AssistantStreamSession({
        initialSessionId: sessionId,
        updater,
        structuredResponseAdapter,
        onThinkingUpdate: updateCallback,
      });

      const applySessionResult = ({
        abort,
        complete,
        error,
      }: {
        abort?: boolean;
        complete?: boolean;
        error?: string;
      }) => {
        if (error) {
          setStreamError(error);
        }
        if (complete) {
          setIsStreaming(false);
        }
        if (abort) {
          controller.abort();
        }
      };

      try {
        logInfo('streaming request start', {
          conversationLocalId,
          sessionId,
          endpoint,
        });

        session.start(showInitialStatus);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            Accept: 'text/event-stream;charset=UTF-8',
          },
          signal: controller.signal,
          body: JSON.stringify({
            message: userMessage,
            sessionId: sessionId ?? undefined,
            locale,
            view,
          }),
        });

        if (!response.ok || !response.body) {
          logError('streaming response missing body', {
            status: response.status,
            conversationLocalId,
            sessionId,
          });
          const errorText = await response.text().catch(() => '');
          const message = errorText || CONNECTION_ERROR_MESSAGE;
          applySessionResult(session.handleResponseError(message));
          throw new Error(message);
        }

        const reader = response.body.getReader();

        const bufferProcessor = createBufferProcessor((event) => {
          if (!event.data) {
            return;
          }

          const parsedEvent = parseAssistantStreamEvent(event);
          if (parsedEvent.type === 'UNKNOWN') {
            logWarn('unknown SSE event', {
              event: parsedEvent.event,
              payload: parsedEvent.payload,
            });
            return;
          }

          applySessionResult(session.handleEvent(parsedEvent));
        });

        await processSSEStream(reader, bufferProcessor);
        applySessionResult(session.finalizeAfterStream());
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          if (session.hasCapturedError()) {
            logWarn('streaming request aborted after server-side error', {
              conversationLocalId,
              sessionId: session.getResolvedSessionId() ?? sessionId,
            });
          } else {
            logInfo('streaming request aborted', {
              conversationLocalId,
              sessionId: session.getResolvedSessionId() ?? sessionId,
            });
          }
          return;
        }

        logError('streaming request error', {
          error,
          conversationLocalId,
          sessionId: session.getResolvedSessionId() ?? sessionId,
        });
        if (!session.hasCapturedError()) {
          setStreamError(GENERIC_ERROR_MESSAGE);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
        logDebug('streaming request finished', {
          conversationLocalId,
          sessionId: session.getResolvedSessionId() ?? sessionId,
        });
      }
    },
    [
      endpoint,
      locale,
      onThinkingUpdate,
      setConversations,
      setIsStreaming,
      setStreamError,
    ],
  );

  return {streamAssistantResponse, abortStream};
}
