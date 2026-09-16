import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import Select from "../../components/ui/Select.jsx";
import LeaveRequestForm from "../../components/hrm/LeaveRequestForm.jsx";
import LeaveRequestDetail from "../../components/hrm/LeaveRequestDetail.jsx";
import LeaveCalendar from "../../components/hrm/LeaveCalendar.jsx";
import LeaveTypeManager from "../../components/hrm/LeaveTypeManager.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useAuth } from "../../store/auth.js";
import { dateShort, days as fmtDays, fromNow } from "../../utils/format.js";

export default function Leave() {
  const can = useAuth((s) => s.can);
  const tabs = [
    { key: "mine", label: "My leave" },
    can("leave:approve_manager") && { key: "team", label: "Team approvals" },
    can("leave:approve_hr") && { key: "all", label: "All requests" },
    { key: "calendar", label: "Calendar" },
    can("leave:configure") && { key: "types", label: "Leave types" },
  ].filter(Boolean);

  const [tab, setTab] = useState("mine");
  const [detailId, setDetailId] = useState(null);

  return (
    <>
      <PageHeader title="Leave Management" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "mine" && <MyLeave onOpen={setDetailId} />}
      {tab === "team" && <RequestQueue scope="team" onOpen={setDetailId} title="Requests awaiting your approval" defaultStatus="Pending" />}
      {tab === "all" && <RequestQueue scope="all" onOpen={setDetailId} title="All leave requests" hrControls />}
      {tab === "calendar" && <LeaveCalendar />}
      {tab === "types" && <LeaveTypeManager />}

      {detailId && (
        <LeaveRequestDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => setDetailId(detailId)}
        />
      )}
    </>
  );
}

function MyLeave({ onOpen }) {
  const { data, loading, error, refetch } = useApiQuery("/hrm/leave/me");
  const [requesting, setRequesting] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-ink-400">
        <Spinner size={22} />
      </div>
    );
  }
  if (error) {
    return <EmptyState title="Leave unavailable" description={error.message} />;
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Balances — {new Date().getFullYear()}</h2>
        <Button onClick={() => setRequesting(true)}>Request leave</Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {data.balances.map((b) => (
          <div key={b.leaveType.id} className="card p-3">
            <p className="truncate text-sm font-medium text-ink-900">{b.leaveType.name}</p>
            <p className="mt-1 text-2xl font-semibold text-ink-900">{b.availableDays}</p>
            <p className="mt-0.5 text-2xs text-ink-500">
              of {b.entitledDays + b.carriedOverDays} · {b.usedDays} used
              {b.pendingDays ? ` · ${b.pendingDays} pending` : ""}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink-900">My requests</h2>
      <DataTable
        rows={data.requests}
        keyField="id"
        empty={{ title: "No requests yet", description: "Request leave using the button above." }}
        onRowClick={(r) => onOpen(r.id)}
        columns={[
          { key: "reference", header: "Ref", render: (r) => r.reference },
          { key: "leaveType", header: "Type", primary: true, render: (r) => r.leaveType?.name },
          {
            key: "dates",
            header: "Dates",
            secondary: true,
            render: (r) => `${dateShort(r.startDate)} – ${dateShort(r.endDate)}`,
          },
          { key: "days", header: "Days", align: "right", render: (r) => fmtDays(r.days) },
          { key: "status", header: "Status", render: (r) => <Badge status={r.status}>{r.status}</Badge> },
          { key: "submitted", header: "Submitted", render: (r) => fromNow(r.submittedAt) },
        ]}
      />

      {requesting && (
        <LeaveRequestForm
          onClose={() => setRequesting(false)}
          onSaved={() => {
            setRequesting(false);
            refetch();
          }}
        />
      )}
    </>
  );
}

function RequestQueue({ scope, onOpen, title, hrControls, defaultStatus = "" }) {
  const [filters, setFilters] = useState({ status: defaultStatus, search: "", branch: "", leaveType: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const branches = useApiQuery("/hrm/branches", { params: { limit: 100, status: "active" }, skip: !hrControls });
  const types = useApiQuery("/hrm/leave/types", { params: {} });

  const params = useMemo(
    () => ({
      scope,
      page,
      limit: 20,
      status: filters.status || undefined,
      branch: filters.branch || undefined,
      leaveType: filters.leaveType || undefined,
    }),
    [scope, page, filters],
  );
  const list = useApiQuery("/hrm/leave/requests", { params });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {hrControls && <Button onClick={() => setCreating(true)}>Record leave</Button>}
      </div>

      <FilterBar
        active={filters.status || filters.branch || filters.leaveType}
        onClear={() => {
          setFilters({ status: defaultStatus, search: "", branch: "", leaveType: "" });
          setPage(1);
        }}
      >
        <Select
          className="lg:w-44"
          placeholder="Any status"
          options={[
            "Pending",
            "Manager Approved",
            "Approved",
            "Rejected",
            "Cancelled",
            "Clarification Requested",
          ]}
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: e.target.value }));
            setPage(1);
          }}
        />
        <Select
          className="lg:w-44"
          placeholder="Any type"
          options={(types.data || []).map((t) => ({ value: t.id, label: t.name }))}
          value={filters.leaveType}
          onChange={(e) => {
            setFilters((f) => ({ ...f, leaveType: e.target.value }));
            setPage(1);
          }}
        />
        {hrControls && (
          <Select
            className="lg:w-44"
            placeholder="Any branch"
            options={(branches.data || []).map((b) => ({ value: b.id, label: b.name }))}
            value={filters.branch}
            onChange={(e) => {
              setFilters((f) => ({ ...f, branch: e.target.value }));
              setPage(1);
            }}
          />
        )}
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "Nothing here", description: "No leave requests match these filters." }}
        onRowClick={(r) => onOpen(r.id)}
        columns={[
          {
            key: "employee",
            header: "Employee",
            primary: true,
            render: (r) => (
              <div>
                <p className="font-medium text-ink-900">
                  {r.employee?.firstName} {r.employee?.lastName}
                </p>
                <p className="text-xs text-ink-500">{r.reference}</p>
              </div>
            ),
          },
          { key: "leaveType", header: "Type", render: (r) => r.leaveType?.name },
          {
            key: "dates",
            header: "Dates",
            secondary: true,
            render: (r) => `${dateShort(r.startDate)} – ${dateShort(r.endDate)}`,
          },
          { key: "days", header: "Days", align: "right", render: (r) => fmtDays(r.days) },
          { key: "branch", header: "Branch", render: (r) => r.branch?.name || "—" },
          { key: "status", header: "Status", render: (r) => <Badge status={r.status}>{r.status}</Badge> },
          { key: "submitted", header: "Submitted", render: (r) => fromNow(r.submittedAt) },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <LeaveRequestForm
          onBehalf
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            list.refetch();
          }}
        />
      )}
    </>
  );
}
