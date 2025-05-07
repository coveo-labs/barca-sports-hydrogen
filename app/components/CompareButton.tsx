import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import {
  LightBulbIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import {type FetcherWithComponents, useFetcher} from '@remix-run/react';
import {BrainIcon, UserIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {usePdpRecommendationsUpperCarousel} from '~/lib/coveo.engine';
import type {CompareResponse} from '~/routes/compare';
import type {CompareRecommendationResponse} from '~/routes/compare-recommendation';
import {Answer} from './Generative/Answer';
import {ProductCard} from './Products/ProductCard';
import {LoadingDots} from './Search/LoadingDots';
import {Spinner} from './Search/Spinner';

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

export function CompareButton({mainProduct}: {mainProduct: string}) {
  const [open, setOpen] = useState(false);
  const pdpRecommendationsUpperCarousel = usePdpRecommendationsUpperCarousel();
  const comparedProducts = pdpRecommendationsUpperCarousel.state.products.map(
    (product) => {
      return product.permanentid;
    },
  );
  const compareFetcher = useFetcher<CompareResponse>();

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          compareFetcher.submit(
            {
              input: JSON.stringify({
                mainProduct,
                comparedProducts: comparedProducts.slice(0, 4),
              }),
            },
            {method: 'post', action: '/compare'},
          );
        }}
        className="flex flex-1 items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:w-full"
        type="submit"
      >
        <BrainIcon className="mr-4" /> Compare
      </button>
      <CompareDrawer
        compareFetcher={compareFetcher}
        open={open}
        setOpen={setOpen}
        mainProduct={mainProduct}
        comparedProducts={comparedProducts}
      />
    </>
  );
}

