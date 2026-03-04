import {
  MagnifyingGlassIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from '@heroicons/react/24/outline';

interface NextAction {
  text: string;
  type: 'search' | 'followup';
}

interface NextActionsBarProps {
  actions: Array<Record<string, unknown>>;
  isLoading?: boolean;
  onSearchAction?: (query: string) => void;
  onFollowupAction?: (message: string) => void;
}

/**
 * Action buttons bar for follow-up questions and navigation.
 * Displays at the end of agent responses to guide the user's next action.
 *
 * Data model (flat, spec-compliant):
 *   { text: string, type: 'search' | 'followup' }
 *
 * - type="search"   → navigates to a search results page; text is the query string
 * - type="followup" → sends a follow-up message to the agent; text is the message
 */
export function NextActionsBar({
  actions,
  isLoading,
  onSearchAction,
  onFollowupAction,
}: NextActionsBarProps) {
  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-9 w-36 rounded-lg bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const handleClick = (action: NextAction) => {
    if (action.type === 'search') {
      onSearchAction?.(action.text);
    } else {
      onFollowupAction?.(action.text);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
      {actions.map((raw, index) => {
        const action: NextAction = {
          text: (raw.text as string) || '',
          type: (raw.type as NextAction['type']) || 'followup',
        };

        const isSearch = action.type === 'search';

        return (
          <button
            key={index}
            onClick={() => handleClick(action)}
            className={`
              inline-flex items-center gap-1.5 px-4 py-2 rounded-3xl font-small text-sm transition-colors text-gray-700 hover:bg-gray-200 border border-gray-300'
`}
          >
            {isSearch ? (
              <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
            ) : (
              <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 shrink-0" />
            )}
            {action.text}
          </button>
        );
      })}
    </div>
  );
}
