import {useState} from 'react';
import cx from '~/lib/cx';
import {formatRelativeTime} from '~/lib/generative/conversation';
import {
  useConversationActions,
  useConversationsState,
} from '~/lib/generative/context';

export function ConversationSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [copiedConversationId, setCopiedConversationId] = useState<
    string | null
  >(null);
  const {conversations, activeConversationId} = useConversationsState();
  const {
    onSelectConversation,
    onDeleteConversation,
    onNewConversation,
    onCopyConversationDebugLog,
  } = useConversationActions();
  return (
    <aside
      className={cx(
        'hidden min-h-0 flex-col border-r border-slate-200 bg-white/80 backdrop-blur transition-all duration-300 lg:flex',
        isCollapsed ? 'w-16' : 'w-80',
      )}
    >
      <div className="flex flex-col gap-3 px-3 py-5">
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              className="rounded-lg p-2 bg-indigo-600 text-white hover:bg-indigo-500 transition shadow-sm"
              aria-label="Expand sidebar"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          ) : (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Conversations
              </h2>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                aria-label="Collapse sidebar"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
        {isCollapsed ? (
          <button
            type="button"
            onClick={onNewConversation}
            className="rounded-full p-2 border-2 border-dotted border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-solid transition"
            aria-label="New conversation"
            title="New chat"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNewConversation}
            className="rounded-lg border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition"
          >
            New chat
          </button>
        )}
      </div>
      {!isCollapsed && (
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
                      <div className="mr-2 mt-2 flex items-center gap-1 self-start">
                        <button
                          type="button"
                          onClick={async () => {
                            const didCopy =
                              await onCopyConversationDebugLog(conversation);
                            if (!didCopy) {
                              return;
                            }
                            setCopiedConversationId(conversation.localId);
                            window.setTimeout(() => {
                              setCopiedConversationId((current) =>
                                current === conversation.localId ? null : current,
                              );
                            }, 1600);
                          }}
                          className={cx(
                            'rounded-full p-1.5 text-xs transition',
                            copiedConversationId === conversation.localId
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600',
                          )}
                          aria-label="Copy debug log"
                          title={
                            copiedConversationId === conversation.localId
                              ? 'Copied'
                              : 'Copy debug log'
                          }
                        >
                          {copiedConversationId === conversation.localId ? (
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-8 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteConversation(conversation)}
                          className="rounded-full p-1 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                          aria-label="Delete conversation"
                          title="Delete conversation"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      )}
    </aside>
  );
}
