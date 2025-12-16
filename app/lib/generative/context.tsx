import {createContext, useContext, useMemo, type ReactNode} from 'react';
import type {ConversationRecord} from '~/lib/generative/chat';
import type {ThinkingUpdateSnapshot} from '~/lib/generative/use-assistant-streaming';
import type {ConversationMessage} from '~/types/conversation';

type ConversationActions = {
  onNewConversation: () => void;
  onSelectConversation: (conversation: ConversationRecord) => void;
  onDeleteConversation: (conversation: ConversationRecord) => void;
};

type StreamingActions = {
  onSendMessage: (message: string) => void;
  onStop: () => void;
};

type ThinkingActions = {
  onToggleThinking: (messageId: string, next: boolean) => void;
  onTogglePendingThinking: (next: boolean) => void;
};

type GenerativeContextValue = {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamError: string | null;
  visibleMessages: ConversationMessage[];
  latestUserMessageId: string | null;
  latestStreamingAssistantId: string | null;
  activeSnapshot: ThinkingUpdateSnapshot | null;
  pendingSnapshot: ThinkingUpdateSnapshot | null;
  expandedByMessage: Record<string, boolean>;
  actions: ConversationActions & StreamingActions & ThinkingActions;
};

const GenerativeContext = createContext<GenerativeContextValue | null>(null);

function useGenerativeContext(): GenerativeContextValue {
  const context = useContext(GenerativeContext);
  if (!context) {
    throw new Error(
      'useGenerativeContext must be used within a GenerativeProvider',
    );
  }
  return context;
}

export function useConversationsState() {
  const {conversations, activeConversationId} = useGenerativeContext();
  return useMemo(
    () => ({conversations, activeConversationId}),
    [conversations, activeConversationId],
  );
}

export function useConversationActions(): ConversationActions {
  const {actions} = useGenerativeContext();
  return useMemo(
    () => ({
      onNewConversation: actions.onNewConversation,
      onSelectConversation: actions.onSelectConversation,
      onDeleteConversation: actions.onDeleteConversation,
    }),
    [
      actions.onNewConversation,
      actions.onSelectConversation,
      actions.onDeleteConversation,
    ],
  );
}

export function useStreamingState() {
  const {isStreaming, streamError} = useGenerativeContext();
  return {isStreaming, streamError};
}

export function useStreamingActions(): StreamingActions {
  const {actions} = useGenerativeContext();
  return useMemo(
    () => ({
      onSendMessage: actions.onSendMessage,
      onStop: actions.onStop,
    }),
    [actions.onSendMessage, actions.onStop],
  );
}

export function useMessagesContext() {
  const {visibleMessages, latestUserMessageId, latestStreamingAssistantId} =
    useGenerativeContext();
  return useMemo(
    () => ({visibleMessages, latestUserMessageId, latestStreamingAssistantId}),
    [visibleMessages, latestUserMessageId, latestStreamingAssistantId],
  );
}

export function useThinkingContext() {
  const ctx = useGenerativeContext();
  return useMemo(
    () => ({
      activeSnapshot: ctx.activeSnapshot,
      pendingSnapshot: ctx.pendingSnapshot,
      expandedByMessage: ctx.expandedByMessage,
      onToggleThinking: ctx.actions.onToggleThinking,
      onTogglePendingThinking: ctx.actions.onTogglePendingThinking,
    }),
    [
      ctx.activeSnapshot,
      ctx.pendingSnapshot,
      ctx.expandedByMessage,
      ctx.actions.onToggleThinking,
      ctx.actions.onTogglePendingThinking,
    ],
  );
}

type GenerativeProviderProps = {
  children: ReactNode;
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  isStreaming: boolean;
  streamError: string | null;
  visibleMessages: ConversationMessage[];
  latestUserMessageId: string | null;
  latestStreamingAssistantId: string | null;
  activeSnapshot: ThinkingUpdateSnapshot | null;
  pendingSnapshot: ThinkingUpdateSnapshot | null;
  expandedByMessage: Record<string, boolean>;
  onNewConversation: () => void;
  onSelectConversation: (conversation: ConversationRecord) => void;
  onDeleteConversation: (conversation: ConversationRecord) => void;
  onSendMessage: (message: string) => void;
  onStop: () => void;
  onToggleThinking: (messageId: string, next: boolean) => void;
  onTogglePendingThinking: (next: boolean) => void;
};

export function GenerativeProvider({
  children,
  conversations,
  activeConversationId,
  isStreaming,
  streamError,
  visibleMessages,
  latestUserMessageId,
  latestStreamingAssistantId,
  activeSnapshot,
  pendingSnapshot,
  expandedByMessage,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onSendMessage,
  onStop,
  onToggleThinking,
  onTogglePendingThinking,
}: Readonly<GenerativeProviderProps>) {
  const actions = useMemo(
    () => ({
      onNewConversation,
      onSelectConversation,
      onDeleteConversation,
      onSendMessage,
      onStop,
      onToggleThinking,
      onTogglePendingThinking,
    }),
    [
      onNewConversation,
      onSelectConversation,
      onDeleteConversation,
      onSendMessage,
      onStop,
      onToggleThinking,
      onTogglePendingThinking,
    ],
  );

  const value = useMemo(
    () => ({
      conversations,
      activeConversationId,
      isStreaming,
      streamError,
      visibleMessages,
      latestUserMessageId,
      latestStreamingAssistantId,
      activeSnapshot,
      pendingSnapshot,
      expandedByMessage,
      actions,
    }),
    [
      conversations,
      activeConversationId,
      isStreaming,
      streamError,
      visibleMessages,
      latestUserMessageId,
      latestStreamingAssistantId,
      activeSnapshot,
      pendingSnapshot,
      expandedByMessage,
      actions,
    ],
  );

  return (
    <GenerativeContext.Provider value={value}>
      {children}
    </GenerativeContext.Provider>
  );
}
