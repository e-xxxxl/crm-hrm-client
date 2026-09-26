import { create } from "zustand";
import { api, setAccessToken, onAuthExpired, refreshAccessToken } from "../services/api.js";

/**
 * Global auth/session state.
 *
 * `session` mirrors the JWT claims (role, organization, permissions) and is the
 * single source of truth for what the current user may see and do. `bootstrap`
 * runs once on app start: it tries a silent refresh (cookie) and, on success,
 * loads the fresh profile.
 */
export const useAuth = create((set, get) => ({
  status: "loading", // loading | anonymous | pending-org | pending-2fa | authenticated
  user: null,
  session: null, // { role, organizationId, organizationName, permissions[] }
  loginContext: null, // { userId, name, organizations[] } between step 1 and 2
  pending2fa: null, // { organizationId } when a TOTP code is required

  async bootstrap() {
    // A page reload always starts here (no in-memory access token survives it),
    // relying on the httpOnly refresh cookie. A genuine 401/403 means the
    // cookie is missing/expired — that's a real logout. Anything else (a
    // network blip, a cold-starting API, a timeout) gets a couple of quick
    // retries first (inside refreshAccessToken), so a single transient
    // failure doesn't sign the user out.
    //
    // This goes through the same single-flight refreshAccessToken() the 401
    // interceptor uses, rather than posting /auth/refresh directly — the
    // refresh token rotates on every use, so if this ran its own independent
    // call, it could race a concurrent refresh (e.g. React StrictMode
    // double-invoking this effect on mount) and get signed out for
    // presenting an already-rotated cookie.
    try {
      await refreshAccessToken();
      const me = await api.get("/auth/me");
      set({
        status: "authenticated",
        user: me.data.data.user,
        session: me.data.data.session,
      });
    } catch (err) {
      set({ status: "anonymous", user: null, session: null });
      const status = err?.response?.status;
      if (status !== 401 && status !== 403) {
        // eslint-disable-next-line no-console
        console.warn("Session restore failed after retries:", err);
      }
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
      set({
        status: "authenticated",
        user: data.data.user,
        session: data.data.session,
        loginContext: null,
        pending2fa: null,
      });
    } catch (err) {
      const code = err?.response?.data?.error?.code;
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
    set({
      status: "authenticated",
      user: data.data.user,
      session: data.data.session,
    });
  },

  async logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore network errors on logout */
    }
    setAccessToken(null);
    set({ status: "anonymous", user: null, session: null, loginContext: null, pending2fa: null });
  },

  /** Refresh the cached profile (after editing own details, org change, etc). */
  async refreshProfile() {
    const me = await api.get("/auth/me");
    set({ user: me.data.data.user, session: me.data.data.session });
  },

  can(permission) {
    const perms = get().session?.permissions || [];
    return perms.includes("*") || perms.includes(permission);
  },

  canAny(...permissions) {
    return permissions.some((p) => get().can(p));
  },
}));

// Wire the api layer's forced-logout signal into the store.
onAuthExpired(() => {
  useAuth.setState({ status: "anonymous", user: null, session: null });
});
