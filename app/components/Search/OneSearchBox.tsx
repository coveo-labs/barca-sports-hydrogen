import {Combobox, ComboboxInput} from '@headlessui/react';
import {MagnifyingGlassIcon} from '@heroicons/react/24/outline';
import {useFetcher, useNavigate} from '@remix-run/react';

import {useEffect, useRef, useState} from 'react';
import type {BrowseCatalogResponse} from '~/routes/browse-catalog';
import type {DetectIntentResponse} from '~/routes/detect-intent';
import {IntentDetectionSteps, LoadingIntentDetection} from './IntentDetection';
import {BrowseCatalogSteps, LoadingBrowseCatalog} from './BrowseCatalog';
import {Spinner} from './Spinner';

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
              localStorage.setItem(
                'intentDetection',
                JSON.stringify(intentDetection),
              );

              switch (intentDetection.output.intent) {
                case 2:
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
          <BrowseCatalogSteps catalog={catalog} close={close} />
        )}
      </div>
    </Combobox>
  );
}
