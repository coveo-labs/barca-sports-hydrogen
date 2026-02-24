interface ComparisonSummaryProps {
  text: string;
}

/**
 * Summary block shown below the comparison table.
 * Contains the LLM's recommendation text with key trade-offs.
 */
export function ComparisonSummary({text}: ComparisonSummaryProps) {
  return (
    <div className="rounded-lg bg-blue-50 border border-blue-100 px-5 py-4 text-sm text-blue-900 leading-relaxed">
      <span className="font-semibold mr-1">Summary:</span>
      {text}
    </div>
  );
}
