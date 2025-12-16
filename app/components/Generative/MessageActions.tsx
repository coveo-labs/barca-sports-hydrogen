import {
  FunnelIcon,
  MagnifyingGlassIcon,
  ChatBubbleOvalLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import type {NextAction, RefinementChip} from '~/lib/generative/message-markup-parser';

type RefinementChipsBarProps = Readonly<{
  chips: RefinementChip[];
  messageId: string;
}>;

export function RefinementChipsBar({
  chips,
  messageId,
}: RefinementChipsBarProps) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {chips.map((chip, index) => (
        <span
          key={`${messageId}-chip-${index}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200"
        >
          <FunnelIcon
            aria-hidden="true"
            className="h-3.5 w-3.5 text-slate-500"
          />
          {chip.label}
        </span>
      ))}
    </div>
  );
}

type NextActionsBarProps = Readonly<{
  actions: NextAction[];
  messageId: string;
  onFollowUpClick?: (message: string) => void;
}>;

export function NextActionsBar({
  actions,
  messageId,
  onFollowUpClick,
}: NextActionsBarProps) {
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
          <MagnifyingGlassIcon aria-hidden="true" className="h-3.5 w-3.5" />
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
          <ChatBubbleOvalLeftEllipsisIcon
            aria-hidden="true"
            className="h-3.5 w-3.5"
          />
          {action.message}
        </button>
      ))}
    </div>
  );
}
