import {memo} from 'react';
import cx from '~/lib/cx';
import {useStreamingActions, useStreamingState} from '~/lib/generative/context';

type EmptyStateProps = {
  prompts: string[];
};

function EmptyStateComponent({prompts}: EmptyStateProps) {
  const {isStreaming} = useStreamingState();
  const {onSendMessage} = useStreamingActions();
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
      <h2 className="text-2xl font-semibold text-slate-900">
        How can I help plan your Barca water sports session?
      </h2>
      <p className="max-w-xl text-sm">
        Ask me to bundle accessories, compare safety gear, or prep the perfect
        travel kit for the water.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {prompts.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={isStreaming}
            className={cx(
              'rounded-full border border-slate-200 px-4 py-2 text-sm shadow-sm transition-colors',
              isStreaming
                ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                : 'bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600',
            )}
            onClick={() => onSendMessage(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

export const EmptyState = memo(EmptyStateComponent);
