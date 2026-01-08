import {useCallback, useEffect, useMemo, useState} from 'react';
import type {ThinkingUpdateSnapshot} from '~/lib/generative/use-assistant-streaming';
import {PENDING_THINKING_KEY} from '~/lib/generative/thinking-constants';
import type {ConversationMessage} from '~/types/conversation';

interface UseThinkingStateArgs {
  visibleMessages: ConversationMessage[];
  isStreaming: boolean;
  latestStreamingAssistantId: string | null;
  activeConversationId: string | null;
}

interface ThinkingStateApi {
  activeSnapshot: ThinkingUpdateSnapshot | null;
  pendingSnapshot: ThinkingUpdateSnapshot | null;
  expandedByMessage: Record<string, boolean>;
  setActiveSnapshot: (snapshot: ThinkingUpdateSnapshot | null) => void;
  clearActiveSnapshot: () => void;
  toggleMessageExpansion: (messageId: string, next: boolean) => void;
  togglePendingExpansion: (next: boolean) => void;
}

export function useThinkingState({
  visibleMessages,
  isStreaming,
  latestStreamingAssistantId,
  activeConversationId,
}: UseThinkingStateArgs): ThinkingStateApi {
  const [activeSnapshot, setActiveSnapshot] =
    useState<ThinkingUpdateSnapshot | null>(null);
  const [expandedByMessage, setExpandedByMessage] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setActiveSnapshot(null);
    setExpandedByMessage({});
  }, [activeConversationId]);

  useEffect(() => {
    if (!isStreaming) {
      setActiveSnapshot(null);
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming || !latestStreamingAssistantId) {
      return;
    }
    setExpandedByMessage((prev) => {
      if (Object.hasOwn(prev, latestStreamingAssistantId)) {
        return prev;
      }
      return {
        ...prev,
        [latestStreamingAssistantId]: false,
      };
    });
  }, [isStreaming, latestStreamingAssistantId]);

  useEffect(() => {
    if (!activeSnapshot) {
      return;
    }

    const messageId = activeSnapshot.messageId;
    if (!messageId) {
      setExpandedByMessage((prev) => {
        if (Object.hasOwn(prev, PENDING_THINKING_KEY)) {
          return prev;
        }
        return {
          ...prev,
          [PENDING_THINKING_KEY]: false,
        };
      });
      return;
    }

    setExpandedByMessage((prev) => {
      const hasMessageEntry = Object.hasOwn(prev, messageId);

      if (hasMessageEntry) {
        if (Object.hasOwn(prev, PENDING_THINKING_KEY)) {
          const {[PENDING_THINKING_KEY]: _, ...rest} = prev;
          return rest;
        }
        return prev;
      }

      const {[PENDING_THINKING_KEY]: _, ...rest} = prev;
      return {
        ...rest,
        [messageId]: false,
      };
    });
  }, [activeSnapshot]);

  useEffect(() => {
    if (activeSnapshot) {
      return;
    }
    setExpandedByMessage((prev) => {
      if (!(PENDING_THINKING_KEY in prev)) {
        return prev;
      }
      const {[PENDING_THINKING_KEY]: __, ...rest} = prev;
      return rest;
    });
  }, [activeSnapshot]);

  const pendingSnapshot = useMemo(() => {
    if (!activeSnapshot) {
      return null;
    }

    if (!activeSnapshot.messageId) {
      return activeSnapshot;
    }

    const hasMatchingMessage = visibleMessages.some(
      (message) => message.id === activeSnapshot.messageId,
    );

    return hasMatchingMessage ? null : activeSnapshot;
  }, [activeSnapshot, visibleMessages]);

  const toggleMessageExpansion = useCallback(
    (messageId: string, next: boolean) => {
      setExpandedByMessage((prev) => ({
        ...prev,
        [messageId]: next,
      }));
    },
    [],
  );

  const togglePendingExpansion = useCallback((next: boolean) => {
    setExpandedByMessage((prev) => ({
      ...prev,
      [PENDING_THINKING_KEY]: next,
    }));
  }, []);

  const clearActiveSnapshot = useCallback(() => {
    setActiveSnapshot(null);
  }, []);

  return {
    activeSnapshot,
    pendingSnapshot,
    expandedByMessage,
    setActiveSnapshot,
    clearActiveSnapshot,
    toggleMessageExpansion,
    togglePendingExpansion,
  };
}
