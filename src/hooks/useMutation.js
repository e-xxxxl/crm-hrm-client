import { useCallback, useState } from "react";
import { api, normaliseError } from "../services/api.js";

/**
 * Wrap a write request (POST/PATCH/DELETE). Returns `{ mutate, loading, error }`.
 * `mutate` resolves with the response body and rejects with a normalised error
 * whose `.details` holds any field-level validation messages.
 */
export function useMutation(request) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(
    async (arg) => {
      setLoading(true);
      setError(null);
      try {
        const res = await request(api, arg);
        return res?.data?.data ?? res?.data ?? null;
      } catch (err) {
        const normalised = normaliseError(err);
        setError(normalised);
        throw normalised;
      } finally {
        setLoading(false);
      }
    },
    [request],
  );

  return { mutate, loading, error, setError };
}

/** Turn a normalised error's details array into a { field: message } map. */
export function fieldErrors(error) {
  const out = {};
  for (const d of error?.details || []) {
    if (d?.path) out[d.path] = d.message;
  }
  return out;
}

export default useMutation;
