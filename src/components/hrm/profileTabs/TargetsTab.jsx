import { useState } from "react";
import DataTable from "../../ui/DataTable.jsx";
import Badge from "../../ui/Badge.jsx";
import EmptyState from "../../ui/EmptyState.jsx";
import { TargetDetail } from "../../../pages/hrm/Targets.jsx";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { useAuth } from "../../../store/auth.js";
import { dateShort, number } from "../../../utils/format.js";

const STATUS_TONE = {
  not_started: "slate",
  in_progress: "blue",
  at_risk: "amber",
  achieved: "green",
  missed: "red",
  cancelled: "slate",
};
const statusLabel = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function TargetsTab({ employee }) {
  const canView = useAuth((s) => s.can("target:read"));
  const [detailId, setDetailId] = useState(null);

  const targets = useApiQuery("/hrm/targets", { params: { employee: employee.id, limit: 50 }, skip: !canView });

  if (!canView) {
    return <EmptyState title="Restricted" description="You cannot view this employee's targets." />;
  }

  return (
    <div className="space-y-4">
      <DataTable
        loading={targets.loading}
        error={targets.error}
        onRetry={targets.refetch}
        rows={targets.data || []}
        keyField="id"
        empty={{ title: "No targets", description: "No targets have been assigned to this employee yet." }}
        onRowClick={(t) => setDetailId(t.id)}
        columns={[
          { key: "title", header: "Target", primary: true, render: (t) => t.title },
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
          { key: "deadline", header: "Deadline", secondary: true, render: (t) => dateShort(t.deadline) },
          {
            key: "status",
            header: "Status",
            render: (t) => <Badge tone={STATUS_TONE[t.status]}>{statusLabel(t.status)}</Badge>,
          },
        ]}
      />

      {detailId && (
        <TargetDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => targets.refetch()}
        />
      )}
    </div>
  );
}
