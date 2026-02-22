import type {ReactNode} from 'react';

interface ConversationAnswerProps {
  children: ReactNode;
}

/**
 * Wrapper component for complete conversation answers
 * This is the top-level container for agent responses in A2UI
 */
export function ConversationAnswer({children}: ConversationAnswerProps) {
  return <div className="flex flex-col gap-6 w-full">{children}</div>;
}
