import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { dateTime, dateShort, fromNow } from "../../utils/format.js";

const PRIORITY_TONE = { high: "red", normal: "neutral", low: "slate" };
const STATUS_TONE = { open: "blue", in_progress: "amber", done: "green", cancelled: "slate" };
const label = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function Tasks() {
  const canWrite = useAuth((s) => s.can("task:write"));
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ search: "", queue: "mine", status: "", priority: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(params.get("open") || null);
  const search = useDebouncedValue(filters.search);

  useEffect(() => {
    if (params.get("open")) {
      setDetailId(params.get("open"));
      params.delete("open");
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useApiQuery("/crm/tasks/stats");
  const query = useMemo(() => {
    const q = { page, limit: 25, search: search || undefined, priority: filters.priority || undefined, sort: "due" };
    if (filters.status) q.status = filters.status;
    else if (filters.queue === "mine") q.mine = "true";
    else if (filters.queue === "overdue") q.overdue = "true";
    else if (filters.queue === "today") q.dueToday = "true";
    else if (filters.queue === "unassigned") q.open = "true";
    return q;
  }, [page, search, filters]);
  const list = useApiQuery("/crm/tasks", { params: query });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const s = stats.data;

  return (
    <>
      <PageHeader title="Tasks" actions={canWrite && <Button onClick={() => setCreating(true)}>New task</Button>} />

      {s && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
          <Tile label="My open" value={s.mineOpen} active={filters.queue === "mine" && !filters.status} onClick={() => update({ queue: "mine", status: "" })} />
          <Tile label="Due today" value={s.dueToday} tone={s.dueToday ? "amber" : undefined} active={filters.queue === "today"} onClick={() => update({ queue: "today", status: "" })} />
          <Tile label="Overdue" value={s.overdue} tone={s.overdue ? "red" : undefined} active={filters.queue === "overdue"} onClick={() => update({ queue: "overdue", status: "" })} />
          <Tile label="Unassigned" value={s.unassigned} active={filters.queue === "unassigned"} onClick={() => update({ queue: "unassigned", status: "" })} />
        </div>
      )}

      <FilterBar active={filters.search || filters.status || filters.priority} onClear={() => update({ search: "", status: "", priority: "" })}>
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Title or reference" />
        <Select className="lg:w-36" placeholder="Any status" options={["open", "in_progress", "done", "cancelled"].map((v) => ({ value: v, label: label(v) }))} value={filters.status} onChange={(e) => update({ status: e.target.value })} />
        <Select className="lg:w-32" placeholder="Any priority" options={["high", "normal", "low"]} value={filters.priority} onChange={(e) => update({ priority: e.target.value })} />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No tasks", description: "Nothing in this queue." }}
        onRowClick={(t) => setDetailId(t.id)}
        columns={[
          {
            key: "title",
            header: "Task",
            primary: true,
            render: (t) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{t.title}</p>
                <p className="truncate text-xs text-ink-500">
                  {t.reference} · {label(t.type)}
                  {t.relatedLabel ? ` · ${t.relatedLabel}` : ""}
                </p>
              </div>
            ),
          },
          { key: "assignee", header: "Assignee", secondary: true, render: (t) => t.assigneeName || "Unassigned" },
          { key: "priority", header: "Priority", render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
          {
            key: "due",
            header: "Due",
            render: (t) =>
              t.dueAt ? (
                <span className={t.status !== "done" && new Date(t.dueAt) < new Date() ? "text-red-600" : ""}>{dateShort(t.dueAt)}</span>
              ) : (
                "—"
              ),
          },
          { key: "status", header: "Status", render: (t) => <Badge tone={STATUS_TONE[t.status]}>{label(t.status)}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && <TaskForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); list.refetch(); stats.refetch(); }} />}
      {detailId && (
        <TaskDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => { list.refetch(); stats.refetch(); }}
        />
      )}
    </>
  );
}

