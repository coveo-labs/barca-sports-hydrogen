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
      let assistantMessageId: string | null = null;
      let accumulatedContent = '';
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
          messageId: string | undefined,
          delta: string,
        ) => {
          if (!delta) {
            return;
          }

          const resolvedMessageId =
            messageId ?? assistantMessageId ?? generateId();
          if (assistantMessageId !== resolvedMessageId) {
            assistantMessageId = resolvedMessageId;
            accumulatedContent = '';
          }

          accumulatedContent += delta;
          const contentSnapshot = accumulatedContent;
          let createdAssistantMessage = false;

          applyUpdate((conversation) => {
            const messages = [...conversation.messages];
            if (!assistantMessageId) {
              assistantMessageId = generateId();
              createdAssistantMessage = true;
              messages.push({
                id: assistantMessageId,
                role: 'assistant',
                content: contentSnapshot,
                createdAt: new Date().toISOString(),
                kind: 'text',
                metadata: getAssistantMetadataSnapshot(),
              });
            } else {
              const index = messages.findIndex(
                (message) => message.id === assistantMessageId,
              );
              if (index >= 0) {
                messages[index] = {
                  ...messages[index],
                  content: contentSnapshot,
                  kind: 'text',
                };
              } else {
                createdAssistantMessage = true;
                messages.push({
                  id: assistantMessageId,
                  role: 'assistant',
                  content: contentSnapshot,
                  createdAt: new Date().toISOString(),
                  kind: 'text',
                  metadata: getAssistantMetadataSnapshot(),
                });
              }
            }

            return {
              ...conversation,
              updatedAt: new Date().toISOString(),
              sessionId: resolvedSessionId ?? conversation.sessionId,
              messages,
            };
          });

          if (createdAssistantMessage) {
            syncThinkingMetadata();
          }
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
              turnCompleted = true;
              syncThinkingMetadata();
              setIsStreaming(false);
              return;
            }
            case 'TEXT_MESSAGE_START': {
              updateSessionFromEvent(parsedEvent);
              const previousSyntheticId =
                assistantMessageId &&
                assistantMessageId !== parsedEvent.messageId
                  ? assistantMessageId
                  : null;
              if (previousSyntheticId) {
                accumulatedContent = '';
              }
              assistantMessageId = parsedEvent.messageId;
              // Pre-insert the assistant message with the known ID so that
              // syncA2UISurfaces can attach skeleton surface metadata to it
              // immediately. applyTextDelta will find this message by ID and
              // update its content in-place rather than creating a new one.
              // Without this, syncA2UISurfaces would error ("Message not found")
              // because the message doesn't exist until the first text delta.
              //
              // If ACTIVITY_SNAPSHOT already created a synthetic placeholder with
              // a locally-generated ID, rename that message to the backend ID
              // instead of inserting a second assistant message — that would cause
              // the double-render bug where both the skeleton surface and the real
              // response appear as separate bubbles.
              applyUpdate((conversation) => {
                if (previousSyntheticId) {
                  const idx = conversation.messages.findIndex(
                    (m) => m.id === previousSyntheticId,
                  );
                  if (idx !== -1) {
                    const messages = [...conversation.messages];
                    messages[idx] = {
                      ...messages[idx],
                      id: parsedEvent.messageId,
                    };
                    return {...conversation, messages};
                  }
                }
                const alreadyExists = conversation.messages.some(
                  (m) => m.id === assistantMessageId,
                );
                if (alreadyExists) return conversation;
                return {
                  ...conversation,
                  messages: [
                    ...conversation.messages,
                    {
                      id: assistantMessageId!,
                      role: 'assistant' as const,
                      content: '',
                      createdAt: new Date().toISOString(),
                      kind: 'text' as const,
                      ephemeral: false,
                      metadata: getAssistantMetadataSnapshot(),
                    },
                  ],
                };
              });
              // Now flush any skeleton/surface snapshots that arrived before
              // TEXT_MESSAGE_START — the message exists so syncA2UISurfaces
              // will successfully write them into metadata.
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
              // If no TEXT_MESSAGE_START has arrived yet (pure A2UI turn where
              // the backend emits only ACTIVITY_SNAPSHOT events with no text),
              // we still need a real assistant message in the conversation so
              // that syncA2UISurfaces can attach surface metadata to it.
              // Mirror what TEXT_MESSAGE_START does: synthesise an empty
              // assistant message and store its ID so subsequent snapshots and
              // any late-arriving TEXT_MESSAGE_START/CONTENT events all target
              // the same message.
              if (!assistantMessageId) {
                assistantMessageId = generateId();
                applyUpdate((conversation) => {
                  const alreadyExists = conversation.messages.some(
                    (m) => m.id === assistantMessageId,
                  );
                  if (alreadyExists) return conversation;
                  return {
                    ...conversation,
                    messages: [
                      ...conversation.messages,
                      {
                        id: assistantMessageId!,
                        role: 'assistant' as const,
                        content: '',
                        createdAt: new Date().toISOString(),
                        kind: 'text' as const,
                        ephemeral: false,
                        metadata: getAssistantMetadataSnapshot(),
                      },
                    ],
                  };
                });
              }
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

        if (latestSnapshot) {
          const snapshot: ConversationRecord = latestSnapshot;
          const finalSnapshot: ConversationRecord = {
            ...snapshot,
            sessionId: resolvedSessionId ?? snapshot.sessionId,
            updatedAt: new Date().toISOString(),
            isPersisted:
              snapshot.isPersisted ||
              Boolean(resolvedSessionId ?? snapshot.sessionId),
          };

          setConversations((prev) =>
            sortConversations(
              prev.map((conversation) =>
                conversation.localId === finalSnapshot.localId
                  ? finalSnapshot
                  : conversation,
              ),
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
