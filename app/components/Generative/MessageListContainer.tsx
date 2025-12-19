import type {ReactNode, RefObject} from 'react';
import cx from '~/lib/cx';

type MessageListContainerProps = Readonly<{
  containerRef: RefObject<HTMLDivElement | null>;
  isEmpty: boolean;
  hasContent: boolean;
  emptyState: ReactNode;
  children: ReactNode;
}>;

export function MessageListContainer({
  containerRef,
  isEmpty,
  hasContent,
  emptyState,
  children,
}: MessageListContainerProps) {
  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement>}
      className={cx(
        'relative flex-1 overflow-y-auto bg-slate-50 px-4 pt-6 sm:px-6 lg:px-10',
        hasContent ? 'pb-32' : 'pb-24',
      )}
    >
      {isEmpty ? (
        emptyState
      ) : (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          {hasContent && (
            <div className="flex w-full flex-col gap-5">{children}</div>
          )}
        </div>
      )}
    </div>
  );
}
