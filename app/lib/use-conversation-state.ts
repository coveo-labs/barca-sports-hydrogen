import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type {ConversationSummary} from '~/types/conversation';
import {
  type ConversationRecord,
  loadConversationsFromStorage,
  mapSummaryToRecord,
  mergeConversations,
  persistConversationsToStorage,
} from '~/lib/generative-chat';

type UseConversationStateOptions = {
  initialSummaries: ConversationSummary[];
  loaderActiveId: string | null;
};

type UseConversationStateReturn = {
  conversations: ConversationRecord[];
  setConversations: Dispatch<SetStateAction<ConversationRecord[]>>;
  activeConversationId: string | null;
  setActiveConversationId: Dispatch<SetStateAction<string | null>>;
  isHydrated: boolean;
};

export function useConversationState({
  initialSummaries,
  loaderActiveId,
}: UseConversationStateOptions): UseConversationStateReturn {
  const initialRecords = useMemo(
    () => initialSummaries.map(mapSummaryToRecord),
    [initialSummaries],
  );

  const [conversations, setConversations] = useState<ConversationRecord[]>(
    initialRecords,
  );

  useEffect(() => {
    setConversations((prev) => mergeConversations(prev, initialRecords));
  }, [initialRecords]);

  const initialActiveLocalId = useMemo(() => {
    if (!loaderActiveId) {
      return initialRecords[0]?.localId ?? null;
    }

    const match =
      initialRecords.find((conversation) => {
        return (
          conversation.sessionId === loaderActiveId ||
          conversation.localId === loaderActiveId
        );
      }) ?? null;

    return match?.localId ?? initialRecords[0]?.localId ?? null;
  }, [initialRecords, loaderActiveId]);

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(initialActiveLocalId);

  useEffect(() => {
    setActiveConversationId((current) => {
      if (
        current &&
        conversations.some((conversation) => conversation.localId === current)
      ) {
        return current;
      }

      if (loaderActiveId) {
        const next = conversations.find((conversation) => {
          return (
            conversation.localId === loaderActiveId ||
            conversation.sessionId === loaderActiveId
          );
        });
        if (next) {
          return next.localId;
        }
      }

      return conversations[0]?.localId ?? null;
    });
  }, [conversations, loaderActiveId]);

  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const storageLoadedRef = useRef(false);
  useEffect(() => {
    if (!isHydrated || storageLoadedRef.current) {
      return;
    }

    const stored = loadConversationsFromStorage();
    if (stored.length > 0) {
      setConversations((prev) => mergeConversations(prev, stored));
    }

    storageLoadedRef.current = true;
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    persistConversationsToStorage(conversations);
  }, [conversations, isHydrated]);

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    isHydrated,
  };
}
