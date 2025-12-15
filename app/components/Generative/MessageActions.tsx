import type {NextAction, RefinementChip} from '~/lib/message-markup-parser';

type RefinementChipsBarProps = {
  chips: RefinementChip[];
  messageId: string;
};

export function RefinementChipsBar({
  chips,
  messageId,
}: Readonly<RefinementChipsBarProps>) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip, index) => (
        <span
          key={`${messageId}-chip-${index}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
        >
          <FilterIcon />
          {chip.label}
        </span>
      ))}
    </div>
  );
}

type NextActionsBarProps = {
  actions: NextAction[];
  messageId: string;
  onFollowUpClick?: (message: string) => void;
};

export function NextActionsBar({
  actions,
  messageId,
  onFollowUpClick,
}: Readonly<NextActionsBarProps>) {
  const searchActions = actions.filter(
    (a): a is Extract<NextAction, {type: 'search'}> => a.type === 'search',
  );
  const followupActions = actions.filter(
    (a): a is Extract<NextAction, {type: 'followup'}> => a.type === 'followup',
  );

  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
      {searchActions.map((action, index) => (
        <a
          key={`${messageId}-search-${index}`}
          href={`/search?q=${encodeURIComponent(action.query)}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <SearchIcon />
          {action.query}
        </a>
      ))}
      {followupActions.map((action, index) => (
        <button
          key={`${messageId}-followup-${index}`}
          type="button"
          onClick={() => onFollowUpClick?.(action.message)}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <ChatIcon />
          {action.message}
        </button>
      ))}
    </div>
  );
}

function FilterIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 text-slate-500"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
      />
    </svg>
  );
}
