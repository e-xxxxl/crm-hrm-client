import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button.jsx";
import TextField from "../components/ui/TextField.jsx";
import PasswordField from "../components/ui/PasswordField.jsx";
import Alert from "../components/ui/Alert.jsx";
import Badge from "../components/ui/Badge.jsx";
import Spinner from "../components/ui/Spinner.jsx";
import { useApiQuery } from "../hooks/useApiQuery.js";
import { useMutation } from "../hooks/useMutation.js";
import { useAuth } from "../store/auth.js";
import { toast } from "../store/toast.js";
import { fromNow } from "../utils/format.js";

export default function Security() {
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);

  return (
    <div className="min-h-screen bg-ink-100">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-ink-200 bg-white px-4 sm:px-6">
        <button type="button" className="text-sm text-ink-500 hover:text-ink-800" onClick={() => navigate(-1)}>
          &larr; Back
        </button>
        <p className="text-sm font-medium text-ink-900">Security &amp; sessions</p>
      </header>
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6">
        <p className="text-sm text-ink-500">{user?.email}</p>
        <TwoFactorSection />
        <SessionsSection />
      </main>
    </div>
  );
}

function TwoFactorSection() {
  const status = useApiQuery("/auth/2fa/status");
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState(null);
  const [disablePw, setDisablePw] = useState("");

  const begin = useMutation((c) => c.post("/auth/2fa/setup"));
  const confirm = useMutation((c, b) => c.post("/auth/2fa/confirm", b));
  const disable = useMutation((c, b) => c.post("/auth/2fa/disable", b));

  if (status.loading) {
    return (
      <Section title="Two-factor authentication">
        <Spinner size={18} />
      </Section>
    );
  }
  const enabled = status.data?.enabled;

  return (
    <Section title="Two-factor authentication">
      {enabled ? (
        <>
          <p className="flex items-center gap-2 text-sm text-ink-700">
            <Badge tone="green">Enabled</Badge>
            {status.data.recoveryCodesRemaining} recovery code(s) remaining
          </p>
          <div className="mt-3 max-w-xs space-y-2">
            <PasswordField label="Password" value={disablePw} onChange={(e) => setDisablePw(e.target.value)} />
            <Button
              variant="danger"
              loading={disable.loading}
              onClick={async () => {
                try {
                  await disable.mutate({ password: disablePw });
                  toast.success("Two-factor disabled");
                  setDisablePw("");
                  status.refetch();
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              Disable two-factor
            </Button>
          </div>
        </>
      ) : recovery ? (
        <div>
          <Alert tone="warning">Save these recovery codes somewhere safe — each works once if you lose your device.</Alert>
          <ul className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-sm">
            {recovery.map((r) => (
              <li key={r} className="rounded bg-ink-50 px-2 py-1">{r}</li>
            ))}
          </ul>
          <Button className="mt-4" onClick={() => { setRecovery(null); status.refetch(); }}>Done</Button>
        </div>
      ) : setup ? (
        <div className="max-w-md space-y-3">
          <p className="text-sm text-ink-600">Add this secret to your authenticator app, then enter the 6-digit code it shows.</p>
          <div className="rounded-md border border-ink-200 bg-ink-50 p-3">
            <p className="text-2xs uppercase tracking-wide text-ink-400">Secret</p>
            <p className="break-all font-mono text-sm text-ink-900">{setup.secret}</p>
            <a href={setup.otpauthUrl} className="mt-1 inline-block text-xs text-brand-600">Open in authenticator app</a>
          </div>
          <TextField label="6-digit code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="flex gap-2">
            <Button
              loading={confirm.loading}
              onClick={async () => {
                try {
                  const res = await confirm.mutate({ code: code.trim() });
                  setRecovery(res.recoveryCodes);
                  setSetup(null);
                  setCode("");
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              Verify &amp; enable
            </Button>
            <Button variant="secondary" onClick={() => setSetup(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-600">Protect your account with a time-based one-time code from an authenticator app.</p>
          <Button
            className="mt-3"
            loading={begin.loading}
            onClick={async () => {
              try {
                setSetup(await begin.mutate());
              } catch (e) {
                toast.error(e.message);
              }
            }}
          >
            Set up two-factor
          </Button>
        </>
      )}
    </Section>
  );
}

function SessionsSection() {
  const navigate = useNavigate();
  const list = useApiQuery("/auth/sessions");
  const revoke = useMutation((c, id) => c.delete(`/auth/sessions/${id}`));
  const revokeAll = useMutation((c) => c.post("/auth/sessions/revoke-all"));

  return (
    <Section
      title="Active sessions"
      action={
        <Button
          variant="secondary"
          loading={revokeAll.loading}
          onClick={async () => {
            if (!confirm("Sign out of every device, including this one?")) return;
            await revokeAll.mutate();
            navigate("/login", { replace: true });
          }}
        >
          Sign out everywhere
        </Button>
      }
    >
      {list.loading ? (
        <Spinner size={18} />
      ) : (
        <ul className="divide-y divide-ink-100">
          {(list.data || []).map((s) => (
            <li key={s.id} className="flex items-center justify-between py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">
                  {s.userAgent} {s.current && <Badge tone="green">This device</Badge>}
                </p>
                <p className="truncate text-xs text-ink-500">
                  {s.organization?.code ? `${s.organization.code} · ` : ""}
                  {s.ip || "unknown IP"} · last used {fromNow(s.lastUsedAt)}
                </p>
              </div>
              {!s.current && (
                <button
                  type="button"
                  className="text-xs text-red-600 hover:text-red-700"
                  onClick={async () => {
                    await revoke.mutate(s.id);
                    list.refetch();
                  }}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
          {(list.data || []).length === 0 && <li className="py-3 text-sm text-ink-500">No active sessions.</li>}
        </ul>
      )}
    </Section>
  );
}

function Section({ title, action, children }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
