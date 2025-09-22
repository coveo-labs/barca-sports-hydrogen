import {
  buildGeneratedAnswer,
  buildSearchBox,
  buildSearchEngine,
  type GeneratedAnswerState,
  type Result,
} from '@coveo/headless';
import { NavLink, useFetcher, useLoaderData } from '@remix-run/react';
import { useEffect, useState } from 'react';
import { type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import cx from '~/lib/cx';
import type { AnswerToArticlesData } from './answer-to-articles';
import { ResultCard } from '~/components/Generative/ResultCard';
import { AnswerSection } from '~/components/Generative/Section';
import { Skeleton } from '~/components/Generative/Skeleton';
import { Answer } from '~/components/Generative/Answer';
import type { AnswerToProductsData } from './answer-to-products';
import '~/types/gtm';

// Global tracking to ensure analytics only fire once per search query
const trackedSearchQueries = new Set<string>();

const trackGenerativeAnswering = (q: string, hasNoAnswer: boolean) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'search',
    search_type: 'generative_answering',
    search_term: q,
    has_answer: hasNoAnswer ? 'false' : 'true',
  });
};

/**
What to look for when buying a kayak?
What accessories do I need for a kayak adventure?
How do I transport and store a kayak?
Which kayaks are best for whitewater?
Which kayak materials offer the best balance for advanced use?

 */

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  return { q };
}