function TaskForm({ value, onClose, onSaved }) {
  const isNew = !value;
  const agents = useApiQuery("/hrm/employees", { params: { limit: 300, status: "active", sort: "lastName" } });
  const [form, setForm] = useState({
    title: value?.title || "",
    description: value?.description || "",
    type: value?.type || "follow_up",
    priority: value?.priority || "normal",
    assignee: value?.assignee || "",
    dueAt: value?.dueAt ? value.dueAt.slice(0, 16) : "",
    reminderAt: value?.reminderAt ? value.reminderAt.slice(0, 16) : "",
  });
  const { mutate, loading, error } = useMutation((c, b) => (isNew ? c.post("/crm/tasks", b) : c.patch(`/crm/tasks/${value.id}`, b)));
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    try {
      const t = await mutate({
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        priority: form.priority,
        assignee: form.assignee || undefined,
        dueAt: form.dueAt || undefined,
        reminderAt: form.reminderAt || undefined,
      });
      toast.success(isNew ? `Task ${t.reference} created` : "Task updated");
      onSaved(t);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title={isNew ? "New task" : "Edit task"} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button form="task-form" type="submit" loading={loading}>{isNew ? "Create" : "Save"}</Button></>}>
      <form id="task-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Title" required value={form.title} error={errs.title} onChange={set("title")} />
        <Textarea label="Description" rows={3} value={form.description} onChange={set("description")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Type" options={["follow_up", "call", "email", "visit", "admin", "other"].map((v) => ({ value: v, label: v.replace("_", " ") }))} value={form.type} onChange={set("type")} />
          <Select label="Priority" options={["low", "normal", "high"]} value={form.priority} onChange={set("priority")} />
          <Select
            label="Assign to"
            placeholder="Me"
            options={(agents.data || []).filter((a) => a.user).map((a) => ({ value: a.user, label: `${a.firstName} ${a.lastName}` }))}
            value={form.assignee}
            onChange={set("assignee")}
          />
          <div />
          <TextField label="Due" type="datetime-local" value={form.dueAt} onChange={set("dueAt")} />
          <TextField label="Reminder" type="datetime-local" value={form.reminderAt} onChange={set("reminderAt")} />
        </div>
      </form>
    </Modal>
  );
}

function TaskDetail({ id, onClose, onChanged }) {
  const { data: t, loading, error, refetch } = useApiQuery(`/crm/tasks/${id}`);
  const can = useAuth((s) => s.can);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const M = {
    status: useMutation((c, b) => c.patch(`/crm/tasks/${id}`, b)),
    complete: useMutation((c, b) => c.post(`/crm/tasks/${id}/complete`, b)),
    comment: useMutation((c, b) => c.post(`/crm/tasks/${id}/comments`, b)),
  };

  async function run(m, body, msg) {
    try {
      await m.mutate(body);
      toast.success(msg || "Saved");
      refetch();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Drawer open onClose={onClose} size="lg" title={t ? t.title : "Task"} description={t?.reference}>
      {loading && <div className="flex justify-center py-10 text-ink-400"><Spinner size={22} /></div>}
      {error && <Alert tone="error">{error.message}</Alert>}
      {t && !editing && (
        <div className="space-y-5 text-sm">
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[t.status]}>{label(t.status)}</Badge>
            <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
            <Badge tone="slate">{label(t.type)}</Badge>
          </div>
          {t.description && <p className="whitespace-pre-wrap text-ink-700">{t.description}</p>}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <D label="Assignee" v={t.assigneeName || "Unassigned"} />
            <D label="Due" v={t.dueAt ? dateTime(t.dueAt) : "—"} />
            <D label="Created" v={fromNow(t.createdAt)} />
            {t.completedAt && <D label="Completed" v={dateTime(t.completedAt)} />}
            {t.relatedLabel && <D label="Related to" v={`${t.relatedType}: ${t.relatedLabel}`} />}
          </dl>
          {t.outcome && (
            <div>
              <p className="label">Outcome</p>
              <p className="text-ink-700">{t.outcome}</p>
            </div>
          )}

          {can("task:write") && t.status !== "done" && t.status !== "cancelled" && (
            <div className="flex flex-wrap gap-2">
              {t.status === "open" && <Button variant="secondary" onClick={() => run(M.status, { status: "in_progress" }, "Marked in progress")}>Start</Button>}
              <Button onClick={() => run(M.complete, {}, "Task completed")}>Mark done</Button>
              <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
              <Button variant="danger" onClick={() => run(M.status, { status: "cancelled" }, "Task cancelled")}>Cancel</Button>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">Comments</p>
            <ul className="space-y-1.5">
              {(t.comments || []).map((c) => (
                <li key={c._id || c.at} className="rounded-md bg-ink-50 px-2.5 py-1.5">
                  <span className="text-ink-700">{c.body}</span>
                  <span className="ml-2 text-2xs text-ink-400">{c.byName} · {fromNow(c.at)}</span>
                </li>
              ))}
            </ul>
            {can("task:write") && (
              <div className="mt-2 flex gap-2">
                <input className="input" placeholder="Add a comment" value={comment} onChange={(e) => setComment(e.target.value)} />
                <Button
                  variant="secondary"
                  loading={M.comment.loading}
                  onClick={async () => {
                    if (!comment.trim()) return;
                    await run(M.comment, { body: comment }, "Comment added");
                    setComment("");
                  }}
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {t && editing && (
        <TaskForm
          value={t}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refetch();
            onChanged?.();
          }}
        />
      )}
    </Drawer>
  );
}

function Tile({ label, value, tone, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`bg-white px-3 py-2.5 text-left hover:bg-ink-50 ${active ? "ring-1 ring-inset ring-brand-600" : ""}`}>
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>{value ?? 0}</p>
    </button>
  );
}
function D({ label, v }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{v}</dd>
    </div>
  );
}
