import {useCallback, useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router';
import type {ConversationRecord} from '~/lib/generative/chat';

type UseConversationUrlSyncOptions = {
  activeConversationId: string | null;
  conversations: ConversationRecord[];
  isHydrated: boolean;
};

export function useConversationUrlSync({
  activeConversationId,
  conversations,
  isHydrated,
}: UseConversationUrlSyncOptions) {
  const location = useLocation();
  const navigate = useNavigate();

  const updateConversationQuery = useCallback(
    (sessionId: string | null) => {
      const searchParams = new URLSearchParams(location.search);
      const currentValue = searchParams.get('conversationId');

      if (sessionId) {
        if (currentValue === sessionId) {
          return;
        }
        searchParams.set('conversationId', sessionId);
      } else {
        if (!currentValue) {
          return;
        }
        searchParams.delete('conversationId');
      }

      const searchString = searchParams.toString();
      navigate(
        {
          pathname: location.pathname,
          search: searchString ? `?${searchString}` : '',
          hash: location.hash,
        },
        {replace: true},
      );
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const active =
      conversations.find(
        (conversation) => conversation.localId === activeConversationId,
      ) ?? null;

    updateConversationQuery(active?.sessionId ?? null);
  }, [activeConversationId, conversations, isHydrated, updateConversationQuery]);

  return {updateConversationQuery};
}
