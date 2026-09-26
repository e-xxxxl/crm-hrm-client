import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import Button from "../../components/ui/Button.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import LeaveTypeManager from "../../components/hrm/LeaveTypeManager.jsx";
import TrainingManager from "../../components/hrm/TrainingManager.jsx";
import FileInput from "../../components/ui/FileInput.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";

const DAYS = [
  ["1", "Mon"],
  ["2", "Tue"],
  ["3", "Wed"],
  ["4", "Thu"],
  ["5", "Fri"],
  ["6", "Sat"],
  ["0", "Sun"],
];

export default function HrSettings() {
  const canWrite = useAuth((s) => s.can("settings:write"));
  const canWriteOrg = useAuth((s) => s.can("org:write"));
  const canWriteTraining = useAuth((s) => s.can("training:write"));
  const session = useAuth((s) => s.session);
  // HR Manager can't create a new catalog entry (see TrainingManager) but can
  // still see the tab to edit/deactivate/delete existing ones.
  const canSeeTrainingTab = canWriteTraining || session?.role === "HR Manager";
  const [tab, setTab] = useState("operational");

  const tabs = [
    { key: "operational", label: "Operational" },
    { key: "leave", label: "Leave types" },
    { key: "documents", label: "Document types" },
    { key: "notifications", label: "Notifications" },
  ];
  if (canSeeTrainingTab) tabs.push({ key: "trainings", label: "Trainings" });
  if (canWriteOrg) tabs.push({ key: "branding", label: "Branding" });

  return (
    <>
      <PageHeader title="HR Settings" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "operational" && <OperationalSettings canWrite={canWrite} />}
      {tab === "leave" && <LeaveTypeManager />}
      {tab === "documents" && <DocumentTypes canWrite={canWrite} />}
      {tab === "notifications" && <NotificationSettings canWrite={canWrite} />}
      {tab === "trainings" && canSeeTrainingTab && <TrainingManager />}
      {tab === "branding" && canWriteOrg && <BrandingSettings />}
    </>
  );
}

