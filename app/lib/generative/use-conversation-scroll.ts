import {useCallback, useEffect, useRef, type RefObject} from 'react';
import type {ThinkingUpdateSnapshot} from '~/lib/generative/use-assistant-streaming';
import type {ConversationMessage} from '~/types/conversation';

interface UseConversationScrollArgs {
  messages: ConversationMessage[];
  activeThinkingSnapshot: ThinkingUpdateSnapshot | null;
}

interface ConversationScrollApi {
  containerRef: RefObject<HTMLDivElement>;
  queueScrollToMessage: (messageId: string) => void;
  setAutoScrollSuspended: (isSuspended: boolean) => void;
  resetScrollState: () => void;
}

export function useConversationScroll({
  messages,
  activeThinkingSnapshot,
}: UseConversationScrollArgs): ConversationScrollApi {
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingScrollMessageIdRef = useRef<string | null>(null);
  const suspendAutoScrollRef = useRef<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const targetId = pendingScrollMessageIdRef.current;
    if (targetId) {
      const element = document.getElementById(`message-${targetId}`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
        pendingScrollMessageIdRef.current = null;
      } else if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          const retryElement = document.getElementById(`message-${targetId}`);
          if (retryElement instanceof HTMLElement) {
            retryElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
            pendingScrollMessageIdRef.current = null;
          }
        });
      }
    }

    if (suspendAutoScrollRef.current) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (suspendAutoScrollRef.current) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [activeThinkingSnapshot]);

  const queueScrollToMessage = useCallback((messageId: string) => {
    pendingScrollMessageIdRef.current = messageId;
    suspendAutoScrollRef.current = true;
  }, []);

  const setAutoScrollSuspended = useCallback((isSuspended: boolean) => {
    suspendAutoScrollRef.current = isSuspended;
  }, []);

  const resetScrollState = useCallback(() => {
    pendingScrollMessageIdRef.current = null;
    suspendAutoScrollRef.current = false;
  }, []);

  return {
    containerRef,
    queueScrollToMessage,
    setAutoScrollSuspended,
    resetScrollState,
  };
}
