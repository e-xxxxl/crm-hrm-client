import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import Select from "../../components/ui/Select.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuth } from "../../store/auth.js";
import TicketForm from "../../components/crm/TicketForm.jsx";
import { fromNow, dateTime } from "../../utils/format.js";

const PRIORITY_TONE = { urgent: "red", high: "amber", normal: "neutral", low: "slate" };
const STATUS_TONE = {
  open: "blue",
  pending: "amber",
  on_hold: "slate",
  resolved: "green",
  closed: "slate",
  reopened: "amber",
};
const label = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function TicketList() {
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("ticket:write"));
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", queue: "open" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebouncedValue(filters.search);

  const stats = useApiQuery("/crm/tickets/stats");

  const params = useMemo(() => {
    const p = { page, limit: 25, search: search || undefined, priority: filters.priority || undefined };
    if (filters.status) p.status = filters.status;
    else if (filters.queue === "open") p.open = "true";
    else if (filters.queue === "mine") p.mine = "true";
    else if (filters.queue === "unassigned") p.unassigned = "true";
    else if (filters.queue === "overdue") p.overdue = "true";
    return p;
  }, [page, search, filters]);

  const list = useApiQuery("/crm/tickets", { params });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const s = stats.data;

  return (
    <>
      <PageHeader
        title="Tickets"
        actions={canWrite && <Button onClick={() => setCreating(true)}>New ticket</Button>}
      />

      {s && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4 lg:grid-cols-6">
          <Tile label="Open" value={s.open} active={filters.queue === "open" && !filters.status} onClick={() => update({ queue: "open", status: "" })} />
          <Tile label="Assigned to me" value={s.assignedToMe} active={filters.queue === "mine"} onClick={() => update({ queue: "mine", status: "" })} />
          <Tile label="Unassigned" value={s.unassigned} active={filters.queue === "unassigned"} onClick={() => update({ queue: "unassigned", status: "" })} />
          <Tile label="Overdue" value={s.overdue} tone={s.overdue ? "red" : undefined} active={filters.queue === "overdue"} onClick={() => update({ queue: "overdue", status: "" })} />
          <Tile label="Urgent" value={s.byPriority?.urgent || 0} tone={s.byPriority?.urgent ? "amber" : undefined} />
          <Tile label="Resolved" value={s.byStatus?.resolved || 0} />
        </div>
      )}

      <FilterBar
        active={filters.search || filters.status || filters.priority}
        onClear={() => update({ search: "", status: "", priority: "" })}
      >
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Ticket no, subject, customer" />
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={["open", "pending", "on_hold", "resolved", "closed", "reopened"].map((v) => ({ value: v, label: label(v) }))}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
        />
        <Select
          className="lg:w-36"
          placeholder="Any priority"
          options={["urgent", "high", "normal", "low"]}
          value={filters.priority}
          onChange={(e) => update({ priority: e.target.value })}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No tickets", description: "Nothing matches this queue." }}
        onRowClick={(t) => navigate(`/crm/tickets/${t.id}`)}
        columns={[
          {
            key: "ticket",
            header: "Ticket",
            primary: true,
            render: (t) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{t.subject}</p>
                <p className="truncate text-xs text-ink-500">
                  {t.ticketNumber}
                  {t.customerSnapshot?.name ? ` · ${t.customerSnapshot.name}` : ""}
                </p>
              </div>
            ),
          },
          { key: "priority", header: "Priority", render: (t) => <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge> },
          { key: "status", header: "Status", render: (t) => <Badge tone={STATUS_TONE[t.status]}>{label(t.status)}</Badge> },
          { key: "assignee", header: "Assignee", secondary: true, render: (t) => t.assigneeName || t.assignedTeam || "Unassigned" },
          {
            key: "due",
            header: "Due",
            render: (t) =>
              t.dueAt ? (
                <span className={t.slaBreached ? "text-red-600" : ""}>{dateTime(t.dueAt)}</span>
              ) : (
                "—"
              ),
          },
          { key: "activity", header: "Last activity", hideOnMobile: true, render: (t) => fromNow(t.lastActivityAt) },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <TicketForm
          onClose={() => setCreating(false)}
          onSaved={(t) => {
            setCreating(false);
            navigate(`/crm/tickets/${t.id}`);
          }}
        />
      )}
    </>
  );
}

function Tile({ label, value, tone, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white px-3 py-2.5 text-left transition-colors ${onClick ? "hover:bg-ink-50" : ""} ${
        active ? "ring-1 ring-inset ring-brand-600" : ""
      }`}
    >
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>
        {value ?? 0}
      </p>
    </button>
  );
}
