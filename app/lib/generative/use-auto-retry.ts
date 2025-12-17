import {useCallback, useEffect, useRef} from 'react';
import type {Dispatch, MutableRefObject, SetStateAction} from 'react';
import type {ConversationRecord} from '~/lib/generative/chat';
import {logDebug} from '~/lib/logger';

const MAX_AUTO_RETRIES = 2;
const AUTO_RETRY_MESSAGE = 'continue';
const RETRY_DELAY_MS = 500;

type UseAutoRetryOptions = {
  streamError: string | null;
  isStreaming: boolean;
  sessionId: string | null;
  conversationId: string | null;
  setConversations: Dispatch<SetStateAction<ConversationRecord[]>>;
  setStreamError: Dispatch<SetStateAction<string | null>>;
};

type UseAutoRetryReturn = {
  isRetryingRef: MutableRefObject<boolean>;
  resetRetryCount: () => void;
  sendMessageRef: MutableRefObject<
    ((message: string, options?: {isAutoRetry?: boolean}) => Promise<void>) | null
  >;
};

export function useAutoRetry({
  streamError,
  isStreaming,
  sessionId,
  conversationId,
  setConversations,
  setStreamError,
}: UseAutoRetryOptions): UseAutoRetryReturn {
  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);
  const sendMessageRef = useRef<
    ((message: string, options?: {isAutoRetry?: boolean}) => Promise<void>) | null
  >(null);

  const removeLastErrorMessage = useCallback(() => {
    setConversations((prev) =>
      prev.map((conversation) => {
        if (conversation.localId !== conversationId) {
          return conversation;
        }
        const messages = [...conversation.messages];
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].kind === 'error') {
            messages.splice(i, 1);
            break;
          }
        }
        return {...conversation, messages};
      }),
    );
  }, [conversationId, setConversations]);

  useEffect(() => {
    if (!streamError || isStreaming || isRetryingRef.current) {
      return;
    }

    if (retryCountRef.current >= MAX_AUTO_RETRIES) {
      logDebug('auto-retry limit reached', {
        retryCount: retryCountRef.current,
        maxRetries: MAX_AUTO_RETRIES,
      });
      return;
    }

    if (!sessionId) {
      logDebug('cannot auto-retry: no session id');
      return;
    }

    retryCountRef.current += 1;
    isRetryingRef.current = true;

    logDebug('scheduling auto-retry', {
      attempt: retryCountRef.current,
      maxRetries: MAX_AUTO_RETRIES,
      conversationId,
    });

    const performAutoRetry = async () => {
      removeLastErrorMessage();
      setStreamError(null);

      try {
        const sendMessage = sendMessageRef.current;
        if (sendMessage) {
          await sendMessage(AUTO_RETRY_MESSAGE, {isAutoRetry: true});
        }
      } finally {
        isRetryingRef.current = false;
      }
    };

    const timeoutId = setTimeout(() => {
      void performAutoRetry();
    }, RETRY_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
      isRetryingRef.current = false;
    };
  }, [
    streamError,
    isStreaming,
    sessionId,
    conversationId,
    sendMessageRef,
    setStreamError,
    removeLastErrorMessage,
  ]);

  const resetRetryCount = useCallback(() => {
    retryCountRef.current = 0;
  }, []);

  return {
    isRetryingRef,
    resetRetryCount,
    sendMessageRef,
  };
}
