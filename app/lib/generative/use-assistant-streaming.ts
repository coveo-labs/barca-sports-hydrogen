import {useCallback, useRef} from 'react';
import type {Dispatch, SetStateAction} from 'react';
import type {
  ConversationMessage,
  ConversationThinkingUpdate,
} from '~/types/conversation';
import {
  type ConversationRecord,
  generateId,
  parseToolResultPayload,
  sortConversations,
} from '~/lib/generative/chat';
import {logDebug, logError, logInfo, logWarn} from '~/lib/logger';
import {
  createBufferProcessor,
  parseAssistantStreamEvent,
  processSSEStream,
  type AssistantStreamEvent,
  type StreamArgs,
  type ThinkingUpdateSnapshot,
  CONNECTING_STATUS_MESSAGE,
  CONNECTION_ERROR_MESSAGE,
  DEFAULT_STATUS_MESSAGE,
  DEFAULT_TOOL_PROGRESS_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  INTERRUPTED_ERROR_MESSAGE,
  TOOL_RESULT_FALLBACK_MESSAGE,
} from '~/lib/generative/streaming';
import {A2UIMessageProcessor} from '~/lib/a2ui';
import type {SerializableSurfaceState} from '~/lib/a2ui/surface-manager';
import {serializeSurface} from '~/lib/a2ui/surface-manager';

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

      let resolvedSessionId = sessionId;
      // Local assistant bubble ID for the current run. The new agent emits
      // multiple transient reasoning/tool message IDs per turn, so we no
      // longer bind the conversation bubble directly to backend message IDs.
      let assistantMessageId: string | null = null;
      let accumulatedContent = '';
      let activeReasoningMessageId: string | null = null;
      let activeReasoningBuffer = '';
      let pendingFinalReasoningBlock: string | null = null;
      let latestSnapshot: ConversationRecord | null = null;
      let capturedErrorMessage: string | null = null;
      let turnCompleted = false;
      // True when at least one ACTIVITY_SNAPSHOT was successfully synced to an
      // assistant message. Used to suppress the INTERRUPTED_ERROR_MESSAGE for
      // pure A2UI turns where the backend never sends RUN_FINISHED.
      let a2uiSurfacesSynced = false;
      const seenStatusMessages = new Set<string>();
      let thinkingUpdates: ConversationThinkingUpdate[] = [];

      // A2UI processor for rendering structured UI components
      const a2uiProcessor = new A2UIMessageProcessor({
        onSurfaceUpdate: (surfaceId: string) => {
          syncA2UISurfaces();
        },
        onSurfaceDelete: (surfaceId: string) => {
          syncA2UISurfaces();
        },
        onError: (error: string) => {
          logError('A2UI processing error', {error, conversationLocalId});
        },
      });

      const applyUpdate = (
        mutator: (conversation: ConversationRecord) => ConversationRecord,
      ) => {
        setConversations((prev) =>
          sortConversations(
            prev.map((conversation) => {
              if (conversation.localId !== conversationLocalId) {
                return conversation;
              }
              const updated = mutator(conversation);
              latestSnapshot = updated;
              return updated;
            }),
          ),
        );
      };

      const emitThinkingSnapshot = () => {
        if (!updateCallback) {
          return;
        }
        updateCallback({
          updates: [...thinkingUpdates],
          isComplete: turnCompleted,
          messageId: assistantMessageId,
        });
      };

      const resetThinkingState = () => {
        thinkingUpdates = [];
        turnCompleted = false;
        emitThinkingSnapshot();
      };

      const syncThinkingMetadata = () => {
        if (!assistantMessageId) {
          emitThinkingSnapshot();
          return;
        }
        const snapshot = [...thinkingUpdates];
        applyUpdate((conversation) => {
          const messages = [...conversation.messages];
          const index = messages.findIndex(
            (message) => message.id === assistantMessageId,
          );
          if (index === -1) {
            return conversation;
          }
          messages[index] = {
            ...messages[index],
            metadata: {
              ...(messages[index].metadata ?? {}),
              thinkingUpdates: snapshot,
            },
          };
          return {...conversation, messages};
        });
        emitThinkingSnapshot();
      };

      const syncA2UISurfaces = () => {
        if (!assistantMessageId) {
          return;
        }
        const surfaceManager = a2uiProcessor.getSurfaceManager();
        const surfaceIds = surfaceManager.getAllSurfaceIds();
        if (surfaceIds.length === 0) {
          return;
        }

        const surfaces: Record<string, SerializableSurfaceState> = {};
        for (const surfaceId of surfaceIds) {
          const surface = surfaceManager.getSurface(surfaceId);
          if (surface) {
            // Serialize surface for React state storage
            surfaces[surfaceId] = serializeSurface(surface);
          }
        }

        applyUpdate((conversation) => {
          const messages = [...conversation.messages];
          const index = messages.findIndex(
            (message) => message.id === assistantMessageId,
          );
          if (index === -1) {
            return conversation;
          }
          const existingMetadata = messages[index].metadata ?? {};
          messages[index] = {
            ...messages[index],
            metadata: {
              ...existingMetadata,
              a2uiSurfaces: surfaces,
            },
          };
          return {...conversation, messages};
        });
      };

      const getAssistantMetadataSnapshot = ():
        | ConversationMessage['metadata']
        | undefined => {
        const hasThinking = thinkingUpdates.length > 0;
        const surfaceManager = a2uiProcessor.getSurfaceManager();
        const surfaceIds = surfaceManager.getAllSurfaceIds();
        const hasA2UISurfaces = surfaceIds.length > 0;

        if (!hasThinking && !hasA2UISurfaces) {
          return undefined;
        }

        const surfaces: Record<string, SerializableSurfaceState> = {};
        if (hasA2UISurfaces) {
          for (const surfaceId of surfaceIds) {
            const surface = surfaceManager.getSurface(surfaceId);
            if (surface) {
              surfaces[surfaceId] = serializeSurface(surface);
            }
          }
        }

        return {
          ...(hasThinking ? {thinkingUpdates: [...thinkingUpdates]} : {}),
          ...(hasA2UISurfaces ? {a2uiSurfaces: surfaces} : {}),
        } satisfies ConversationMessage['metadata'];
      };

      const recordThinkingUpdate = (
        text: string,
        kind: ConversationThinkingUpdate['kind'],
      ) => {
        const trimmed = text.trim();
        if (!trimmed) {
          return;
        }
        const last = thinkingUpdates.at(-1);
        if (last?.text === trimmed && last.kind === kind) {
          return;
        }
        const update: ConversationThinkingUpdate = {
          id: generateId(),
          text: trimmed,
          kind,
          timestamp: new Date().toISOString(),
        };
        thinkingUpdates = [...thinkingUpdates.slice(-24), update];
        syncThinkingMetadata();
      };

      const ensureAssistantMessage = (initialContent = '') => {
        if (assistantMessageId) {
          return assistantMessageId;
        }

        const messageId = generateId();
        const createdAt = new Date().toISOString();
        assistantMessageId = messageId;

        applyUpdate((conversation) => {
          if (
            conversation.messages.some((message) => message.id === messageId)
          ) {
            return conversation;
          }

          return {
            ...conversation,
            updatedAt: createdAt,
            messages: [
              ...conversation.messages,
              {
                id: messageId,
                role: 'assistant',
                content: initialContent,
                createdAt,
                kind: 'text',
                metadata: getAssistantMetadataSnapshot(),
              },
            ],
          };
        });

        return messageId;
      };

      const setAssistantMessageContent = (content: string) => {
        const trimmedContent = content.trim();
        accumulatedContent = content;
        const messageId = ensureAssistantMessage(trimmedContent);

        applyUpdate((conversation) => {
          const messages = [...conversation.messages];
          const index = messages.findIndex(
            (message) => message.id === messageId,
          );
          if (index === -1) {
            return conversation;
          }

          messages[index] = {
            ...messages[index],
            content: trimmedContent,
            kind: 'text',
            metadata:
              getAssistantMetadataSnapshot() ?? messages[index].metadata,
          };

          return {
            ...conversation,
            updatedAt: new Date().toISOString(),
            sessionId: resolvedSessionId ?? conversation.sessionId,
            messages,
          };
        });
      };

      const appendAssistantText = (delta: string) => {
        if (!delta) {
          return;
        }
        accumulatedContent += delta;
        setAssistantMessageContent(accumulatedContent);
      };

      const demotePendingReasoningBlock = () => {
        if (!pendingFinalReasoningBlock) {
          return;
        }
        recordThinkingUpdate(pendingFinalReasoningBlock, 'reasoning');
        pendingFinalReasoningBlock = null;
      };

      const finalizeAssistantResponse = () => {
        if (activeReasoningBuffer.trim()) {
          pendingFinalReasoningBlock = activeReasoningBuffer.trim();
          activeReasoningBuffer = '';
          activeReasoningMessageId = null;
        }

        if (pendingFinalReasoningBlock) {
          setAssistantMessageContent(pendingFinalReasoningBlock);
        }
      };

      const pushAssistantMessage = (
        content: string,
        kind: ConversationMessage['kind'],
        options: {
          metadata?: ConversationMessage['metadata'];
          ephemeral?: boolean;
        } = {},
      ) => {
        const timestamp = new Date().toISOString();
        const messageId = generateId();
        applyUpdate((conversation) => ({
          ...conversation,
          updatedAt: timestamp,
          messages: [
            ...conversation.messages,
            {
              id: messageId,
              role: 'assistant',
              content,
              createdAt: timestamp,
              kind,
              ephemeral: options.ephemeral ?? false,
              metadata: options.metadata,
            },
          ],
        }));
        return messageId;
      };

      const pushErrorBubble = (text: string) => {
        pushAssistantMessage(text, 'error');
      };

      const updateResolvedSession = (sessionValue: string | null) => {
        if (!sessionValue || sessionValue === resolvedSessionId) {
          return;
        }
        resolvedSessionId = sessionValue;
        applyUpdate((conversation) => ({
          ...conversation,
          sessionId: sessionValue,
        }));
      };

      const readSessionId = (value: unknown): string | null => {
        if (!value || typeof value !== 'object') {
          return null;
        }
        const record = value as Record<string, unknown>;
        const candidates = [
          record.threadId,
          record.sessionId,
          record.conversationSessionId,
        ];
        for (const candidate of candidates) {
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
          }
        }
        return null;
      };

      const resolveSessionIdFromEvent = (
        event: AssistantStreamEvent,
      ): string | null => {
        if ('threadId' in event && typeof event.threadId === 'string') {
          return event.threadId;
        }
        if (event.type === 'CUSTOM') {
          return readSessionId(event.value);
        }
        return null;
      };

      const updateSessionFromEvent = (event: AssistantStreamEvent) => {
        updateResolvedSession(resolveSessionIdFromEvent(event));
      };

      try {
        logInfo('streaming request start', {
          conversationLocalId,
          sessionId,
          endpoint,
        });

        resetThinkingState();

        const initialStatusMessage = showInitialStatus
          ? CONNECTING_STATUS_MESSAGE
          : DEFAULT_STATUS_MESSAGE;

        pushAssistantMessage(initialStatusMessage, 'status', {
          ephemeral: true,
        });
        recordThinkingUpdate(initialStatusMessage, 'status');
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
          capturedErrorMessage = message;
          recordThinkingUpdate(message, 'status');
          turnCompleted = true;
          syncThinkingMetadata();
          pushErrorBubble(message);
          setStreamError(message);
          throw new Error(message);
        }

        const reader = response.body.getReader();

        const resolveDisplayText = (
          value: unknown,
          fallback: string,
        ): string => {
          if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed || fallback;
          }

          if (value && typeof value === 'object') {
            const record = value as Record<string, unknown>;
            const keys = ['message', 'content', 'status', 'detail', 'text'];

            for (const key of keys) {
              const candidate = record[key];
              if (typeof candidate === 'string') {
                const trimmed = candidate.trim();
                if (trimmed) {
                  return trimmed;
                }
              }
            }
          }

          return fallback;
        };

        const formatToolStartMessage = (name: string | undefined) => {
          const trimmed = name?.trim();
          if (!trimmed) {
            return DEFAULT_TOOL_PROGRESS_MESSAGE;
          }
          return `Starting ${trimmed}...`;
        };

        const applyTextDelta = (
          _messageId: string | undefined,
          delta: string,
        ) => {
          appendAssistantText(delta);
        };

        const processEvent = (event: {event: string; data: string}) => {
          if (!event.data) return;

          const parsedEvent = parseAssistantStreamEvent(event);

          switch (parsedEvent.type) {
            case 'turn_started': {
              // Theres a platform-level envelope — arrives before RUN_STARTED so
              // we use it to show the initial thinking status immediately.
              if (thinkingUpdates.length === 0) {
                recordThinkingUpdate(DEFAULT_STATUS_MESSAGE, 'status');
              } else {
                emitThinkingSnapshot();
              }
              return;
            }
            case 'RUN_STARTED': {
              updateSessionFromEvent(parsedEvent);

              if (thinkingUpdates.length === 0) {
                recordThinkingUpdate(DEFAULT_STATUS_MESSAGE, 'status');
              } else {
                emitThinkingSnapshot();
              }

              return;
            }
            case 'RUN_ERROR': {
              updateSessionFromEvent(parsedEvent);

              const errorText = parsedEvent.message || GENERIC_ERROR_MESSAGE;
              capturedErrorMessage = errorText;
              recordThinkingUpdate(errorText, 'status');
              turnCompleted = true;
              syncThinkingMetadata();
              pushErrorBubble(errorText);
              setStreamError(errorText);
              controller.abort();
              return;
            }
            case 'RUN_FINISHED': {
              updateSessionFromEvent(parsedEvent);
              finalizeAssistantResponse();
              turnCompleted = true;
              syncThinkingMetadata();
              setIsStreaming(false);
              return;
            }
            case 'REASONING_START': {
              updateSessionFromEvent(parsedEvent);
              return;
            }
            case 'REASONING_END': {
              updateSessionFromEvent(parsedEvent);
              return;
            }
            case 'REASONING_MESSAGE_START': {
              updateSessionFromEvent(parsedEvent);
              demotePendingReasoningBlock();
              activeReasoningMessageId = parsedEvent.messageId;
              activeReasoningBuffer = '';
              return;
            }
            case 'REASONING_MESSAGE_CONTENT': {
              updateSessionFromEvent(parsedEvent);
              if (
                !activeReasoningMessageId ||
                activeReasoningMessageId !== parsedEvent.messageId
              ) {
                activeReasoningMessageId = parsedEvent.messageId;
                activeReasoningBuffer = '';
              }
              activeReasoningBuffer += parsedEvent.delta;
              return;
            }
            case 'REASONING_MESSAGE_END': {
              updateSessionFromEvent(parsedEvent);
              if (
                activeReasoningMessageId &&
                activeReasoningMessageId !== parsedEvent.messageId
              ) {
                return;
              }
              pendingFinalReasoningBlock = activeReasoningBuffer.trim() || null;
              activeReasoningBuffer = '';
              activeReasoningMessageId = null;
              emitThinkingSnapshot();
              return;
            }
            case 'TEXT_MESSAGE_START': {
              updateSessionFromEvent(parsedEvent);
              ensureAssistantMessage('');
              syncA2UISurfaces();
              return;
            }
            case 'TEXT_MESSAGE_CONTENT': {
              updateSessionFromEvent(parsedEvent);
              applyTextDelta(parsedEvent.messageId, parsedEvent.delta);
              return;
            }
            case 'TEXT_MESSAGE_END': {
              updateSessionFromEvent(parsedEvent);
              return;
            }
            case 'TEXT_MESSAGE_CHUNK': {
              updateSessionFromEvent(parsedEvent);
              if (parsedEvent.delta) {
                applyTextDelta(parsedEvent.messageId, parsedEvent.delta);
              }
              return;
            }
            case 'TOOL_CALL_START': {
              updateSessionFromEvent(parsedEvent);
              const toolText = formatToolStartMessage(parsedEvent.toolCallName);
              if (seenStatusMessages.has(toolText)) {
                return;
              }
              seenStatusMessages.add(toolText);
              recordThinkingUpdate(toolText, 'tool');
              if (!assistantMessageId) {
                pushAssistantMessage(toolText, 'tool', {ephemeral: true});
              }
              return;
            }
            case 'TOOL_CALL_ARGS': {
              // Raw tool call arguments (JSON) are internal — do not surface to
              // the thinking panel or status bubbles. They would appear as noise
              // like `{"query":"sunglasses","perPage":3}` to the user.
              updateSessionFromEvent(parsedEvent);
              return;
            }
            case 'TOOL_CALL_END': {
              updateSessionFromEvent(parsedEvent);
              return;
            }
            case 'TOOL_CALL_RESULT': {
              // Raw tool result strings are internal (e.g. "NextActionsBar queued
              // on surface 'next-actions-surface' with 3 action(s)."). These
              // are implementation details — do not surface to the thinking panel
              // or status bubbles.
              updateSessionFromEvent(parsedEvent);
              return;
            }
            case 'ACTIVITY_SNAPSHOT': {
              updateSessionFromEvent(parsedEvent);
              a2uiProcessor.processActivitySnapshot(parsedEvent);
              ensureAssistantMessage(accumulatedContent);
              syncA2UISurfaces();
              a2uiSurfacesSynced = true;
              return;
            }
            case 'STATE_SNAPSHOT': {
              updateSessionFromEvent(parsedEvent);
              return;
            }
            case 'CUSTOM': {
              updateSessionFromEvent(parsedEvent);
              const customName = parsedEvent.name;
              const customValue = parsedEvent.value;

              if (customName === 'status' || customName === 'status_update') {
                const statusText = resolveDisplayText(
                  customValue,
                  DEFAULT_STATUS_MESSAGE,
                );
                if (!statusText) {
                  return;
                }
                if (seenStatusMessages.has(statusText)) {
                  return;
                }
                seenStatusMessages.add(statusText);
                recordThinkingUpdate(statusText, 'status');
                if (!assistantMessageId) {
                  pushAssistantMessage(statusText, 'status', {ephemeral: true});
                }
                return;
              }

              if (customName === 'tool_result') {
                const result = parseToolResultPayload(customValue);
                const successNote =
                  result.message ??
                  resolveDisplayText(customValue, TOOL_RESULT_FALLBACK_MESSAGE);
                recordThinkingUpdate(successNote, 'tool');
                if (!assistantMessageId) {
                  pushAssistantMessage(successNote, 'tool', {ephemeral: true});
                }
                return;
              }

              return;
            }
            case 'UNKNOWN': {
              logWarn('unknown SSE event', {
                event: parsedEvent.event,
                payload: parsedEvent.payload,
              });
              return;
            }
          }
        };

        const bufferProcessor = createBufferProcessor((event) => {
          if (event.data) {
            processEvent(event);
          }
        });

        await processSSEStream(reader, bufferProcessor);

        finalizeAssistantResponse();

        if (latestSnapshot) {
          const finalUpdatedAt = new Date().toISOString();

          setConversations((prev) =>
            sortConversations(
              prev.map((conversation) => {
                if (conversation.localId !== conversationLocalId) {
                  return conversation;
                }

                const nextSessionId =
                  resolvedSessionId ?? conversation.sessionId;

                return {
                  ...conversation,
                  sessionId: nextSessionId,
                  updatedAt: finalUpdatedAt,
                  isPersisted:
                    conversation.isPersisted || Boolean(nextSessionId),
                };
              }),
            ),
          );
        }

        if (!turnCompleted && !capturedErrorMessage) {
          // For pure A2UI turns the backend may not send RUN_FINISHED — if we
          // successfully synced surfaces to an assistant message the turn is
          // effectively complete and we should not surface a spurious error.
          if (a2uiSurfacesSynced) {
            turnCompleted = true;
            syncThinkingMetadata();
            setIsStreaming(false);
          } else {
            const interruptionMessage = INTERRUPTED_ERROR_MESSAGE;
            capturedErrorMessage = interruptionMessage;
            recordThinkingUpdate(interruptionMessage, 'status');
            turnCompleted = true;
            syncThinkingMetadata();
            pushErrorBubble(interruptionMessage);
            setStreamError(interruptionMessage);
          }
        }
      } catch (error) {
        if ((error as DOMException)?.name === 'AbortError') {
          if (capturedErrorMessage) {
            logWarn('streaming request aborted after server-side error', {
              conversationLocalId,
              sessionId: resolvedSessionId ?? sessionId,
            });
          } else {
            logInfo('streaming request aborted', {
              conversationLocalId,
              sessionId: resolvedSessionId ?? sessionId,
            });
          }
          return;
        }
        logError('streaming request error', {
          error,
          conversationLocalId,
          sessionId: resolvedSessionId ?? sessionId,
        });
        if (!capturedErrorMessage) {
          setStreamError(GENERIC_ERROR_MESSAGE);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
        setIsStreaming(false);
        logDebug('streaming request finished', {
          conversationLocalId,
          sessionId: resolvedSessionId ?? sessionId,
        });
      }
    },
    [
      endpoint,
      locale,
      setConversations,
      setIsStreaming,
      setStreamError,
      onThinkingUpdate,
    ],
  );

  return {streamAssistantResponse, abortStream};
}
