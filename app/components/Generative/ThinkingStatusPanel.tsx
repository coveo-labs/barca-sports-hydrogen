import {memo} from 'react';
import cx from '~/lib/cx';
import type {ConversationThinkingUpdate} from '~/types/conversation';

type ThinkingStatusPanelProps = {
  updates: ConversationThinkingUpdate[];
  isStreaming: boolean;
  isExpanded: boolean;
  onToggle: () => void;
};

function ThinkingStatusPanelComponent({
  updates,
  isStreaming,
  isExpanded,
  onToggle,
}: ThinkingStatusPanelProps) {
  if (!updates.length) {
    return null;
  }

  const latestUpdate = updates[updates.length - 1];
  const latestText = latestUpdate?.text ?? '';
  const updateCount = updates.length;
  const isDone = !isStreaming;
  const panelId = `thinking-updates-${updates[0]?.id ?? 'panel'}`;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm ring-1 ring-slate-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-3">
          {isDone ? (
            <span
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600"
              aria-hidden="true"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.25 7.5L6.75 9L9.5 5.75"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="7"
                  cy="7"
                  r="5.875"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
              </svg>
            </span>
          ) : (
            <span
              className="relative inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
              aria-hidden="true"
            >
              <span className="absolute inline-flex h-3.5 w-3.5 animate-ping rounded-full bg-indigo-200" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-0.5 ">
            <span className="text-sm font-semibold text-slate-900">
              Thinking
            </span>
            <span className="text-wrap text-xs text-slate-500">
              {latestText || 'Gathering the best response...'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            {updateCount} step{updateCount === 1 ? '' : 's'}
          </span>
          <span
            className={cx(
              'inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition',
              isExpanded ? 'bg-slate-100' : 'bg-white',
            )}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={cx(
                'transition-transform',
                isExpanded ? 'rotate-180' : 'rotate-0',
              )}
              aria-hidden="true"
            >
              <path
                d="M3.25 4.5L6 7.25L8.75 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>
      {isExpanded ? (
        <div id={panelId} className="mt-4">
          <ul className="space-y-3 break-words text-sm text-slate-600">
            {updates.map((update) => {
              const bulletClass =
                update.kind === 'tool' ? 'bg-sky-400' : 'bg-indigo-400';
              return (
                <li
                  key={update.id}
                  className="flex max-w-full items-start gap-2"
                >
                  <span
                    className={cx(
                      'mt-1 inline-flex h-1.5 w-1.5 shrink-0 rounded-full',
                      bulletClass,
                    )}
                  />
                  <span className="leading-5 break-words">{update.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export const ThinkingStatusPanel = memo(ThinkingStatusPanelComponent);
