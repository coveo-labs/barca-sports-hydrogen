import {useParameterManager} from '../lib/coveo.engine';
import {
  buildParameterSerializer,
  type ParameterManagerState,
  type ParameterManager,
  type CommerceSearchParameters,
} from '@coveo/headless-react/ssr-commerce';
import {useSearchParams} from '@remix-run/react';
import {useEffect, useMemo, useRef} from 'react';

export default function ParameterManager({url}: {url: string | null}) {
  const {state, methods} = useParameterManager() as {
    state: ParameterManagerState<CommerceSearchParameters>;
    methods: ParameterManager<CommerceSearchParameters>;
  };

  const initialUrl = useMemo(() => new URL(url ?? ''), [url]);
  const previousUrl = useRef(initialUrl.href);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (methods === undefined) {
      return;
    }

    const {serialize, deserialize} = buildParameterSerializer();

    const newCommerceParams = deserialize(searchParams);

    const newUrl = serialize(newCommerceParams, new URL(previousUrl.current));

    if (newUrl === previousUrl.current || newUrl === initialUrl.href) {
      return;
    }

    previousUrl.current = newUrl;
    methods.synchronize(newCommerceParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (methods === undefined) {
      return;
    }

    const {serialize} = buildParameterSerializer();

    const newUrl = serialize(state.parameters, new URL(previousUrl.current));

    if (previousUrl.current === newUrl || newUrl === initialUrl.href) {
      return;
    }

    previousUrl.current = newUrl;
    history.pushState(null, '', newUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.parameters]);

  return null;
}