export function CompareDrawer({
  open,
  setOpen,
  compareFetcher,
  mainProduct,
  comparedProducts,
}: {
  mainProduct: string;
  comparedProducts: string[];
  open: boolean;
  setOpen: (open: boolean) => void;
  compareFetcher: FetcherWithComponents<CompareResponse>;
}) {
  return (
    <Dialog open={open} onClose={setOpen} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className={`relative transform overflow-hidden rounded-lg bg-gray-100 text-left shadow-xl transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8  sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95 overflow-y-auto ${
              compareFetcher.state === 'idle'
                ? 'w-[80vw] h-[80vh]'
                : 'w-[40vw] h-[40vh] overflow-y-hidden'
            }`}
          >
            <div className="h-full">
              <div className="text-center h-full">
                <CompareDialogTitle compareFetcher={compareFetcher} />
                <CompareDialogTable compareFetcher={compareFetcher} />
                <CompareDialogRecommendation
                  compareFetcher={compareFetcher}
                  comparedProducts={comparedProducts}
                  mainProduct={mainProduct}
                />
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

const CompareDialogTitle = ({
  compareFetcher,
}: {
  compareFetcher: FetcherWithComponents<CompareResponse>;
}) => {
  return (
    <DialogTitle as="h3" className="text-xl font-semibold text-gray-900 p-4">
      {compareFetcher.state !== 'idle' ? (
        <div className="flex items-center justify-center">
          <LoadingDots
            loadingText={[
              'Getting product info',
              'Analyzing products',
              'Comparing products',
              'Finding similar products',
              'Loading product details',
            ]}
          />
        </div>
      ) : (
        '  Comparing with similar products'
      )}
    </DialogTitle>
  );
};

const CompareDialogTable = ({
  compareFetcher,
}: {
  compareFetcher: FetcherWithComponents<CompareResponse>;
}) => {
  if (compareFetcher.state !== 'idle' || !compareFetcher.data) {
    return null;
  }

  return (
    <p className="text-sm text-gray-500">
      <div
        dangerouslySetInnerHTML={{
          __html: compareFetcher.data.output.comparisonTable,
        }}
      ></div>
    </p>
  );
};

const CompareDialogRecommendation = ({
  compareFetcher,
  mainProduct,
  comparedProducts,
}: {
  compareFetcher: FetcherWithComponents<CompareResponse>;
  mainProduct: string;
  comparedProducts: string[];
}) => {
  const compareRecommendationFetcher =
    useFetcher<CompareRecommendationResponse>();

  let initialAnswer = '';
  try {
    const rawStorage = localStorage.getItem('intentDetection');
    if (rawStorage) {
      initialAnswer = (JSON.parse(rawStorage) as any).output
        .expandedOrReformulatedQuery;
    }
  } catch (e) {
    initialAnswer = '';
  }

  const [intentions, setIntentions] = useState<
    {question: string; answer: string}[]
  >([
    {
      question:
        'Would you like help to narrow down the selection ? What are you looking for ?',
      answer: '',
    },
  ]);

  useEffect(() => {
    if (compareRecommendationFetcher.data?.output.clarification) {
      const clarification =
        compareRecommendationFetcher.data.output.clarification;

      setIntentions((prev) => {
        const newIntentions = [...prev];
        newIntentions.push({question: clarification, answer: ''});
        return newIntentions;
      });
    }
  }, [compareRecommendationFetcher.data?.output.clarification]);

  if (compareFetcher.state !== 'idle' || !compareFetcher.data) {
    return null;
  }

  return (
    <div className="mt-6 p-6 bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-base font-semibold text-gray-900">
          Looking for something specific?
        </h3>

        <CompareDialogRecommendationConversation intentions={intentions} />

        <div className="mt-6 pb-6 flex gap-x-3 ">
          <CompareDialogRecommendationUserAnswer
            compareRecommendationFetcher={compareRecommendationFetcher}
            onSubmit={() => {
              const textarea = document.getElementById(
                'answer',
              ) as HTMLTextAreaElement;

              const withAnswer = [...intentions];
              withAnswer[withAnswer.length - 1].answer = textarea.value || '';

              setIntentions(withAnswer);

              textarea.value = '';

              compareRecommendationFetcher.submit(
                {
                  input: JSON.stringify({
                    mainProduct,
                    comparedProducts,
                    intent: withAnswer,
                  }),
                },
                {
                  method: 'post',
                  action: '/compare-recommendation',
                },
              );
            }}
          />
          <CompareDialogRecommendationProduct
            compareRecommendationFetcher={compareRecommendationFetcher}
          />
        </div>
      </div>
    </div>
  );
};

const CompareDialogRecommendationConversation = ({
  intentions,
}: {
  intentions: CompareRecommendationResponse['input']['intent'];
}) => {
  const asTimeline = intentions.flatMap((intention) => {
    const answer = intention.answer || '';
    const question = intention.question || '';

    return [
      {type: 'question', content: question},
      {type: 'answer', content: answer},
    ];
  });

  return (
    <ul className="space-y-6 py-6 text-left">
      {asTimeline.map((timelineItem, timelineItemIdx) => {
        if (!timelineItem.content) {
          return null;
        }
        return (
          <li
            key={timelineItem.content}
            className="relative flex gap-x-4 items-center"
          >
            <div
              className={classNames(
                timelineItemIdx === intentions.length - 1 ? 'h-6' : '-bottom-6',
                'absolute left-0 top-0 flex w-6 justify-center',
              )}
            >
              <div className="w-px bg-gray-200" />
            </div>

            <div className="relative flex size-6 flex-none items-center justify-center bg-white">
              {timelineItem.type === 'question' ? (
                <QuestionMarkCircleIcon className="size-6 text-indigo-600" />
              ) : (
                <LightBulbIcon
                  aria-hidden="true"
                  className="size-6 text-green-600"
                />
              )}
            </div>
            {timelineItem.type === 'answer' ? (
              <div className="flex-auto rounded-md p-3 ring-1 ring-inset ring-gray-200">
                <p className="">{timelineItem.content}</p>
              </div>
            ) : (
              <p className="flex-auto py-0.5 text-indigo-600">
                <Answer text={timelineItem.content} />
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
};

const CompareDialogRecommendationProduct = ({
  compareRecommendationFetcher,
}: {
  compareRecommendationFetcher: FetcherWithComponents<CompareRecommendationResponse>;
}) => {
  if (
    !compareRecommendationFetcher.data?.output.product ||
    !compareRecommendationFetcher.data.output.explanation
  ) {
    return null;
  }
  return (
    <div className="text-left border p-6">
      <Answer text={compareRecommendationFetcher.data.output.explanation} />
      <div className="w-64">
        <ProductCard
          product={compareRecommendationFetcher.data.output.product}
        />
      </div>
      <button
        className="add-to-cart flex max-w-xs flex-1 items-center justify-center rounded-md border border-transparent bg-indigo-600 px-8 py-3 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-50 sm:w-full"
        type="submit"
      >
        Add to cart
      </button>
    </div>
  );
};

const CompareDialogRecommendationUserAnswer = ({
  compareRecommendationFetcher,
  onSubmit,
}: {
  compareRecommendationFetcher: FetcherWithComponents<CompareRecommendationResponse>;
  onSubmit: () => void;
}) => {
  if (
    compareRecommendationFetcher.data?.output.product &&
    compareRecommendationFetcher.data?.output.explanation
  ) {
    return null;
  }
  return (
    <>
      <UserIcon className="size-6 flex-none rounded-full bg-gray-50" />
      <form action="#" className="relative flex-auto">
        <div
          className={`overflow-hidden pb-12 ${
            compareRecommendationFetcher.state !== 'idle'
              ? 'outline-none'
              : 'outline outline-1 -outline-offset-1 outline-gray-300  focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600'
          }`}
        >
          {compareRecommendationFetcher.state === 'idle' ? (
            <>
              <label htmlFor="answer" className="sr-only">
                Add your answer
              </label>
              <textarea
                id="answer"
                name="answer"
                rows={2}
                placeholder="Add your answer..."
                className="block w-full min-h-32  resize-none bg-transparent px-3 py-1.5 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0"
                defaultValue={''}
              />
            </>
          ) : (
            <Spinner />
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 flex justify-between py-2 pl-3 pr-2">
          <div className="flex items-center space-x-5">
            <div className="flex items-center"></div>
          </div>
          <button
            disabled={compareRecommendationFetcher.state !== 'idle'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSubmit();
            }}
            type="submit"
            className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            {compareRecommendationFetcher.state === 'idle'
              ? 'Answer'
              : 'Loading...'}
          </button>
        </div>
      </form>
    </>
  );
};
