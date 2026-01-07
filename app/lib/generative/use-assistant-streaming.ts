import {useCallback, useRef} from 'react';
import type {Product} from '@coveo/headless-react/ssr-commerce';
import type {Dispatch, SetStateAction} from 'react';
import type {
  ConversationMessage,
  ConversationThinkingUpdate,
} from '~/types/conversation';
import {
  type ConversationRecord,
  generateId,
  sortConversations,
} from '~/lib/generative/chat';
import {logDebug, logError, logInfo, logWarn} from '~/lib/logger';
import {resolveProductId} from '~/lib/generative/product-identifier';
import {
  createBufferProcessor,
  parseAssistantStreamEvent,
  processSSEStream,
  type SessionIdentifier,
  type StreamArgs,
  type ThinkingUpdateSnapshot,
  CONNECTING_STATUS_MESSAGE,
  CONNECTION_ERROR_MESSAGE,
  DEFAULT_STATUS_MESSAGE,
  GENERIC_ERROR_MESSAGE,
  INTERRUPTED_ERROR_MESSAGE,
  TOOL_RESULT_FALLBACK_MESSAGE,
} from '~/lib/generative/streaming';

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
      let collectedProducts: Product[] = [];
      let capturedErrorMessage: string | null = null;
      let turnCompleted = false;
      const seenStatusMessages = new Set<string>();
      let thinkingUpdates: ConversationThinkingUpdate[] = [];

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

      const upsertCollectedProducts = (incoming: Product[]) => {
        if (!incoming.length) {
          return;
        }
        const nextProducts = [...collectedProducts];
        const indexByKey = new Map<string, number>();
        for (const [index, product] of nextProducts.entries()) {
          const key = resolveProductId(product);
          if (key) {
            indexByKey.set(key, index);
          }
        }
        for (const product of incoming) {
          const key = resolveProductId(product);
          if (!key) {
            nextProducts.push(product);
            continue;
          }
          const existingIndex = indexByKey.get(key);
          if (existingIndex === undefined) {
            indexByKey.set(key, nextProducts.length);
            nextProducts.push(product);
            continue;
          }
          nextProducts[existingIndex] = product;
        }
        collectedProducts = nextProducts;
      };

      const syncProductMetadata = () => {
        if (!assistantMessageId || collectedProducts.length === 0) {
          return;
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
              products: [...collectedProducts],
            },
          };
          return {...conversation, messages};
        });
      };

      const getAssistantMetadataSnapshot = ():
        | ConversationMessage['metadata']
        | undefined => {
        const hasThinking = thinkingUpdates.length > 0;
        const hasProducts = collectedProducts.length > 0;
        if (!hasThinking && !hasProducts) {
          return undefined;
        }
        return {
          ...(hasThinking ? {thinkingUpdates: [...thinkingUpdates]} : {}),
          ...(hasProducts ? {products: [...collectedProducts]} : {}),
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

      const updateResolvedSession = (payload: SessionIdentifier) => {
        const sessionValue = payload.sessionId ?? null;
        if (!sessionValue || sessionValue === resolvedSessionId) {
          return;
        }
        resolvedSessionId = sessionValue;
        applyUpdate((conversation) => ({
          ...conversation,
          sessionId: sessionValue,
        }));
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

        const processEvent = (event: {event: string; data: string}) => {
          if (!event.data) return;

          const parsedEvent = parseAssistantStreamEvent(event);

          const updateSessionFromPayload = (payload: SessionIdentifier) => {
            updateResolvedSession(payload);
          };

          switch (parsedEvent.type) {
            case 'turn_started': {
              updateSessionFromPayload(parsedEvent.payload);

              if (thinkingUpdates.length === 0) {
                recordThinkingUpdate(DEFAULT_STATUS_MESSAGE, 'status');
              } else {
                emitThinkingSnapshot();
              }

              return;
            }
            case 'status':
            case 'status_update': {
              updateSessionFromPayload(parsedEvent.payload);

              const statusText = parsedEvent.payload.message;
              if (!statusText) {
                return;
              }

              if (seenStatusMessages.has(statusText)) {
                return;
              }
              seenStatusMessages.add(statusText);

              recordThinkingUpdate(statusText, 'status');

              if (assistantMessageId) {
                return;
              }

              pushAssistantMessage(statusText, 'status', {ephemeral: true});
              return;
            }
            case 'tool_invocation': {
              updateSessionFromPayload(parsedEvent.payload);

              const toolText = parsedEvent.payload.message;
              if (!toolText) {
                return;
              }
              if (seenStatusMessages.has(toolText)) {
                return;
              }
              seenStatusMessages.add(toolText);

              recordThinkingUpdate(toolText, 'tool');

              if (assistantMessageId) {
                return;
              }

              pushAssistantMessage(toolText, 'tool', {ephemeral: true});
              return;
            }
            case 'tool_result': {
              updateSessionFromPayload(parsedEvent.payload);
              const successNote =
                parsedEvent.payload.message ?? TOOL_RESULT_FALLBACK_MESSAGE;

              recordThinkingUpdate(successNote, 'tool');

              if (!assistantMessageId) {
                pushAssistantMessage(successNote, 'tool', {ephemeral: true});
              }

              const productList = parsedEvent.payload.products ?? [];
              if (productList.length > 0) {
                upsertCollectedProducts(productList);
                if (assistantMessageId) {
                  syncProductMetadata();
                }
              }

              return;
            }
            case 'error': {
              updateSessionFromPayload(parsedEvent.payload);

              const errorText = parsedEvent.payload.message;
              capturedErrorMessage = errorText;
              recordThinkingUpdate(errorText, 'status');
              turnCompleted = true;
              syncThinkingMetadata();
              pushErrorBubble(errorText);
              setStreamError(errorText);
              controller.abort();
              return;
            }
            case 'turn_complete': {
              updateSessionFromPayload(parsedEvent.payload);
              turnCompleted = true;
              syncThinkingMetadata();
              setIsStreaming(false);
              return;
            }
            case 'message': {
              updateSessionFromPayload(parsedEvent.payload);
              const chunk = parsedEvent.payload.message;
              if (!chunk) {
                return;
              }

              accumulatedContent += chunk;
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
                syncProductMetadata();
              }
              return;
            }
            case 'unknown': {
              logWarn('unknown SSE event', {
                event: parsedEvent.event,
                payload: parsedEvent.payload.message,
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
          const interruptionMessage = INTERRUPTED_ERROR_MESSAGE;
          capturedErrorMessage = interruptionMessage;
          recordThinkingUpdate(interruptionMessage, 'status');
          turnCompleted = true;
          syncThinkingMetadata();
          pushErrorBubble(interruptionMessage);
          setStreamError(interruptionMessage);
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
