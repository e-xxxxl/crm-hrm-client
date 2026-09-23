import { useCallback, useEffect, useRef, useState } from "react";
import { api, normaliseError } from "../services/api.js";

/**
 * Fetch a resource from the API with loading/error state and a manual `refetch`.
 * `params` is serialised into the query string; changing it re-fetches.
 * Pass `skip` to defer the request.
 */
export function useApiQuery(path, { params, skip = false, deps = [] } = {}) {
  const [state, setState] = useState({ data: null, meta: null, raw: null, loading: !skip, error: null });
  const reqId = useRef(0);
  const paramsKey = JSON.stringify(params ?? {});

  const run = useCallback(async () => {
    if (skip || !path) return;
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get(path, { params });
      if (id !== reqId.current) return;
      // `raw` is the untouched response body — for endpoints that return extra
      // sibling fields alongside `data`/`meta` (e.g. attendance/today's
      // `summary`), read those off `raw` rather than guessing at `data`'s shape.
      setState({ data: res.data.data ?? res.data, meta: res.data.meta ?? null, raw: res.data, loading: false, error: null });
    } catch (err) {
      if (id !== reqId.current) return;
      setState({ data: null, meta: null, loading: false, error: normaliseError(err) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, paramsKey, skip]);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  return { ...state, refetch: run, setData: (data) => setState((s) => ({ ...s, data })) };
}

export default useApiQuery;
