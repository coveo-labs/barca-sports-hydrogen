import {ChevronRightIcon, SparklesIcon} from '@heroicons/react/24/outline';
import {useEffect, useState} from 'react';
import {useNavigate, useParams, useSearchParams} from 'react-router';
import type {QueryUnderstandingResponse} from '~/routes/api.agentic.understand';
import type {RelatedQuestionsResponse} from '~/routes/api.agentic.related-questions';

interface CategoryPath {
  segments: string[];
  fullPath: string;
}

/**
 * Parses breadcrumb category paths and groups them by their root category
 * Example: ["Canoes & Kayaks", "Canoes & Kayaks|Kayaks"]
 * becomes: Map { "Canoes & Kayaks" => [["Canoes & Kayaks"], ["Canoes & Kayaks", "Kayaks"]] }
 */
function parseCategoryPaths(categories: string[]): Map<string, CategoryPath[]> {
  const grouped = new Map<string, CategoryPath[]>();

  categories.forEach((category) => {
    const segments = category.split('|').map((s) => s.trim());
    const root = segments[0];

    if (!grouped.has(root)) {
      grouped.set(root, []);
    }

    grouped.get(root)!.push({
      segments,
      fullPath: category,
    });
  });

  // Sort paths within each group by depth (deepest first for display)
  grouped.forEach((paths) => {
    paths.sort((a, b) => b.segments.length - a.segments.length);
  });

  return grouped;
}

