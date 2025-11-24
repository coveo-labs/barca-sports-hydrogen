import cx from '~/lib/cx';
import {formatRelativeTime} from '~/lib/generative-chat';
import type {ConversationRecord} from '~/lib/generative-chat';

interface ConversationSidebarProps {
  conversations: ConversationRecord[];
  activeConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (conversation: ConversationRecord) => void;
  onDeleteConversation: (conversation: ConversationRecord) => void;
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
}: ConversationSidebarProps) {
  return (
    <aside className="hidden w-80 min-h-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur lg:flex">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Conversations
        </h2>
        <button
          type="button"
          className="rounded-full border border-transparent bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
          onClick={onNewConversation}
        >
          New chat
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-6 pt-4">
        {conversations.length === 0 ? (
          <p className="px-4 text-sm text-slate-500">
            Start a conversation to see it here.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {conversations.map((conversation) => {
              const isActive = conversation.localId === activeConversationId;
              return (
                <li key={conversation.localId}>
                  <div
                    className={cx(
                      'group flex w-full items-start gap-2 rounded-xl transition',
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation)}
                      className="flex min-w-0 flex-1 flex-col gap-1 rounded-xl px-4 py-3 text-left"
                    >
                      <span className="break-words text-sm font-medium leading-snug">
                        {conversation.title || 'Untitled conversation'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatRelativeTime(conversation.updatedAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteConversation(conversation)}
                      className="mr-2 mt-2 self-start rounded-full p-1 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                      aria-label="Delete conversation"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
