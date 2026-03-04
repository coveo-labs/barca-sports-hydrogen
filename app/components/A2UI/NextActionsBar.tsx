interface NextActionsBarProps {
  actions: Array<Record<string, unknown>>;
  onSearchAction?: (query: string) => void;
  onFollowupAction?: (message: string) => void;
}

/**
 * Action buttons bar for follow-up questions and navigation
 * Displays at the end of agent responses to guide next user action
 */
export function NextActionsBar({
  actions,
  onSearchAction,
  onFollowupAction,
}: NextActionsBarProps) {
  const handleClick = (action: Record<string, unknown>) => {
    const actionData = action.action as
      | {type: string; query?: string; message?: string}
      | undefined;

    if (actionData?.type === 'search' && actionData.query) {
      onSearchAction?.(actionData.query);
    } else if (actionData?.type === 'followup' && actionData.message) {
      onFollowupAction?.(actionData.message);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
      {actions.map((action, index) => {
        const text = (action.text as string) || '';
        const variant = (action.variant as string) || 'followup';

        return (
          <button
            key={index}
            onClick={() => handleClick(action)}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm transition-colors
              ${
                variant === 'search'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300'
              }
            `}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
