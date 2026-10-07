import { create } from "zustand";
import {
  api,
  setAccessToken,
  onAuthExpired,
  getAccessToken,
  readCachedProfile,
  writeCachedProfile,
  clearCachedProfile,
  storageWorks,
} from "../services/api.js";

/**
 * Work out the starting state synchronously, before the first render, so a
 * reload never shows a blocking spinner when it doesn't have to:
 *  - a remembered profile  -> paint the app straight away, re-validate behind it
 *  - a token but no profile (or storage that can't persist anything) -> "loading"
 *  - nothing to restore    -> "anonymous": the login page appears instantly,
 *    with no network round trip to an API that may be asleep.
 */
function initialState() {
  const cached = readCachedProfile();
  if (cached) return { status: "authenticated", user: cached.user, session: cached.session };
  if (getAccessToken() || !storageWorks()) return { status: "loading", user: null, session: null };
  return { status: "anonymous", user: null, session: null };
}

/**
 * Global auth/session state.
 *
 * `session` mirrors the JWT claims (role, organization, permissions) and is the
 * single source of truth for what the current user may see and do. `bootstrap`
 * runs once on app start and re-validates whatever `initialState` restored.
 */
export const useAuth = create((set, get) => {
  /** Record a freshly-confirmed signed-in profile (state + local cache). */
  function commit(user, session, extra = {}) {
    writeCachedProfile(user, session);
    set({ status: "authenticated", user, session, ...extra });
  }

  return {
    ...initialState(),
    loginContext: null, // { userId, name, organizations[] } between step 1 and 2
    pending2fa: null, // { organizationId } when a TOTP code is required

    async bootstrap() {
      if (get().status === "anonymous") return; // nothing remembered, nothing to restore

      const painted = get().status === "authenticated"; // optimistic cached profile on screen
      try {
        // An expired access token 401s here, and the response interceptor
        // transparently refreshes (single-flight) and replays this request, so
        // the user stays signed in as long as either the token or the refresh
        // cookie is still good — a reload no longer *requires* the cookie.
        const me = await api.get("/auth/me");
        commit(me.data.data.user, me.data.data.session);
      } catch (err) {
        const status = err?.status;
        if (status === 401 || status === 403) {
          // A definite "this session is over".
          setAccessToken(null);
          clearCachedProfile();
          set({ status: "anonymous", user: null, session: null });
        } else if (!painted) {
          // Couldn't reach the API and have nothing cached to show. Fall back
          // to the login page but keep the token, so the next reload can resume.
          set({ status: "anonymous", user: null, session: null });
        }
        // else: offline / API waking up — stay signed in on the cached profile.
      }
    },

    /** Step 1 — verify credentials. Returns the org list. */
    async login(email, password) {
      const { data } = await api.post("/auth/login", { email, password });
      const ctx = data.data;
      set({ loginContext: ctx });
      if (ctx.organizations.length === 1) {
        await get().selectOrg(ctx.organizations[0].id);
      } else {
        set({ status: "pending-org" });
      }
      return ctx;
    },

    /** Step 2 — pick an org (and 2FA code, if enrolled), receive the JWT. */
    async selectOrg(organizationId, totp) {
      const ctx = get().loginContext;
      if (!ctx) throw new Error("No login in progress");
      try {
        const { data } = await api.post("/auth/select-org", {
          userId: ctx.userId,
          organizationId,
          totp: totp || undefined,
        });
        setAccessToken(data.data.accessToken);
        commit(data.data.user, data.data.session, { loginContext: null, pending2fa: null });
      } catch (err) {
        const code = err?.response?.data?.error?.code ?? err?.code;
        if (code === "TOTP_REQUIRED" || code === "TOTP_INVALID") {
          set({ status: "pending-2fa", pending2fa: { organizationId } });
          const e = new Error(code === "TOTP_INVALID" ? "That two-factor code is not valid." : "Enter your two-factor code.");
          e.code = code;
          throw e;
        }
        throw err;
      }
    },

    /** In-app org switch (Super Admin / Group Admin etc. with multiple memberships) — no logout needed. */
    async switchOrg(organizationId) {
      const { data } = await api.post("/auth/switch-org", { organizationId });
      setAccessToken(data.data.accessToken);
      commit(data.data.user, data.data.session);
    },

    async logout() {
      try {
        await api.post("/auth/logout");
      } catch {
        /* ignore network errors on logout */
      }
      setAccessToken(null);
      clearCachedProfile();
      set({ status: "anonymous", user: null, session: null, loginContext: null, pending2fa: null });
    },

    /** Refresh the cached profile (after editing own details, org change, etc). */
    async refreshProfile() {
      const me = await api.get("/auth/me");
      commit(me.data.data.user, me.data.data.session);
    },

    can(permission) {
      const perms = get().session?.permissions || [];
      return perms.includes("*") || perms.includes(permission);
    },

    canAny(...permissions) {
      return permissions.some((p) => get().can(p));
    },
  };
});

// Wire the api layer's forced-logout signal into the store.
onAuthExpired(() => {
  useAuth.setState({ status: "anonymous", user: null, session: null });
});
