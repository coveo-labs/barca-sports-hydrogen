import {
  useConversationActions,
  useStreamingActions,
  useStreamingState,
} from '~/lib/generative/context';

export function AssistantHeader() {
  const {isStreaming} = useStreamingState();
  const {onStop} = useStreamingActions();
  const {onNewConversation} = useConversationActions();
  return (
    <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Barca water sports assistant
          </h1>
          <p className="text-sm text-slate-500">
            Find surf, paddle, and kayak accessories tailored to your next
            session.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded-full border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Stop generating
            </button>
          ) : (
            <button
              type="button"
              className="rounded-full border border-transparent bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
              onClick={onNewConversation}
            >
              New chat
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
