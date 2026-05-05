import {memo} from 'react';
import cx from '~/lib/cx';
import {buildThinkingProgressSteps} from '~/lib/generative/thinking/progress';
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
}: Readonly<ThinkingStatusPanelProps>) {
  const steps = buildThinkingProgressSteps(updates, isStreaming);

  if (!steps.length) {
    return null;
  }

  const latestStep = steps.at(-1);
  const isDone = !isStreaming;
  const currentStepText = isDone ? 'All steps completed' : (latestStep?.label ?? '');
  const stepCount = steps.length;
  const panelId = `thinking-updates-${steps[0]?.id ?? 'panel'}`;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm ring-1 ring-slate-100">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
        aria-expanded={isExpanded}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-4">
          {isDone ? (
            <span
              className="inline-flex h-3.5 w-3.5 shrink-0 rounded-full border-2 border-emerald-500 bg-white"
              aria-hidden="true"
            >
              <span className="m-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
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
            {isExpanded ? (
              <>
                {!isDone ? (
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Current Step
                  </span>
                ) : null}
                <span className="text-sm font-semibold text-slate-900">
                  {currentStepText || 'Understanding your request'}
                </span>
              </>
            ) : (
              <span className="text-sm font-semibold text-slate-900">
                {currentStepText || 'Understanding your request'}...
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>
            {stepCount} step{stepCount === 1 ? '' : 's'}
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
          {steps.map((step, index) => {
            const isLastStep = index === steps.length - 1;

            return (
              <section key={step.id} className="flex gap-4">
                <div className="flex w-4 shrink-0 flex-col items-center">
                  {step.isActive ? (
                    <span
                      className="relative mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center"
                      aria-hidden="true"
                    >
                      <span className="absolute inline-flex h-3.5 w-3.5 animate-ping rounded-full bg-indigo-200" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    </span>
                  ) : (
                    <span
                      className={cx(
                        'mt-1 inline-flex h-3.5 w-3.5 shrink-0 rounded-full border-2',
                        isDone || !step.isActive
                          ? 'border-emerald-500 bg-white'
                          : 'border-slate-300 bg-white',
                      )}
                      aria-hidden="true"
                    >
                      <span className="m-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                  )}
                  {!isLastStep ? (
                    <span
                      className="my-1 w-px flex-1 border-l border-dashed border-slate-300"
                      aria-hidden="true"
                    />
                  ) : null}
                </div>

                <div
                  className={cx('min-w-0 flex-1', !isLastStep ? 'pb-5' : '')}
                >
                  <p
                    className={cx(
                      'text-sm font-semibold',
                      step.isActive ? 'text-slate-900' : 'text-slate-800',
                    )}
                  >
                    {step.label}
                  </p>
                  {step.bullets.length ? (
                    <ul className="mt-1.5 space-y-1.5 break-words text-sm text-slate-500">
                      {step.bullets.map((bullet) => (
                        <li key={`${step.id}-${bullet}`} className="leading-5">
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export const ThinkingStatusPanel = memo(ThinkingStatusPanelComponent);
