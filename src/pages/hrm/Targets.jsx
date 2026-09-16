import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Drawer from "../../components/ui/Drawer.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import FilterBar from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { dateShort, fromNow, number } from "../../utils/format.js";

const STATUS_TONE = {
  not_started: "slate",
  in_progress: "blue",
  at_risk: "amber",
  achieved: "green",
  missed: "red",
  cancelled: "slate",
};
const statusLabel = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function Targets() {
  const can = useAuth((s) => s.can);
  const canWrite = can("target:write");

  const [filters, setFilters] = useState({ status: "", scope: canWrite ? "" : "mine" });
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [creating, setCreating] = useState(false);

  const summary = useApiQuery("/hrm/targets/summary");
  const params = useMemo(
    () => ({ page, limit: 20, status: filters.status || undefined, scope: filters.scope || undefined }),
    [page, filters],
  );
  const list = useApiQuery("/hrm/targets", { params });
  const counts = summary.data?.counts || {};

  return (
    <>
      <PageHeader
        title="Targets & KPIs"
        actions={canWrite && <Button onClick={() => setCreating(true)}>New target</Button>}
      />

      <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-6">
        {["not_started", "in_progress", "at_risk", "achieved", "missed", "cancelled"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setFilters((f) => ({ ...f, status: f.status === k ? "" : k }));
              setPage(1);
            }}
            className={`bg-white px-3 py-2.5 text-left transition-colors hover:bg-ink-50 ${
              filters.status === k ? "ring-1 ring-inset ring-brand-600" : ""
            }`}
          >
            <p className="text-2xs uppercase tracking-wide text-ink-500">{statusLabel(k)}</p>
            <p className="mt-0.5 text-lg font-semibold text-ink-900">{counts[k] || 0}</p>
          </button>
        ))}
      </div>

      {canWrite && (
        <FilterBar active={filters.scope === "mine"} onClear={() => setFilters((f) => ({ ...f, scope: "" }))}>
          <Select
            className="lg:w-44"
            options={[
              { value: "", label: "All targets" },
              { value: "mine", label: "Assigned to me" },
            ]}
            value={filters.scope}
            onChange={(e) => {
              setFilters((f) => ({ ...f, scope: e.target.value }));
              setPage(1);
            }}
          />
        </FilterBar>
      )}

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No targets", description: canWrite ? "Create a target to start tracking." : "You have no assigned targets." }}
        onRowClick={(t) => setDetailId(t.id)}
        columns={[
          { key: "title", header: "Target", primary: true, render: (t) => t.title },
          {
            key: "assignee",
            header: "Assigned to",
            secondary: true,
            render: (t) =>
              t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : t.department?.name || "—",
          },
          {
            key: "progress",
            header: "Progress",
            render: (t) => (
              <div className="min-w-[8rem]">
                <div className="mb-0.5 flex justify-between text-2xs text-ink-500">
                  <span>
                    {number(t.currentValue)}/{number(t.targetValue)} {t.metricUnit}
                  </span>
                  <span>{t.progressPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-100">
                  <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${t.progressPercent}%` }} />
                </div>
              </div>
            ),
          },
          { key: "deadline", header: "Deadline", render: (t) => dateShort(t.deadline) },
          {
            key: "status",
            header: "Status",
            render: (t) => <Badge tone={STATUS_TONE[t.status]}>{statusLabel(t.status)}</Badge>,
          },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <TargetForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            list.refetch();
            summary.refetch();
          }}
        />
      )}
      {detailId && (
        <TargetDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            list.refetch();
            summary.refetch();
          }}
        />
      )}
    </>
  );
}

function TargetForm({ onClose, onSaved }) {
  const employees = useApiQuery("/hrm/employees", { params: { limit: 300, status: "active", sort: "lastName" } });
  const departments = useApiQuery("/hrm/departments", { params: { limit: 100, status: "active" } });
  const kpis = useApiQuery("/hrm/performance/kpis", { params: { active: "true" } });

  const [form, setForm] = useState({
    assignType: "employee",
    employee: "",
    department: "",
    title: "",
    description: "",
    kpi: "",
    metricUnit: "",
    baselineValue: 0,
    targetValue: "",
    startDate: new Date().toISOString().slice(0, 10),
    deadline: "",
    weight: 1,
  });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/targets", body));
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const body = {
      title: form.title,
      description: form.description || undefined,
      metricUnit: form.metricUnit || undefined,
      baselineValue: Number(form.baselineValue) || 0,
      targetValue: Number(form.targetValue),
      startDate: form.startDate,
      deadline: form.deadline,
      weight: Number(form.weight) || 1,
    };
    if (form.assignType === "employee" && form.employee) body.employee = form.employee;
    if (form.assignType === "department" && form.department) body.department = form.department;
    if (form.kpi) body.kpi = form.kpi;
    try {
      await mutate(body);
      toast.success("Target created");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="New target"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="target-form" type="submit" loading={loading}>
            Create
          </Button>
        </>
      }
    >
      <form id="target-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Title" required value={form.title} error={errs.title} onChange={set("title")} />
        <Textarea label="Description" rows={2} value={form.description} onChange={set("description")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Assign to"
            options={[
              { value: "employee", label: "An employee" },
              { value: "department", label: "A department" },
            ]}
            value={form.assignType}
            onChange={set("assignType")}
          />
          {form.assignType === "employee" ? (
            <Select
              label="Employee"
              placeholder="Select employee"
              options={(employees.data || []).map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))}
              value={form.employee}
              onChange={set("employee")}
            />
          ) : (
            <Select
              label="Department"
              placeholder="Select department"
              options={(departments.data || []).map((d) => ({ value: d.id, label: d.name }))}
              value={form.department}
              onChange={set("department")}
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Select
            label="KPI (optional)"
            placeholder="No KPI"
            options={(kpis.data || []).map((k) => ({ value: k.id, label: k.name }))}
            value={form.kpi}
            onChange={set("kpi")}
          />
          <TextField label="Unit" placeholder="e.g. deliveries, %" value={form.metricUnit} onChange={set("metricUnit")} />
          <TextField label="Weight" type="number" min="0" max="100" value={form.weight} onChange={set("weight")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Baseline value" type="number" value={form.baselineValue} onChange={set("baselineValue")} />
          <TextField label="Target value" type="number" required value={form.targetValue} error={errs.targetValue} onChange={set("targetValue")} />
          <TextField label="Start date" type="date" required value={form.startDate} onChange={set("startDate")} />
          <TextField label="Deadline" type="date" required value={form.deadline} error={errs.deadline} onChange={set("deadline")} />
        </div>
      </form>
    </Modal>
  );
}

function TargetDetail({ id, onClose, onChanged }) {
  const { data: t, loading, error, refetch } = useApiQuery(`/hrm/targets/${id}`);
  const can = useAuth((s) => s.can);
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const progress = useMutation((client, body) => client.post(`/hrm/targets/${id}/progress`, body));
  const cancelM = useMutation((client) => client.patch(`/hrm/targets/${id}`, { status: "cancelled" }));

  async function addProgress() {
    if (value === "") return;
    try {
      await progress.mutate({ value: Number(value), note: note || undefined });
      toast.success("Progress updated");
      setValue("");
      setNote("");
      refetch();
      onChanged();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Drawer open onClose={onClose} size="lg" title={t?.title || "Target"} description={t?.reference}>
      {loading && (
        <div className="flex justify-center py-10 text-ink-400">
          <Spinner size={22} />
        </div>
      )}
      {error && <Alert tone="error">{error.message}</Alert>}
      {t && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[t.status]}>{statusLabel(t.status)}</Badge>
            {t.kpiName && <Badge tone="neutral">{t.kpiName}</Badge>}
          </div>

          <div>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-ink-600">
                {number(t.currentValue)} / {number(t.targetValue)} {t.metricUnit}
              </span>
              <span className="font-medium text-ink-900">{t.progressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-ink-100">
              <div className="h-2 rounded-full bg-brand-600" style={{ width: `${t.progressPercent}%` }} />
            </div>
          </div>

          {t.description && <p className="text-sm text-ink-700">{t.description}</p>}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Detail label="Assigned to" value={t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : t.department?.name || "—"} />
            <Detail label="Start" value={dateShort(t.startDate)} />
            <Detail label="Deadline" value={dateShort(t.deadline)} />
            <Detail label="Weight" value={t.weight} />
          </dl>

          {can("target:update_progress") && !["achieved", "cancelled", "missed"].includes(t.status) && (
            <div className="rounded-md border border-ink-200 p-3">
              <p className="mb-2 text-sm font-medium text-ink-900">Update progress</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  className="input sm:w-32"
                  type="number"
                  placeholder="Current value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
                <input className="input flex-1" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button loading={progress.loading} onClick={addProgress}>
                  Save
                </Button>
              </div>
            </div>
          )}

          {t.progressUpdates?.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink-900">History</p>
              <ul className="space-y-1.5 text-sm">
                {[...t.progressUpdates].reverse().map((u, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="text-ink-800">
                      {number(u.value)} {t.metricUnit}
                      {u.note ? ` — ${u.note}` : ""}
                    </span>
                    <span className="shrink-0 text-xs text-ink-400">
                      {u.byName} · {fromNow(u.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {can("target:write") && !["cancelled", "achieved"].includes(t.status) && (
            <div className="border-t border-ink-200 pt-3">
              <Button
                variant="secondary"
                loading={cancelM.loading}
                onClick={async () => {
                  await cancelM.mutate();
                  toast.success("Target cancelled");
                  refetch();
                  onChanged();
                }}
              >
                Cancel target
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value}</dd>
    </div>
  );
}
