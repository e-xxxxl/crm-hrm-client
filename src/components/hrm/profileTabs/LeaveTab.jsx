import { useState } from "react";
import DataTable from "../../ui/DataTable.jsx";
import Badge from "../../ui/Badge.jsx";
import Spinner from "../../ui/Spinner.jsx";
import EmptyState from "../../ui/EmptyState.jsx";
import LeaveRequestDetail from "../LeaveRequestDetail.jsx";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { useAuth } from "../../../store/auth.js";
import { dateShort, days as fmtDays } from "../../../utils/format.js";

export default function LeaveTab({ employee }) {
  const canView = useAuth((s) => s.can("leave:read"));
  const [detailId, setDetailId] = useState(null);

  const balances = useApiQuery(`/hrm/leave/balances/${employee.id}`, { skip: !canView });
  const requests = useApiQuery("/hrm/leave/requests", {
    params: { employee: employee.id, limit: 30 },
    skip: !canView,
  });

  if (!canView) {
    return <EmptyState title="Restricted" description="You cannot view this employee's leave records." />;
  }
  if (balances.loading) {
    return (
      <div className="flex justify-center py-10 text-ink-400">
        <Spinner size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-900">Balances — {new Date().getFullYear()}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(balances.data || []).map((b) => (
            <div key={b.leaveType.id} className="card p-3">
              <p className="truncate text-sm font-medium text-ink-900">{b.leaveType.name}</p>
              <p className="mt-1 text-xl font-semibold text-ink-900">{b.availableDays}</p>
              <p className="mt-0.5 text-2xs text-ink-500">
                {b.usedDays} used{b.pendingDays ? ` · ${b.pendingDays} pending` : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-900">Requests</h3>
        <DataTable
          loading={requests.loading}
          error={requests.error}
          rows={requests.data || []}
          keyField="id"
          empty={{ title: "No leave requests", description: "This employee has not requested leave." }}
          onRowClick={(r) => setDetailId(r.id)}
          columns={[
            { key: "reference", header: "Ref", render: (r) => r.reference },
            { key: "type", header: "Type", primary: true, render: (r) => r.leaveType?.name },
            {
              key: "dates",
              header: "Dates",
              secondary: true,
              render: (r) => `${dateShort(r.startDate)} – ${dateShort(r.endDate)}`,
            },
            { key: "days", header: "Days", align: "right", render: (r) => fmtDays(r.days) },
            { key: "status", header: "Status", render: (r) => <Badge status={r.status}>{r.status}</Badge> },
          ]}
        />
      </div>

      {detailId && (
        <LeaveRequestDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => {
            requests.refetch();
            balances.refetch();
          }}
        />
      )}
    </div>
  );
}
