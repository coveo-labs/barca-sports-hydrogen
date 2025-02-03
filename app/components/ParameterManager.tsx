import {useParameterManager} from '../lib/coveo.engine';
import {buildParameterSerializer} from '@coveo/headless-react/ssr-commerce';
import {useSearchParams} from '@remix-run/react';
import {useEffect, useMemo, useRef} from 'react';

export default function ParameterManager({url}: {url: string | null}) {
  const {state, methods} = useParameterManager();

  const {serialize, deserialize} = buildParameterSerializer();

  const initialUrl = useMemo(() => new URL(url ?? ''), [url]);
  const previousUrl = useRef(initialUrl.href);
  const [searchParams] = useSearchParams();

  /**
   * When the URL fragment changes, this effect deserializes it and synchronizes it into the
   * ParameterManager controller's state.
   */
  useEffect(() => {
    if (methods === undefined) {
      return;
    }

    const newCommerceParams = deserialize(searchParams);

    const newUrl = serialize(newCommerceParams, new URL(previousUrl.current));

    if (newUrl === previousUrl.current || newUrl === initialUrl.href) {
      return;
    }

    previousUrl.current = newUrl;
    methods.synchronize(newCommerceParams);
  }, [searchParams]);

  useEffect(() => {
    if (methods === undefined) {
      return;
    }

    const newUrl = serialize(state.parameters, new URL(previousUrl.current));

    if (previousUrl.current === newUrl || newUrl === initialUrl.href) {
      return;
    }

    previousUrl.current = newUrl;
    history.pushState(null, '', newUrl);
  }, [state.parameters]);

  return null;
}