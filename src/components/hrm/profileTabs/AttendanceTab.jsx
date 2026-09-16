import { useMemo, useState } from "react";
import DataTable from "../../ui/DataTable.jsx";
import Pagination from "../../ui/Pagination.jsx";
import Badge from "../../ui/Badge.jsx";
import TextField from "../../ui/TextField.jsx";
import FilterBar from "../../ui/FilterBar.jsx";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { useAuth } from "../../../store/auth.js";
import EmptyState from "../../ui/EmptyState.jsx";
import { dateShort, timeOnly, formatLocation, mapsLink } from "../../../utils/format.js";

export default function AttendanceTab({ employee }) {
  const canView = useAuth((s) => s.canAny("attendance:manage", "attendance:report"));
  const [range, setRange] = useState({ from: "", to: "" });
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ employee: employee.id, from: range.from || undefined, to: range.to || undefined, page, limit: 20 }),
    [employee.id, range, page],
  );
  const list = useApiQuery("/hrm/attendance/records", { params, skip: !canView });

  if (!canView) {
    return <EmptyState title="Restricted" description="You cannot view this employee's attendance history." />;
  }

  return (
    <>
      <FilterBar
        active={range.from || range.to}
        onClear={() => {
          setRange({ from: "", to: "" });
          setPage(1);
        }}
      >
        <TextField
          type="date"
          className="lg:w-44"
          value={range.from}
          onChange={(e) => {
            setRange((r) => ({ ...r, from: e.target.value }));
            setPage(1);
          }}
        />
        <TextField
          type="date"
          className="lg:w-44"
          value={range.to}
          onChange={(e) => {
            setRange((r) => ({ ...r, to: e.target.value }));
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
        empty={{ title: "No attendance records", description: "Nothing recorded for the selected period." }}
        columns={[
          { key: "date", header: "Date", primary: true, render: (r) => dateShort(r.dayKey) },
          { key: "in", header: "Clock in", render: (r) => (r.clockIn ? timeOnly(r.clockIn.at) : "—") },
          { key: "out", header: "Clock out", render: (r) => (r.clockOut ? timeOnly(r.clockOut.at) : "—") },
          { key: "hours", header: "Hours", align: "right", render: (r) => (r.totalHours ?? "—") },
          {
            key: "geofence",
            header: "Location",
            render: (r) =>
              r.clockIn ? (
                <div className="min-w-0 max-w-[14rem]">
                  <div className="flex items-center gap-1.5">
                    {r.geofenceViolation ? (
                      <Badge tone="red">Outside</Badge>
                    ) : r.clockIn?.withinGeofence ? (
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
          { key: "status", header: "Status", secondary: true, render: (r) => <Badge status={r.status}>{r.status}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />
    </>
  );
}
