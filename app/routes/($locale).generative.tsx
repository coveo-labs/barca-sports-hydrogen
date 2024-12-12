import {
  buildGeneratedAnswer,
  buildSearchBox,
  buildSearchEngine,
  type GeneratedAnswerState,
  type Result,
} from '@coveo/headless';
import {NavLink, useFetcher, useLoaderData} from '@remix-run/react';
import {useEffect, useState} from 'react';
import {type LoaderFunctionArgs} from '@shopify/remix-oxygen';
import {BookOpenIcon} from '@heroicons/react/24/outline';
import cx from '~/lib/cx';
import type {AnswerToArticlesData} from './answer-to-articles';
import {ResultCard} from '~/components/Generative/ResultCard';
import {AnswerSection} from '~/components/Generative/Section';
import {Skeleton} from '~/components/Generative/Skeleton';
import {Answer} from '~/components/Generative/Answer';

export async function loader({request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  return {q};
}

export default function GenerativeAnswering() {
  const {q} = useLoaderData<typeof loader>();
  const genAnswerState = useGenAIAnswer(q);
  const relatedArticles = useRelatedArticles(q, genAnswerState);
  const center = 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8';
  const hasNoAnswerAfterADelay = useHasNoAnswerAfterADelay(q, genAnswerState);

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
                <Answer text={genAnswerState?.answer} />
              ) : (
                <Skeleton numLines={10} tick={200} />
              )}
            </AnswerSection>
          )}
        </div>
      </div>
      {hasNoAnswerAfterADelay ? null : (
        <>
          <div className="border-b border-gray-200">
            <AnswerSection
              className={cx(
                center,
                'm-8',
                genAnswerState?.citations.length ? '' : 'min-h-36',
              )}
            >
              <h2 className="text-xl/8 font-semibold text-gray-900 mb-4">
                Sources
              </h2>
              {genAnswerState?.citations.length ? (
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
                      <NavLink to={citation.clickUri!} className="text-base/7">
                        <h3 className="font-semibold text-nowrap">
                          {citation.title}
                        </h3>
                        <p className="mt-2 text-gray-500">{citation.source}</p>
                      </NavLink>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8">
                  <Skeleton numLines={5} tick={600} />
                </div>
              )}
            </AnswerSection>
          </div>
          <div className="bg-white">
            <div className={cx(center)}>
              <AnswerSection className={cx(' mt-0 pt-8 min-h-48')}>
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
                  <Skeleton numLines={10} tick={400} />
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
  const {gen, searchBox} = initGenAI();
  const [genAnswerState, setGenAnswerState] = useState<GeneratedAnswerState>();

  useEffect(() => {
    searchBox.updateText(q);
    searchBox.submit();
    return gen.subscribe(() => {
      setGenAnswerState(gen.state);
    });
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
      responseFormat: {contentFormat: ['text/markdown']},
      isEnabled: true,
      isVisible: true,
    },
  });
  const searchBox = buildSearchBox(searchEngine);
  return {gen, searchBox};
}

function useRelatedArticles(q: string, genAnswerState?: GeneratedAnswerState) {
  const answerToProduct = useFetcher<AnswerToArticlesData>();
  const [relatedArticles, setRelatedArticles] = useState<Result[]>(
    answerToProduct.data?.results || [],
  );
  useEffect(() => {
    setRelatedArticles(answerToProduct.data?.results || []);
  }, [answerToProduct.data?.results]);
  useEffect(() => {
    setRelatedArticles([]);
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
  }, [genAnswerState]);

  return relatedArticles;
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
  const answerToProduct = useFetcher<AnswerToArticlesData>();
  const [relatedArticles, setRelatedArticles] = useState<Result[]>(
    answerToProduct.data?.results || [],
  );
  useEffect(() => {
    setRelatedArticles(answerToProduct.data?.results || []);
  }, [answerToProduct.data?.results]);
  useEffect(() => {
    setRelatedArticles([]);
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
  }, [genAnswerState]);

  return relatedArticles;
}
