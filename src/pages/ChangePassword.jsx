import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, normaliseError, setAccessToken } from "../services/api.js";
import { useAuth } from "../store/auth.js";
import { toast } from "../store/toast.js";
import AuthLayout from "../layouts/AuthLayout.jsx";
import PasswordField from "../components/ui/PasswordField.jsx";
import Button from "../components/ui/Button.jsx";
import Alert from "../components/ui/Alert.jsx";

export default function ChangePassword() {
  const navigate = useNavigate();
  const setState = useAuth.setState;
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (form.newPassword !== form.confirm) {
      setError("The new passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      // The server revoked every session — send the user back to sign in.
      setAccessToken(null);
      setState({ status: "anonymous", user: null, session: null });
      toast.success("Password changed. Please sign in again.");
      navigate("/login", { replace: true });
    } catch (err) {
      setError(normaliseError(err).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="card p-6">
        <h1 className="text-lg font-semibold text-ink-900">Change password</h1>
        <p className="mt-1 text-sm text-ink-500">
          Choose a new password. You will be signed out of all devices.
        </p>

        {error && (
          <Alert tone="error" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="mt-5 space-y-4">
          <PasswordField
            label="Current password"
            autoComplete="current-password"
            required
            value={form.currentPassword}
            onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
          />
          <PasswordField
            label="New password"
            autoComplete="new-password"
            required
            hint="At least 8 characters"
            value={form.newPassword}
            onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            required
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
          />
        </div>

        <div className="mt-6 flex gap-2">
          <Button type="submit" loading={busy}>
            Update password
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
