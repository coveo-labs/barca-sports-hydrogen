import type {FormEvent, KeyboardEvent} from 'react';
import cx from '~/lib/cx';
import {useStreamingActions, useStreamingState} from '~/lib/generative/context';

interface ChatInputFooterProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ChatInputFooter({
  inputValue,
  onInputChange,
  onSubmit,
}: ChatInputFooterProps) {
  const {isStreaming, streamError} = useStreamingState();
  const {onSendMessage, onStop} = useStreamingActions();

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (isStreaming) {
      return;
    }
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }
    onInputChange('');
    onSendMessage(trimmed);
  };

  return (
    <footer className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-4 shadow-lg sm:px-6 lg:px-10">
      {streamError && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {streamError}
        </div>
      )}
      <form
        onSubmit={onSubmit}
        className="mx-auto flex max-w-5xl flex-col gap-3"
      >
        <div className="relative rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-indigo-500 focus-within:shadow-md">
          <textarea
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ask about boards, fins, safety gear, or travel prep..."
            className="h-14 w-full resize-none border-0 bg-transparent px-4 py-2 pr-20 text-base text-slate-900 outline-none focus:ring-0"
            rows={1}
            onKeyDown={handleKeyDown}
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full p-1 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black bg-slate-600 text-white hover:bg-slate-700"
            >
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <rect
                  x="6"
                  y="6"
                  width="12"
                  height="12"
                />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={cx(
                'absolute top-2 right-2 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                !inputValue.trim()
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-indigo-600 text-white hover:bg-indigo-500',
              )}
            >
              Send
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500 hidden">
          <span>Powered by Coveo agentic commerce</span>
          <span>{isStreaming ? 'Generating...' : 'Press Enter to send'}</span>
        </div>
      </form>
    </footer>
  );
}
