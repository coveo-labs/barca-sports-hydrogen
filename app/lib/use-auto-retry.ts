import {useCallback, useEffect, useRef} from 'react';
import type {Dispatch, MutableRefObject, SetStateAction} from 'react';
import type {ConversationRecord} from '~/lib/generative-chat';
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
  sendMessageRef: MutableRefObject<((message: string) => Promise<void>) | null>;
};

type UseAutoRetryReturn = {
  isRetryingRef: MutableRefObject<boolean>;
  retryCount: number;
  resetRetryCount: () => void;
};

export function useAutoRetry({
  streamError,
  isStreaming,
  sessionId,
  conversationId,
  setConversations,
  setStreamError,
  sendMessageRef,
}: UseAutoRetryOptions): UseAutoRetryReturn {
  const retryCountRef = useRef(0);
  const isRetryingRef = useRef(false);

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

    const performAutoRetry = async () => {
      retryCountRef.current += 1;
      isRetryingRef.current = true;

      logDebug('performing auto-retry', {
        attempt: retryCountRef.current,
        maxRetries: MAX_AUTO_RETRIES,
        conversationId,
      });

      removeLastErrorMessage();
      setStreamError(null);

      try {
        const sendMessage = sendMessageRef.current;
        if (sendMessage) {
          await sendMessage(AUTO_RETRY_MESSAGE);
        }
      } finally {
        isRetryingRef.current = false;
      }
    };

    const timeoutId = setTimeout(() => {
      void performAutoRetry();
    }, RETRY_DELAY_MS);

    return () => clearTimeout(timeoutId);
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
    retryCount: retryCountRef.current,
    resetRetryCount,
  };
}
