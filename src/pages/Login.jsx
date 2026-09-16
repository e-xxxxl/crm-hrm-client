import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.js";
import { normaliseError } from "../services/api.js";
import AuthLayout from "../layouts/AuthLayout.jsx";
import TextField from "../components/ui/TextField.jsx";
import PasswordField from "../components/ui/PasswordField.jsx";
import Button from "../components/ui/Button.jsx";
import Alert from "../components/ui/Alert.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { status, login, selectOrg, loginContext, pending2fa, logout } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [totp, setTotp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const step = status === "pending-2fa" ? 3 : status === "pending-org" ? 2 : 1;

  async function submitCredentials(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      navigate("/", { replace: true });
    } catch (err) {
      if (err.code === "TOTP_REQUIRED" || err.code === "TOTP_INVALID") {
        setError(err.message);
      } else {
        setError(normaliseError(err).message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function chooseOrg(orgId) {
    setError(null);
    setBusy(true);
    try {
      await selectOrg(orgId);
      navigate("/", { replace: true });
    } catch (err) {
      if (err.code === "TOTP_REQUIRED" || err.code === "TOTP_INVALID") setError(err.message);
      else setError(normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitTotp(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await selectOrg(pending2fa.organizationId, totp.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.code ? err.message : normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  if (step === 3) {
    return (
      <AuthLayout>
        <form onSubmit={submitTotp} className="card p-6">
          <h1 className="text-lg font-semibold text-ink-900">Two-factor authentication</h1>
          <p className="mt-1 text-sm text-ink-500">
            Enter the 6-digit code from your authenticator app, or a recovery code.
          </p>
          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}
          <div className="mt-5">
            <TextField
              label="Authentication code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          </div>
          <Button type="submit" loading={busy} className="mt-6 !w-full">
            Verify
          </Button>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-5 text-xs font-medium text-ink-500 hover:text-ink-700"
          >
            Cancel
          </button>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {step === 1 ? (
        <form onSubmit={submitCredentials} className="card p-6">
          <h1 className="text-lg font-semibold text-ink-900">Sign in</h1>
          <p className="mt-1 text-sm text-ink-500">Use your work email address.</p>

          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}

          <div className="mt-5 space-y-4">
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            <PasswordField
              label="Password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>

          <Button type="submit" loading={busy} className="mt-6 !w-full">
            Continue
          </Button>
        </form>
      ) : (
        <div className="card p-6">
          <h1 className="text-lg font-semibold text-ink-900">Choose organization</h1>
          <p className="mt-1 text-sm text-ink-500">
            {loginContext?.name}, you belong to more than one organization. Select the one
            you want to work in.
          </p>

          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}

          <ul className="mt-5 space-y-2">
            {loginContext?.organizations.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => chooseOrg(org.id)}
                  className="flex w-full items-center justify-between rounded-md border border-ink-200 bg-white px-3.5 py-3 text-left transition-colors hover:border-brand-600 hover:bg-ink-50 disabled:opacity-60"
                >
                  <span>
                    <span className="block text-sm font-medium text-ink-900">{org.name}</span>
                    <span className="block text-xs text-ink-500">{org.role}</span>
                  </span>
                  <span className="text-2xs font-medium uppercase tracking-wide text-ink-400">
                    {org.code}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => logout()}
            className="mt-5 text-xs font-medium text-ink-500 hover:text-ink-700"
          >
            Use a different account
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