export function AgenticProductSearch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {locale} = useParams<{locale?: string}>();
  const query = searchParams.get('q') || '';
  const [understanding, setUnderstanding] =
    useState<QueryUnderstandingResponse | null>(null);
  const [relatedQuestions, setRelatedQuestions] =
    useState<RelatedQuestionsResponse | null>(null);
  const [isLoadingUnderstanding, setIsLoadingUnderstanding] = useState(false);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareHtml, setCompareHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!query) {
      return;
    }

    const fetchUnderstanding = async () => {
      setIsLoadingUnderstanding(true);
      try {
        const response = await fetch(
          `/api/agentic/understand?query=${encodeURIComponent(query)}`,
        );
        const data = (await response.json()) as QueryUnderstandingResponse;
        setUnderstanding(data);
      } catch (error) {
        console.error('Error fetching query understanding:', error);
      } finally {
        setIsLoadingUnderstanding(false);
      }
    };

    const fetchRelatedQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        const response = await fetch(
          `/api/agentic/related-questions?query=${encodeURIComponent(query)}`,
        );
        const data = (await response.json()) as RelatedQuestionsResponse;
        setRelatedQuestions(data);
      } catch (error) {
        console.error('Error fetching related questions:', error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    // Fetch both insights in parallel when the shopper updates their query.
    fetchUnderstanding();
    fetchRelatedQuestions();
  }, [query]);

  useEffect(() => {
    setCompareError(null);
    setCompareHtml(null);
  }, [query]);

  const hasRelatedQuestions = Boolean(
    relatedQuestions && relatedQuestions.suggestedQueries.length > 0,
  );
  const hasUnderstandingCategories = Boolean(
    understanding && understanding.categories.length > 0,
  );
  const hasUnderstandingAttributes = Boolean(
    understanding &&
      understanding.attributes &&
      Object.keys(understanding.attributes).length > 0,
  );

  const handleCompareClick = async () => {
    if (isComparing) {
      return;
    }

    setCompareError(null);
    setIsComparing(true);

    try {
      const response = await fetch('/api/agentic/compare', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          products: ['SP04948_00003', 'SP04948_00004'],
        }),
      });

      if (!response.ok) {
        throw new Error(`Compare request failed: ${response.status}`);
      }

      const data = (await response.json()) as {html: string};
      setCompareHtml(data.html);
    } catch (error) {
      console.error('Error requesting agentic compare:', error);
      setCompareError('Unable to compare products right now.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleRelatedQuestionClick = (question: string) => {
    const basePath = locale ? `/${locale}/generative` : '/generative';
    navigate(`${basePath}?q=${encodeURIComponent(question)}`);
  };

  if (
    !isLoadingQuestions &&
    !isLoadingUnderstanding &&
    !hasRelatedQuestions &&
    !hasUnderstandingCategories &&
    !hasUnderstandingAttributes
  ) {
    return null;
  }

  return (
    <div className="mb-8 rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <SparklesIcon
            className={`h-6 w-6 flex-shrink-0 text-indigo-600 ${
              isLoadingQuestions || isLoadingUnderstanding
                ? 'animate-pulse'
                : ''
            }`}
          />
          <h3 className="text-base font-semibold text-indigo-900">
            AI-Powered Search Insights
          </h3>
        </div>
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <button
            type="button"
            onClick={handleCompareClick}
            disabled={isComparing}
            className="inline-flex items-center rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isComparing ? 'Generating compare…' : 'Agentic Compare'}
          </button>
          {compareError && (
            <span className="text-xs text-rose-600">{compareError}</span>
          )}
        </div>
      </div>

      {compareHtml && (
        <dialog
          open
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h4 className="text-sm font-semibold text-indigo-900">
                Agentic Compare
              </h4>
              <button
                type="button"
                onClick={() => setCompareHtml(null)}
                className="rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="overflow-auto p-4">
              <div
                className="prose max-w-none text-sm"
                dangerouslySetInnerHTML={{__html: compareHtml}}
              />
            </div>
          </div>
        </dialog>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {(isLoadingQuestions || hasRelatedQuestions) && (
          <div className="lg:col-span-1">
            <h4 className="mb-3 text-sm font-semibold text-indigo-900">
              Related Questions
            </h4>
            {isLoadingQuestions ? (
              <div className="space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-indigo-200"></div>
                <div className="h-3 w-5/6 animate-pulse rounded bg-indigo-200"></div>
                <div className="h-3 w-4/6 animate-pulse rounded bg-indigo-200"></div>
              </div>
            ) : (
              relatedQuestions && (
                <ul className="space-y-2">
                  {relatedQuestions.suggestedQueries.map((question, index) => (
                    <li key={index}>
                      <button
                        className="w-full text-left text-xs text-indigo-700 hover:text-indigo-900 hover:underline"
                        onClick={() => handleRelatedQuestionClick(question)}
                      >
                        {question}
                      </button>
                    </li>
                  ))}
                </ul>
              )
            )}
          </div>
        )}

        {(isLoadingUnderstanding ||
          hasUnderstandingCategories ||
          hasUnderstandingAttributes) && (
          <div className="lg:col-span-2">
            <h4 className="mb-3 text-sm font-semibold text-indigo-900">
              Categories & Attributes
            </h4>
            {isLoadingUnderstanding ? (
              <div className="space-y-3">
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-indigo-200"></div>
                <div className="h-4 w-1/2 animate-pulse rounded-full bg-indigo-200"></div>
              </div>
            ) : (
              understanding && (
                <div className="flex flex-wrap items-center gap-2">
                  {hasUnderstandingCategories &&
                    Array.from(
                      parseCategoryPaths(understanding.categories).entries(),
                    ).map(([root, paths]) =>
                      paths.slice(0, 1).map((path) => (
                        <div
                          key={`${root}-${path.fullPath}`}
                          className="inline-flex items-center rounded-full border border-indigo-300 bg-white px-3 py-1.5 shadow-sm"
                        >
                          {path.segments.map((segment, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center"
                            >
                              {index > 0 && (
                                <ChevronRightIcon className="mx-1 h-3 w-3 text-indigo-400" />
                              )}
                              <span
                                className={
                                  index === path.segments.length - 1
                                    ? 'text-sm font-semibold text-indigo-900'
                                    : 'text-sm text-indigo-700'
                                }
                              >
                                {segment}
                              </span>
                            </span>
                          ))}
                        </div>
                      )),
                    )}

                  {hasUnderstandingCategories && hasUnderstandingAttributes && (
                    <span className="text-xl leading-none text-purple-300">
                      •
                    </span>
                  )}

                  {hasUnderstandingAttributes &&
                    Object.entries(understanding.attributes).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-white px-3 py-1.5 shadow-sm"
                        >
                          <span className="text-xs font-medium text-indigo-700">
                            {key.charAt(0).toUpperCase() + key.slice(1)}:
                          </span>
                          <span className="text-xs font-semibold text-indigo-900">
                            {value}
                          </span>
                        </div>
                      ),
                    )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
