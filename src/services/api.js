import axios from "axios";

/**
 * Axios instance for the platform API.
 *
 * Auth model: a short-lived access token is held in memory (mirrored to
 * localStorage so a page reload can resume without a full re-login) and sent as
 * a Bearer header. The refresh token lives in an httpOnly cookie the browser
 * attaches automatically to /api/auth/* — so `withCredentials` is on.
 *
 * On a 401 the interceptor calls /api/auth/refresh once, then replays the
 * original request. Concurrent 401s share a single refresh promise.
 */

const ACCESS_TOKEN_KEY = "crmhrm.accessToken";

let accessToken = safeGet(ACCESS_TOKEN_KEY);
let refreshPromise = null;
const listeners = new Set();

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage disabled — token stays in memory only */
  }
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  safeSet(ACCESS_TOKEN_KEY, accessToken);
}

/** Subscribe to forced-logout events (refresh failed). */
export function onAuthExpired(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emitExpired() {
  setAccessToken(null);
  for (const fn of listeners) fn();
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function runRefresh() {
  // A single transient failure here (network blip, cold-starting API) should
  // not sign the user out — only a real 401/403 (refresh token actually
  // invalid/expired) should. Retry a couple of times first.
  let lastErr;
  for (let i = 0; i < 3; i++) {
    try {
      const { data } = await axios.post(
        `${api.defaults.baseURL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      const next = data?.data?.accessToken;
      if (!next) throw new Error("No access token in refresh response");
      setAccessToken(next);
      return next;
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if (status === 401 || status === 403) throw err;
      if (i < 2) await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (!response || response.status !== 401 || config?._retried) {
      return Promise.reject(normaliseError(error));
    }
    // Do not attempt to refresh the refresh/login calls themselves.
    if (config.url?.includes("/auth/refresh") || config.url?.includes("/auth/login")) {
      if (config.url?.includes("/auth/refresh")) emitExpired();
      return Promise.reject(normaliseError(error));
    }

    config._retried = true;
    try {
      if (!refreshPromise) refreshPromise = runRefresh().finally(() => (refreshPromise = null));
      const token = await refreshPromise;
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch (refreshErr) {
      emitExpired();
      return Promise.reject(normaliseError(refreshErr));
    }
  },
);

/** Collapse an axios error into a plain object the UI can render. */
export function normaliseError(error) {
  const payload = error?.response?.data?.error;
  const err = new Error(payload?.message || error?.message || "Request failed");
  err.code = payload?.code || "ERROR";
  err.status = error?.response?.status;
  err.details = payload?.details;
  return err;
}

export default api;
