import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import ClockCard from "../../components/hrm/ClockCard.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuth } from "../../store/auth.js";
import { dateTime, timeOnly, dateShort, formatLocation, mapsLink } from "../../utils/format.js";

const todayKey = () => new Date().toLocaleDateString("en-CA");

export default function Attendance() {
  const canOversee = useAuth((s) => s.canAny("attendance:manage", "attendance:report"));
  const [tab, setTab] = useState("day");

  return (
    <>
      <PageHeader
        title="Attendance"
        description="GPS clock-in with per-branch geofencing."
      />

      <div className="mb-6 max-w-md">
        <ClockCard />
      </div>

      {canOversee ? (
        <>
          <Tabs
            tabs={[
              { key: "day", label: "Daily register" },
              { key: "month", label: "Monthly report" },
            ]}
            active={tab}
            onChange={setTab}
          />
          {tab === "day" ? <DailyRegister /> : <MonthlyReport />}
        </>
      ) : null}
    </>
  );
}

function StatTiles({ summary }) {
  if (!summary) return null;
  const tiles = [
    ["Present", summary.present],
    ["Late", summary.late],
    ["Absent", summary.absent],
    ["On leave", summary.onLeave],
    ["Not clocked in", summary.notClockedIn],
    ["Geofence flags", summary.geofenceViolations],
  ];
  return (
    <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(([label, value]) => (
        <div key={label} className="bg-white px-3 py-2.5">
          <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-0.5 text-lg font-semibold text-ink-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

function DailyRegister() {
  const [filters, setFilters] = useState({
    date: todayKey(),
    branch: "",
    department: "",
    status: "",
    search: "",
  });
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filters.search);

  const branches = useApiQuery("/hrm/branches", { params: { limit: 100, status: "active" } });
  const departments = useApiQuery("/hrm/departments", { params: { limit: 100, status: "active" } });

  const params = useMemo(
    () => ({
      date: filters.date,
      branch: filters.branch || undefined,
      department: filters.department || undefined,
      status: filters.status || undefined,
      search: search || undefined,
      page,
      limit: 25,
    }),
    [filters.date, filters.branch, filters.department, filters.status, search, page],
  );

  const list = useApiQuery("/hrm/attendance/today", { params });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <StatTiles summary={list.data?.summary} />

      <FilterBar
        active={filters.branch || filters.department || filters.status || filters.search || filters.date !== todayKey()}
        onClear={() => update({ date: todayKey(), branch: "", department: "", status: "", search: "" })}
      >
        <TextField
          type="date"
          className="lg:w-44"
          value={filters.date}
          max={todayKey()}
          onChange={(e) => update({ date: e.target.value })}
        />
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Employee or ID" />
        <Select
          className="lg:w-44"
          placeholder="All branches"
          options={(branches.data || []).map((b) => ({ value: b.id, label: b.name }))}
          value={filters.branch}
          onChange={(e) => update({ branch: e.target.value })}
        />
        <Select
          className="lg:w-44"
          placeholder="All departments"
          options={(departments.data || []).map((d) => ({ value: d.id, label: d.name }))}
          value={filters.department}
          onChange={(e) => update({ department: e.target.value })}
        />
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={["Present", "Late", "Absent", "On Leave", "Not Clocked In"]}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data?.data || []}
        keyField="id"
        empty={{ title: "No employees", description: "No active employees match these filters." }}
        columns={[
          {
            key: "employee",
            header: "Employee",
            primary: true,
            render: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{r.employee.name}</p>
                <p className="truncate text-xs text-ink-500">
                  {r.employee.employeeId} · {r.employee.position}
                </p>
              </div>
            ),
          },
          { key: "department", header: "Department", render: (r) => r.employee.department || "—" },
          { key: "branch", header: "Branch", render: (r) => r.employee.branch || "—" },
          {
            key: "clockIn",
            header: "Clock in",
            render: (r) => (r.clockIn ? timeOnly(r.clockIn.at) : "—"),
          },
          {
            key: "clockOut",
            header: "Clock out",
            render: (r) => (r.clockOut ? timeOnly(r.clockOut.at) : "—"),
          },
          {
            key: "totalHours",
            header: "Hours",
            align: "right",
            render: (r) => (r.totalHours != null ? r.totalHours : "—"),
          },
          {
            key: "location",
            header: "Location",
            render: (r) =>
              r.clockIn ? (
                <div className="min-w-0 max-w-[14rem]">
                  <div className="flex items-center gap-1.5">
                    {r.geofenceViolation ? (
                      <Badge tone="red">Outside geofence</Badge>
                    ) : r.clockIn.withinGeofence ? (
                      <Badge tone="green">On site</Badge>
                    ) : (
                      <Badge tone="neutral">Unverified</Badge>
                    )}
                  </div>
                  {mapsLink(r.clockIn) ? (
                    <a
                      href={mapsLink(r.clockIn)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block truncate text-xs text-brand-600 hover:underline"
                      title={formatLocation(r.clockIn)}
                    >
                      {formatLocation(r.clockIn)}
                    </a>
                  ) : (
                    <p className="mt-0.5 truncate text-xs text-ink-400">{formatLocation(r.clockIn)}</p>
                  )}
                </div>
              ) : (
                "—"
              ),
          },
          {
            key: "status",
            header: "Status",
            secondary: true,
            render: (r) => <Badge status={r.status}>{r.status}</Badge>,
          },
        ]}
        footer={<Pagination meta={list.data?.meta} onPage={setPage} />}
      />
    </>
  );
}

function MonthlyReport() {
  const [filters, setFilters] = useState({
    month: new Date().toISOString().slice(0, 7),
    branch: "",
    department: "",
  });
  const branches = useApiQuery("/hrm/branches", { params: { limit: 100, status: "active" } });
  const departments = useApiQuery("/hrm/departments", { params: { limit: 100, status: "active" } });

  const report = useApiQuery("/hrm/attendance/reports/monthly", {
    params: {
      month: filters.month,
      branch: filters.branch || undefined,
      department: filters.department || undefined,
    },
  });

  return (
    <>
      <FilterBar
        active={filters.branch || filters.department}
        onClear={() => setFilters((f) => ({ ...f, branch: "", department: "" }))}
      >
        <TextField
          type="month"
          className="lg:w-44"
          value={filters.month}
          max={new Date().toISOString().slice(0, 7)}
          onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
        />
        <Select
          className="lg:w-44"
          placeholder="All branches"
          options={(branches.data || []).map((b) => ({ value: b.id, label: b.name }))}
          value={filters.branch}
          onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
        />
        <Select
          className="lg:w-44"
          placeholder="All departments"
          options={(departments.data || []).map((d) => ({ value: d.id, label: d.name }))}
          value={filters.department}
          onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
        />
      </FilterBar>

      {report.data && (
        <p className="mb-3 text-sm text-ink-500">
          {report.data.workingDays} working days in {report.data.month}
        </p>
      )}

      <DataTable
        loading={report.loading}
        error={report.error}
        onRetry={report.refetch}
        rows={report.data?.rows || []}
        keyField="id"
        empty={{ title: "No data", description: "No employees match these filters." }}
        columns={[
          {
            key: "name",
            header: "Employee",
            primary: true,
            render: (r) => (
              <div>
                <p className="font-medium text-ink-900">{r.employee.name}</p>
                <p className="text-xs text-ink-500">{r.employee.employeeId}</p>
              </div>
            ),
          },
          { key: "department", header: "Department", render: (r) => r.employee.department || "—" },
          { key: "present", header: "Present", align: "right", render: (r) => r.present },
          { key: "late", header: "Late", align: "right", render: (r) => r.late },
          { key: "absent", header: "Absent", align: "right", render: (r) => r.absent },
          { key: "totalHours", header: "Hours", align: "right", render: (r) => r.totalHours },
          {
            key: "attendanceRate",
            header: "Rate",
            secondary: true,
            align: "right",
            render: (r) => (r.attendanceRate == null ? "—" : `${r.attendanceRate}%`),
          },
        ]}
      />
    </>
  );
}