function BrandingSettings() {
  const session = useAuth((s) => s.session);
  const refreshProfile = useAuth((s) => s.refreshProfile);
  const save = useMutation((client, body) => client.patch(`/organizations/${session.organizationId}`, body));
  const [logoUrl, setLogoUrl] = useState(session?.organizationLogoUrl || "");

  async function apply(url) {
    setLogoUrl(url);
    try {
      await save.mutate({ logoUrl: url });
      toast.success("Logo updated");
      await refreshProfile();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <div>
        <p className="label">Organization logo</p>
        <p className="mb-3 text-xs text-ink-500">Shown in the sidebar in place of "CRM + HRM" for everyone in this organization.</p>
        {logoUrl && (
          <div className="mb-3 flex h-16 items-center rounded-md border border-ink-200 bg-sidebar px-4">
            <img src={logoUrl} alt="Organization logo" className="h-10 max-w-[10rem] object-contain" />
          </div>
        )}
        <FileInput
          label={logoUrl ? "Replace logo" : "Upload logo"}
          purpose="org-logo"
          accept=".png,.jpg,.jpeg,.webp"
          value={logoUrl ? { name: "logo" } : null}
          onUploaded={(result) => apply(result.url)}
        />
      </div>
    </div>
  );
}

function useSettings() {
  const { data, loading, error, refetch } = useApiQuery("/hrm/settings");
  const save = useMutation((client, body) => client.patch("/hrm/settings", body));
  return { data, loading, error, refetch, save };
}

function OperationalSettings({ canWrite }) {
  const { data, loading, error, refetch, save } = useSettings();
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data) setForm({ ...data.settings });
  }, [data]);

  if (loading || !form) return <Loader />;
  if (error) return <Alert tone="error">{error.message}</Alert>;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleDay = (d) => {
    const n = Number(d);
    set("workweek", form.workweek.includes(n) ? form.workweek.filter((x) => x !== n) : [...form.workweek, n].sort());
  };

  async function submit(e) {
    e.preventDefault();
    try {
      await save.mutate({
        workweek: form.workweek,
        standardClockIn: form.standardClockIn,
        lateGraceMinutes: Number(form.lateGraceMinutes),
        standardWorkHours: Number(form.standardWorkHours),
        minBranchCoverage: Number(form.minBranchCoverage),
        payDayOfMonth: Number(form.payDayOfMonth),
        probationMonths: Number(form.probationMonths),
        reviewCyclesPerYear: Number(form.reviewCyclesPerYear),
        contractAlertDays: form.contractAlertDays,
      });
      toast.success("Settings saved");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6">
      <div>
        <p className="label">Working days</p>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(([value, lbl]) => (
            <button
              key={value}
              type="button"
              disabled={!canWrite}
              onClick={() => toggleDay(value)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                form.workweek.includes(Number(value))
                  ? "border-brand-600 bg-brand-600/10 text-brand-700"
                  : "border-ink-200 text-ink-600"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Standard clock-in (HH:mm)" value={form.standardClockIn} disabled={!canWrite} onChange={(e) => set("standardClockIn", e.target.value)} />
        <TextField label="Late grace (minutes)" type="number" min="0" value={form.lateGraceMinutes} disabled={!canWrite} onChange={(e) => set("lateGraceMinutes", e.target.value)} />
        <TextField label="Standard work hours / day" type="number" min="1" value={form.standardWorkHours} disabled={!canWrite} onChange={(e) => set("standardWorkHours", e.target.value)} />
        <TextField label="Minimum branch coverage" type="number" min="0" value={form.minBranchCoverage} disabled={!canWrite} onChange={(e) => set("minBranchCoverage", e.target.value)} hint="Leave approvals are blocked below this floor" />
        <TextField label="Payday (day of month)" type="number" min="1" max="31" value={form.payDayOfMonth} disabled={!canWrite} onChange={(e) => set("payDayOfMonth", e.target.value)} />
        <TextField label="Probation (months)" type="number" min="0" value={form.probationMonths} disabled={!canWrite} onChange={(e) => set("probationMonths", e.target.value)} />
        <TextField label="Performance review cycles / year" type="number" min="1" max="12" value={form.reviewCyclesPerYear} disabled={!canWrite} onChange={(e) => set("reviewCyclesPerYear", e.target.value)} />
        <TextField
          label="Contract expiry alerts (days, comma separated)"
          value={(form.contractAlertDays || []).join(", ")}
          disabled={!canWrite}
          onChange={(e) =>
            set(
              "contractAlertDays",
              e.target.value
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => Number.isFinite(n) && n > 0),
            )
          }
        />
      </div>

      {canWrite && (
        <Button type="submit" loading={save.loading}>
          Save settings
        </Button>
      )}
    </form>
  );
}

function DocumentTypes({ canWrite }) {
  const { data, loading, error, refetch, save } = useSettings();
  const [list, setList] = useState([]);
  const [next, setNext] = useState("");

  useEffect(() => {
    if (data) setList(data.settings.documentTypes || []);
  }, [data]);

  if (loading) return <Loader />;
  if (error) return <Alert tone="error">{error.message}</Alert>;

  async function persist(updated) {
    setList(updated);
    try {
      await save.mutate({ documentTypes: updated });
      toast.success("Document types updated");
      refetch();
    } catch (e) {
      toast.error(e.message);
      refetch();
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      <p className="text-sm text-ink-500">
        These appear as options when uploading employee documents.
      </p>
      <ul className="divide-y divide-ink-100 rounded-md border border-ink-200">
        {list.map((t) => (
          <li key={t} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-ink-800">{t}</span>
            {canWrite && (
              <button
                type="button"
                className="text-xs text-ink-400 hover:text-red-600"
                onClick={() => persist(list.filter((x) => x !== t))}
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="px-3 py-2 text-sm text-ink-400">No document types defined.</li>}
      </ul>
      {canWrite && (
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Add a document type"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <Button
            variant="secondary"
            onClick={() => {
              const v = next.trim();
              if (v && !list.includes(v)) persist([...list, v]);
              setNext("");
            }}
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationSettings({ canWrite }) {
  const { data, loading, error, refetch, save } = useSettings();
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    if (data) setPrefs({ ...data.settings.notifications });
  }, [data]);

  if (loading || !prefs) return <Loader />;
  if (error) return <Alert tone="error">{error.message}</Alert>;

  const rows = [
    ["leaveWorkflow", "Leave workflow", "Submitted, approved, rejected, clarification"],
    ["payslipReady", "Payslip ready", "When payroll is finalised"],
    ["contractExpiry", "Contract expiry", "At the configured alert thresholds"],
    ["reviewDue", "Performance review due", "When a review reaches its due date"],
    ["targetDeadline", "Target deadline", "As an assigned target's deadline approaches"],
  ];

  async function toggle(key) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await save.mutate({ notifications: updated });
      refetch();
    } catch (e) {
      toast.error(e.message);
      refetch();
    }
  }

  return (
    <div className="max-w-xl divide-y divide-ink-100 rounded-md border border-ink-200">
      {rows.map(([key, title, desc]) => (
        <div key={key} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium text-ink-900">{title}</p>
            <p className="text-xs text-ink-500">{desc}</p>
          </div>
          <button
            type="button"
            disabled={!canWrite}
            onClick={() => toggle(key)}
            className={`relative h-5 w-9 rounded-full transition-colors ${prefs[key] ? "bg-brand-600" : "bg-ink-300"}`}
            aria-pressed={prefs[key]}
          >
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${prefs[key] ? "left-4" : "left-0.5"}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

function Loader() {
  return (
    <div className="flex justify-center py-16 text-ink-400">
      <Spinner size={22} />
    </div>
  );
}
