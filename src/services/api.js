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
const PROFILE_KEY = "crmhrm.profile";

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

/** True when localStorage actually persists (it doesn't in some private modes). */
export function storageWorks() {
  try {
    const k = "crmhrm.probe";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;
  safeSet(ACCESS_TOKEN_KEY, accessToken);
}

/**
 * The last-known signed-in profile ({ user, session }). Not a secret — the
 * server re-checks every request — it just lets a reload paint the app
 * immediately and tolerate a slow/asleep API instead of showing a spinner or
 * bouncing to the login page while the session is re-validated.
 */
export function readCachedProfile() {
  try {
    const raw = safeGet(PROFILE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.user && parsed?.session ? parsed : null;
  } catch {
    return null;
  }
}
export function writeCachedProfile(user, session) {
  safeSet(PROFILE_KEY, JSON.stringify({ user, session }));
}
export function clearCachedProfile() {
  safeSet(PROFILE_KEY, null);
}

/** Subscribe to forced-logout events (refresh failed). */
export function onAuthExpired(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emitExpired() {
  setAccessToken(null);
  clearCachedProfile();
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

/**
 * The refresh token rotates on every use — a stale cookie gets a real 401.
 * Two refresh calls in flight at once (e.g. React StrictMode double-invoking
 * a mount effect, or a 401 interceptor firing while bootstrap is already
 * refreshing) would otherwise race: whichever loses presents an
 * already-rotated cookie and signs the user out. Every caller in the app —
 * bootstrap included — must go through this single in-flight promise instead
 * of calling runRefresh() directly.
 */
export function refreshAccessToken() {
  if (!refreshPromise) refreshPromise = runRefresh().finally(() => (refreshPromise = null));
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    if (!response || response.status !== 401 || config?._retried) {
      return Promise.reject(normaliseError(error));
    }
    // Do not attempt to refresh the refresh/login calls themselves. select-org
    // is part of sign-in too: its 401s mean "two-factor code needed/invalid",
    // not "session expired".
    if (
      config.url?.includes("/auth/refresh") ||
      config.url?.includes("/auth/login") ||
      config.url?.includes("/auth/select-org")
    ) {
      if (config.url?.includes("/auth/refresh")) emitExpired();
      return Promise.reject(normaliseError(error));
    }

    config._retried = true;
    try {
      const token = await refreshAccessToken();
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch (refreshErr) {
      // Only a definite "your session is gone" answer signs the user out. A
      // network error or a 5xx from a waking API says nothing about the
      // session, so the user stays signed in and the request just fails.
      const s = refreshErr?.response?.status;
      if (s === 401 || s === 403) {
        if (refreshErr?.response?.data?.error?.code === "NO_REFRESH_COOKIE") {
          // eslint-disable-next-line no-console
          console.warn(
            "[auth] The server did not receive the refresh cookie. If this keeps happening, the browser is blocking the cross-site cookie (check COOKIE_SECURE / COOKIE_SAMESITE / CLIENT_ORIGINS on the API).",
          );
        }
        emitExpired();
      }
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
