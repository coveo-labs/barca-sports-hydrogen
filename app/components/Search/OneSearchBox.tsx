import {Combobox, ComboboxInput} from '@headlessui/react';
import {MagnifyingGlassIcon} from '@heroicons/react/24/outline';
import {useFetcher, useNavigate} from '@remix-run/react';

import {useEffect, useRef, useState} from 'react';
import type {BrowseCatalogResponse} from '~/routes/browse-catalog';
import type {DetectIntentResponse} from '~/routes/detect-intent';
import {IntentDetectionSteps, LoadingIntentDetection} from './IntentDetection';
import {BrowseCatalogSteps, LoadingBrowseCatalog} from './BrowseCatalog';

const Spinner = () => (
  <svg
    aria-hidden="true"
    className="text-white animate-spin fill-indigo-600 col-start-1 row-start-1 ml-4 size-5 self-center text-gray-400"
    viewBox="0 0 100 101"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
      fill="currentColor"
    />
    <path
      d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
      fill="currentFill"
    />
  </svg>
);

export function OneSearchBox({close}: {close: () => void}) {
  const input = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(input.current?.value || '');
  const navigate = useNavigate();
  const intentionFetcher = useFetcher<DetectIntentResponse>();
  const [intentDetection, setIntentDetection] = useState(intentionFetcher.data);
  const isLoadingIntentDetect = intentionFetcher.state !== 'idle';

  const browseCatalogFetcher = useFetcher<BrowseCatalogResponse>();
  const [catalog, setCatalog] = useState(browseCatalogFetcher.data);
  const isLoadingCatalog = browseCatalogFetcher.state !== 'idle';
  const [intentAccepted, setIntentAccepted] = useState(false);

  useEffect(() => {
    setIntentDetection(intentionFetcher.data);
  }, [intentionFetcher.data]);
  useEffect(() => {
    setCatalog(browseCatalogFetcher.data);
  }, [browseCatalogFetcher.data]);

  return (
    <Combobox>
      <div className="grid grid-cols-1">
        <ComboboxInput
          onChange={(e) => {
            if (e === null) {
              return;
            }
            setQuery(e.target.value);
          }}
          ref={input}
          className="col-start-1 row-start-1 h-12 w-full pl-11 pr-4 text-md text-gray-900 outline-none placeholder:text-gray-400 "
          placeholder="Search..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              intentionFetcher.submit(
                {input: e.currentTarget.value},
                {method: 'post', action: '/detect-intent'},
              );
              setIntentAccepted(false);
              setCatalog(undefined);
              setQuery(e.currentTarget.value);
              setIntentDetection(undefined);
            }
          }}
        />

        {isLoadingIntentDetect ? (
          <Spinner />
        ) : (
          <MagnifyingGlassIcon
            className="pointer-events-none col-start-1 row-start-1 ml-4 size-5 self-center text-gray-400"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="divide-y overflow-auto max-h-[80vh]">
        {isLoadingIntentDetect && <LoadingIntentDetection />}
        {intentDetection && !isLoadingIntentDetect && (
          <IntentDetectionSteps
            intentAccepted={intentAccepted}
            intentDetection={intentDetection}
            onAcceptIntent={() => {
              setIntentAccepted(true);
              setQuery(intentDetection.output.expandedOrReformulatedQuery);

              switch (intentDetection.output.intent) {
                case 3:
                  browseCatalogFetcher.submit(
                    {
                      input: JSON.stringify({
                        ...intentDetection.output,
                      }),
                    },
                    {method: 'post', action: '/browse-catalog'},
                  );
                  break;
                default:
                  console.log('NOT HANDLED', intentDetection);
                  break;
              }
            }}
            onRefuseIntent={() => {
              navigate('/search?q=' + encodeURIComponent(query));
              close();
            }}
          />
        )}
        {isLoadingCatalog && <LoadingBrowseCatalog />}

        {catalog && !isLoadingCatalog && (
          <BrowseCatalogSteps catalog={catalog} />
        )}
      </div>
    </Combobox>
  );
}