export default function GenerativeAnswering() {
  const { q } = useLoaderData<typeof loader>();
  const genAnswerState = useGenAIAnswer(q);
  const { relatedArticles, basicExpression } = useRelatedArticles(
    q,
    genAnswerState,
  );
  const relatedProducts = useRelatedProducts(basicExpression);
  const center = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
  const hasNoAnswerAfterADelay = useHasNoAnswerAfterADelay(q, genAnswerState);

  const hasCitations =
    genAnswerState?.citations && genAnswerState.citations.length > 0;

  useEffect(() => {
    // Create a unique tracking ID based on the query and answer status
    const trackingId = `search_${q}_${
      hasNoAnswerAfterADelay ? 'no_answer' : 'has_answer'
    }`;

    // Check if we've already tracked this specific search
    if (trackedSearchQueries.has(trackingId)) {
      return;
    }

    // Mark this search as tracked
    trackedSearchQueries.add(trackingId);

    trackGenerativeAnswering(q, hasNoAnswerAfterADelay);
  }, [hasNoAnswerAfterADelay, q]);

  return (
    <div className="bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className={cx(center, 'py-16 ')}>
          <h1 className="mt-2 mb-8 text-pretty text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl capitalize">
            {q}
          </h1>

          {hasNoAnswerAfterADelay ? (
            <p className="text-xl/8 text-gray-500 min-h-72">
              Unfortunately, we couldn&apos;t find an answer to your question.
              Please try again later or consider rephrasing your question.
            </p>
          ) : (
            <AnswerSection className="min-h-48">
              {genAnswerState?.answer ? (
                <>
                  <Answer text={genAnswerState?.answer} />
                  {hasCitations && (
                    <>
                      <h2 className="text-xl/8 font-semibold text-gray-900 mb-4">
                        Sources
                      </h2>
                      <div className="flex gap-x-8">
                        {genAnswerState.citations.map((citation) => (
                          <div
                            key={citation.uri}
                            className="flex gap-x-4 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10"
                          >
                            <BookOpenIcon
                              aria-hidden="true"
                              className="h-7 w-5 flex-none text-indigo-400"
                            />
                            <NavLink
                              to={citation.clickUri!}
                              className="text-base/7"
                            >
                              <h3 className="font-semibold text-nowrap">
                                {citation.title}
                              </h3>
                              <p className="mt-2 text-gray-500">
                                {citation.source}
                              </p>
                            </NavLink>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Skeleton numLines={10} tick={200} />
              )}
            </AnswerSection>
          )}
        </div>
      </div>
      {hasNoAnswerAfterADelay ? null : (
        <>
          <div className="bg-gray-50 border-b border-gray-200 pb-8">
            <div className={cx(center)}>
              <AnswerSection className={cx(' mt-0 pt-8 min-h-64')}>
                <h2 className="text-xl/8 font-semibold text-gray-900 flex mb-4">
                  These products might interest you
                </h2>
                <div className="flex flex-col gap-y-10">
                  {Object.entries(relatedProducts).map(([slug, products]) => {
                    const slugSplit = slug.split('/');
                    const lastLevel = slugSplit.pop()?.replaceAll('-', ' ');
                    const parents = slugSplit.join(' / ').replaceAll('-', ' ');
                    return (
                      <div key={slug} className="w-full">
                        <NavLink
                          to={`/plp/${slug}`}
                          className="capitalize tracking-tight text-ellipsis overflow-hidden text-nowrap"
                        >
                          <div className="text-sm text-gray-500 mb-2">
                            {parents}
                          </div>
                          <div className="text-lg font-bold text-indigo-gray-600 mb-2">
                            {lastLevel}
                          </div>
                        </NavLink>
                        <div className="flex flex-wrap gap-4 pb-2">
                          {products.map((product) => (
                            <NavLink
                              key={product.uniqueId}
                              to={`/plp/${slug}`}
                              className="flex-shrink-0"
                            >
                              <img
                                loading="lazy"
                                width={200}
                                height={200}
                                alt={product.title}
                                src={(product.raw['ec_images'] as string[])[0]}
                                className="h-48 w-48 rounded-lg bg-gray-200 object-cover group-hover:opacity-75"
                              />
                            </NavLink>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {Object.keys(relatedProducts).length == 0 && (
                  <Skeleton numLines={10} tick={400} />
                )}
              </AnswerSection>
            </div>
          </div>

          <div className="bg-white">
            <div className={cx(center)}>
              <AnswerSection className={cx(' mt-0 pt-8 min-h-64')}>
                <h2 className="text-xl/8 font-semibold text-gray-900 flex mb-4">
                  Related articles
                </h2>
                {relatedArticles.length > 0 ? (
                  <ul className="divide-y divide-gray-300">
                    {relatedArticles.map((r) => (
                      <ResultCard key={r.uniqueId} result={r} />
                    ))}
                  </ul>
                ) : (
                  <Skeleton numLines={10} tick={800} />
                )}
              </AnswerSection>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function useGenAIAnswer(q: string) {
  const { gen, searchBox } = initGenAI();
  const [genAnswerState, setGenAnswerState] = useState<GeneratedAnswerState>();

  useEffect(() => {
    searchBox.updateText(q);
    searchBox.submit();
    return gen.subscribe(() => {
      setGenAnswerState(gen.state);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return genAnswerState;
}

function initGenAI() {
  const searchEngine = buildSearchEngine({
    configuration: {
      accessToken: 'xx697404a7-6cfd-48c6-93d1-30d73d17e07a',
      organizationId: 'barcagroupproductionkwvdy6lp',
      search: {
        searchHub: 'Sports Blog GenAI',
      },
    },
  });

  const gen = buildGeneratedAnswer(searchEngine, {
    initialState: {
      responseFormat: { contentFormat: ['text/markdown'] },
      isEnabled: true,
      isVisible: true,
    },
  });
  const searchBox = buildSearchBox(searchEngine);
  return { gen, searchBox };
}

function useRelatedArticles(q: string, genAnswerState?: GeneratedAnswerState) {
  const answerToProduct = useFetcher<AnswerToArticlesData>();
  const [relatedArticles, setRelatedArticles] = useState<Result[]>(
    answerToProduct.data?.results || [],
  );
  const [basicExpression, setBasicExpression] = useState('');

  useEffect(() => {
    setRelatedArticles(answerToProduct.data?.results || []);
    setBasicExpression(answerToProduct.data?.basicExpression || '');
  }, [answerToProduct.data?.results, answerToProduct.data?.basicExpression]);
  useEffect(() => {
    setRelatedArticles([]);
    setBasicExpression('');
  }, [q]);

  useEffect(() => {
    if (genAnswerState?.isAnswerGenerated) {
      const formData = new FormData();

      formData.append('answer', genAnswerState?.answer || '');
      answerToProduct.submit(formData, {
        method: 'POST',
        action: '/answer-to-articles',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genAnswerState]);

  return { relatedArticles, basicExpression };
}

function useHasNoAnswerAfterADelay(
  q: string,
  genAnswerState?: GeneratedAnswerState,
) {
  const [hasNoAnswerAfterADelay, setHasNoAnswerAfterADelay] = useState(false);
  const delay = 5000;

  useEffect(() => {
    setHasNoAnswerAfterADelay(false);

    const timer = setTimeout(() => {
      if (!genAnswerState?.answer) {
        setHasNoAnswerAfterADelay(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [q, genAnswerState?.answer]);

  return hasNoAnswerAfterADelay;
}

function useRelatedProducts(basicExpression: string) {
  const mapRelatedProductsToCategory = (products?: Result[]) => {
    if (!products) {
      return {};
    }
    return products?.reduce((acc, product) => {
      const slug = (product.raw['ec_category_slug'] as string)
        .split(';')
        .pop() as string;
      if (acc[slug]) {
        acc[slug].push(product);
      } else {
        acc[slug] = [product];
      }
      return acc;
    }, {} as Record<string, Result[]>);
  };

  const answerToProduct = useFetcher<AnswerToProductsData>();
  const [relatedProducts, setRelatedProducts] = useState<
    ReturnType<typeof mapRelatedProductsToCategory>
  >(mapRelatedProductsToCategory(answerToProduct.data?.results));

  useEffect(() => {
    setRelatedProducts(
      mapRelatedProductsToCategory(answerToProduct.data?.results),
    );
  }, [answerToProduct.data?.results]);

  useEffect(() => {
    setRelatedProducts({});
  }, [basicExpression]);

  useEffect(() => {
    if (!basicExpression) return;
    const formData = new FormData();

    formData.append('basicExpression', basicExpression);
    answerToProduct.submit(formData, {
      method: 'POST',
      action: '/answer-to-products',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basicExpression]);

  return relatedProducts;
}
