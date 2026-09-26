import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import FilterBar from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { performance as api } from "../../services/hrm.js";
import { dateShort, fromNow } from "../../utils/format.js";

const STATUS_LABEL = {
  draft: "Draft",
  self_review: "Self review",
  manager_review: "Manager review",
  completed: "Completed",
  acknowledged: "Acknowledged",
};

export default function Performance() {
  const can = useAuth((s) => s.can);
  const canManage = can("performance:write") || can("performance:review");
  const [tab, setTab] = useState(canManage ? "dashboard" : "mine");

  const tabs = [
    canManage && { key: "dashboard", label: "Dashboard" },
    { key: "reviews", label: canManage ? "All reviews" : "My reviews" },
    canManage && { key: "kpis", label: "KPI library" },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Performance" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "dashboard" && <Dashboard />}
      {(tab === "reviews" || tab === "mine") && <Reviews scope={canManage ? undefined : "mine"} canManage={canManage} />}
      {tab === "kpis" && <KpiLibrary />}
    </>
  );
}

function Dashboard() {
  const { data, loading, error } = useApiQuery("/hrm/performance/dashboard");
  if (loading) return <Loader />;
  if (error) return <EmptyState title="Unavailable" description={error.message} />;
  const d = data;
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-5">
        <Tile label="Reviews due" value={d.reviewsDue} />
        <Tile label="Completed" value={d.reviewsCompleted} />
        <Tile label="Overdue" value={d.overdue} tone={d.overdue ? "red" : undefined} />
        <Tile label="Avg score" value={d.averageScore != null ? `${d.averageScore}/5` : "—"} />
        <Tile label="Total" value={d.total} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Department performance</h2>
          {d.byDepartment.length === 0 ? (
            <p className="text-sm text-ink-500">No completed reviews yet.</p>
          ) : (
            <ul className="space-y-2">
              {d.byDepartment.map((row) => (
                <li key={row.department} className="text-sm">
                  <div className="mb-0.5 flex justify-between">
                    <span className="text-ink-700">{row.department}</span>
                    <span className="text-ink-500">
                      {row.avgScore}/5 · {row.count}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-100">
                    <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(row.avgScore / 5) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Upcoming reviews</h2>
          {d.upcoming.length === 0 ? (
            <p className="text-sm text-ink-500">Nothing due soon.</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {d.upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span className="text-ink-800">
                    {r.employee?.firstName} {r.employee?.lastName} · {r.cycle}
                  </span>
                  <span className="text-xs text-ink-500">{r.dueDate ? dateShort(r.dueDate) : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function Reviews({ scope, canManage }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ status: "", cycle: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const params = useMemo(
    () => ({ page, limit: 20, scope, status: filters.status || undefined, cycle: filters.cycle || undefined }),
    [page, scope, filters],
  );
  const list = useApiQuery("/hrm/performance/reviews", { params });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">{scope === "mine" ? "My reviews" : "All reviews"}</h2>
        {canManage && <Button onClick={() => setCreating(true)}>New review</Button>}
      </div>

      <FilterBar
        active={filters.status || filters.cycle}
        onClear={() => {
          setFilters({ status: "", cycle: "" });
          setPage(1);
        }}
      >
        <Select
          className="lg:w-44"
          placeholder="Any status"
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: e.target.value }));
            setPage(1);
          }}
        />
        <TextField
          className="lg:w-40"
          placeholder="Cycle e.g. Q3 2026"
          value={filters.cycle}
          onChange={(e) => {
            setFilters((f) => ({ ...f, cycle: e.target.value }));
            setPage(1);
          }}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No reviews", description: canManage ? "Create a review cycle to begin." : "You have no performance reviews." }}
        onRowClick={(r) => navigate(`/hrm/performance/${r.id}`)}
        columns={[
          {
            key: "employee",
            header: "Employee",
            primary: true,
            render: (r) => `${r.employee?.firstName} ${r.employee?.lastName}`,
          },
          { key: "cycle", header: "Cycle", secondary: true, render: (r) => r.cycle },
          { key: "type", header: "Type", render: (r) => r.type },
          { key: "reviewer", header: "Reviewer", render: (r) => (r.reviewer ? `${r.reviewer.firstName} ${r.reviewer.lastName}` : "—") },
          { key: "score", header: "Score", align: "right", render: (r) => (r.overallScore ? `${r.overallScore}/5` : "—") },
          { key: "status", header: "Status", render: (r) => <Badge status={r.status}>{STATUS_LABEL[r.status]}</Badge> },
          { key: "due", header: "Due", render: (r) => (r.dueDate ? dateShort(r.dueDate) : "—") },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <CreateReview
          onClose={() => setCreating(false)}
          onSaved={(review) => {
            setCreating(false);
            navigate(`/hrm/performance/${review.id}`);
          }}
        />
      )}
    </>
  );
}

function CreateReview({ onClose, onSaved }) {
  const employees = useApiQuery("/hrm/employees", { params: { limit: 300, status: "active", sort: "lastName" } });
  const kpis = useApiQuery("/hrm/performance/kpis", { params: { active: "true" } });
  const [form, setForm] = useState({
    employee: "",
    cycle: `Q${Math.floor(new Date().getMonth() / 3) + 1} ${new Date().getFullYear()}`,
    type: "quarterly",
    dueDate: "",
    kpis: [],
  });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/performance/reviews", body));
  const errs = fieldErrors(error);

  function toggleKpi(k) {
    setForm((f) => {
      const has = f.kpis.find((x) => x.kpi === k.id);
      return {
        ...f,
        kpis: has ? f.kpis.filter((x) => x.kpi !== k.id) : [...f.kpis, { kpi: k.id, name: k.name, weight: 1 }],
      };
    });
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const review = await mutate({
        employee: form.employee,
        cycle: form.cycle,
        type: form.type,
        dueDate: form.dueDate || undefined,
        kpis: form.kpis,
      });
      toast.success("Review created");
      onSaved(review);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="New performance review"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="review-form" type="submit" loading={loading}>
            Create
          </Button>
        </>
      }
    >
      <form id="review-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <Select
          label="Employee"
          required
          placeholder="Select employee"
          options={(employees.data || []).map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName} — ${e.employeeId}` }))}
          value={form.employee}
          error={errs.employee}
          onChange={(e) => setForm((f) => ({ ...f, employee: e.target.value }))}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Cycle" required value={form.cycle} error={errs.cycle} onChange={(e) => setForm((f) => ({ ...f, cycle: e.target.value }))} />
          <Select
            label="Type"
            options={["quarterly", "annual", "probation", "project"]}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          />
          <TextField label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
        </div>
        <div>
          <p className="label">KPIs to assess</p>
          <div className="flex flex-wrap gap-2">
            {(kpis.data || []).map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => toggleKpi(k)}
                className={`rounded-full border px-2.5 py-1 text-xs ${
                  form.kpis.find((x) => x.kpi === k.id)
                    ? "border-brand-600 bg-brand-600/10 text-brand-700"
                    : "border-ink-200 text-ink-600"
                }`}
              >
                {k.name}
              </button>
            ))}
            {(kpis.data || []).length === 0 && <p className="text-xs text-ink-500">Add KPIs in the KPI library first.</p>}
          </div>
        </div>
      </form>
    </Modal>
  );
}

function KpiLibrary() {
  const session = useAuth((s) => s.session);
  const canDelete = ["Super Admin", "Group Admin", "HR Manager"].includes(session?.role);
  const list = useApiQuery("/hrm/performance/kpis");
  const [creating, setCreating] = useState(false);
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/performance/kpis", body));
  const toggleActive = useMutation((client, { id, active }) => client.patch(`/hrm/performance/kpis/${id}`, { active }));
  const removeKpi = useMutation((client, id) => client.delete(`/hrm/performance/kpis/${id}`));
  const [form, setForm] = useState({ name: "", category: "", unit: "", direction: "higher_better" });
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    try {
      await mutate(form);
      toast.success("KPI added");
      setCreating(false);
      setForm({ name: "", category: "", unit: "", direction: "higher_better" });
      list.refetch();
    } catch {
      /* inline */
    }
  }

  async function handleToggle(kpi) {
    try {
      await toggleActive.mutate({ id: kpi.id, active: !kpi.active });
      toast.success(`${kpi.name} ${kpi.active ? "deactivated" : "activated"}`);
      list.refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(kpi) {
    if (!confirm(`Delete KPI "${kpi.name}"? This only works if no target or review uses it.`)) return;
    try {
      await removeKpi.mutate(kpi.id);
      toast.success(`${kpi.name} deleted`);
      list.refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">KPI library</h2>
        <Button onClick={() => setCreating(true)}>New KPI</Button>
      </div>
      <DataTable
        loading={list.loading}
        error={list.error}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No KPIs", description: "Define the metrics used across reviews and targets." }}
        columns={[
          { key: "name", header: "Name", primary: true, render: (k) => k.name },
          { key: "category", header: "Category", secondary: true, render: (k) => k.category || "—" },
          { key: "unit", header: "Unit", render: (k) => k.unit || "—" },
          { key: "direction", header: "Better when", render: (k) => (k.direction === "higher_better" ? "Higher" : "Lower") },
          { key: "active", header: "Status", render: (k) => <Badge status={k.active ? "active" : "inactive"} /> },
        ]}
        rowActions={(kpi) => (
          <div className="flex justify-end gap-3">
            <button type="button" className="text-xs font-medium text-ink-500 hover:text-ink-700" onClick={() => handleToggle(kpi)}>
              {kpi.active ? "Deactivate" : "Activate"}
            </button>
            {canDelete && (
              <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700" onClick={() => handleDelete(kpi)}>
                Delete
              </button>
            )}
          </div>
        )}
      />
      {creating && (
        <Modal
          open
          onClose={() => setCreating(false)}
          title="New KPI"
          footer={
            <>
              <Button variant="secondary" onClick={() => setCreating(false)}>
                Cancel
              </Button>
              <Button form="kpi-form" type="submit" loading={loading}>
                Create
              </Button>
            </>
          }
        >
          <form id="kpi-form" onSubmit={submit} className="space-y-4">
            {error && !error.details && <Alert tone="error">{error.message}</Alert>}
            <TextField label="Name" required value={form.name} error={errs.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
              <TextField label="Unit" placeholder="%, NGN, count" value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
            <Select
              label="Better when"
              options={[
                { value: "higher_better", label: "Higher is better" },
                { value: "lower_better", label: "Lower is better" },
              ]}
              value={form.direction}
              onChange={(e) => setForm((f) => ({ ...f, direction: e.target.value }))}
            />
          </form>
        </Modal>
      )}
    </>
  );
}

function Tile({ label, value, tone }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone === "red" ? "text-red-600" : "text-ink-900"}`}>{value}</p>
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

/* ---------------------------------------------------------------------- */

export function PerformanceReviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const { data: review, loading, error, refetch } = useApiQuery(`/hrm/performance/reviews/${id}`);

  const [kpis, setKpis] = useState(null);
  const [managerComments, setManagerComments] = useState("");
  const [employeeComments, setEmployeeComments] = useState("");
  const [developmentPlan, setDevelopmentPlan] = useState("");

  const save = useMutation((client, body) => client.patch(`/hrm/performance/reviews/${id}`, body));
  const transition = useMutation((client, action) =>
    client.post(`/hrm/performance/reviews/${id}/transition`, { action }),
  );

  if (loading) return <Loader />;
  if (error) {
    return (
      <EmptyState
        title="Review not found"
        description={error.message}
        action={<Button variant="secondary" onClick={() => navigate("/hrm/performance")}>Back</Button>}
      />
    );
  }

  const rows = kpis ?? review.kpis;
  const isReviewer = can("performance:review") || can("performance:write");

  function setRow(i, patch) {
    setKpis((cur) => (cur ?? review.kpis).map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function persist() {
    try {
      await save.mutate({
        kpis: rows.map((r) => ({
          kpi: r.kpi?._id || r.kpi,
          name: r.name,
          weight: r.weight,
          target: r.target,
          actual: r.actual,
          score: r.score ? Number(r.score) : undefined,
          comment: r.comment,
        })),
        managerComments: managerComments || review.managerComments,
        developmentPlan: developmentPlan || review.developmentPlan,
        employeeComments: employeeComments || review.employeeComments,
      });
      toast.success("Saved");
      setKpis(null);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function act(action, label) {
    try {
      await transition.mutate(action);
      toast.success(label);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {review.employee?.firstName} {review.employee?.lastName}
            <Badge status={review.status}>{STATUS_LABEL[review.status]}</Badge>
          </span>
        }
        description={`${review.cycle} · ${review.type}${review.overallScore ? ` · ${review.overallScore}/5 ${review.rating || ""}` : ""}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/hrm/performance")}>
              Back
            </Button>
            {isReviewer && review.status === "draft" && (
              <Button onClick={() => act("open_self_review", "Self review opened")}>Open self review</Button>
            )}
            {isReviewer && review.status === "manager_review" && (
              <Button onClick={() => act("complete", "Review completed")}>Complete review</Button>
            )}
          </>
        }
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left text-2xs uppercase tracking-wide text-ink-500">
              <th className="px-4 py-2.5">KPI</th>
              <th className="px-4 py-2.5">Weight</th>
              <th className="px-4 py-2.5">Target</th>
              <th className="px-4 py-2.5">Actual</th>
              <th className="px-4 py-2.5">Score</th>
              <th className="px-4 py-2.5">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-4 py-2 font-medium text-ink-800">{r.name}</td>
                <td className="px-4 py-2">{r.weight}</td>
                <td className="px-4 py-2">{r.target || "—"}</td>
                <td className="px-4 py-2">
                  {isReviewer ? (
                    <input className="input !py-1" value={r.actual || ""} onChange={(e) => setRow(i, { actual: e.target.value })} />
                  ) : (
                    r.actual || "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  {isReviewer ? (
                    <select className="input !py-1 !w-16" value={r.score || ""} onChange={(e) => setRow(i, { score: e.target.value })}>
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  ) : (
                    r.score || "—"
                  )}
                </td>
                <td className="px-4 py-2">
                  {isReviewer ? (
                    <input className="input !py-1" value={r.comment || ""} onChange={(e) => setRow(i, { comment: e.target.value })} />
                  ) : (
                    r.comment || "—"
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-400">
                  No KPIs on this review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <p className="label">Manager comments</p>
          {isReviewer ? (
            <Textarea rows={4} defaultValue={review.managerComments} onChange={(e) => setManagerComments(e.target.value)} />
          ) : (
            <p className="text-sm text-ink-700">{review.managerComments || "—"}</p>
          )}
        </div>
        <div className="card p-4">
          <p className="label">Development plan</p>
          {isReviewer ? (
            <Textarea rows={4} defaultValue={review.developmentPlan} onChange={(e) => setDevelopmentPlan(e.target.value)} />
          ) : (
            <p className="text-sm text-ink-700">{review.developmentPlan || "—"}</p>
          )}
        </div>
        <div className="card p-4 lg:col-span-2">
          <p className="label">Employee comments</p>
          {review.status === "self_review" || review.status === "manager_review" ? (
            <Textarea rows={3} defaultValue={review.employeeComments} onChange={(e) => setEmployeeComments(e.target.value)} />
          ) : (
            <p className="text-sm text-ink-700">{review.employeeComments || "—"}</p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(isReviewer || ["self_review", "manager_review"].includes(review.status)) && (
          <Button loading={save.loading} onClick={persist}>
            Save
          </Button>
        )}
        {review.status === "self_review" && (
          <Button variant="secondary" onClick={() => act("submit_self_review", "Self review submitted")}>
            Submit self review
          </Button>
        )}
        {review.status === "completed" && (
          <Button variant="secondary" onClick={() => act("acknowledge", "Review acknowledged")}>
            Acknowledge
          </Button>
        )}
      </div>
    </>
  );
}
