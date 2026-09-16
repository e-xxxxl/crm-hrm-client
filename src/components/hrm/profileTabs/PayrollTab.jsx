import { useState } from "react";
import Button from "../../ui/Button.jsx";
import Badge from "../../ui/Badge.jsx";
import DataTable from "../../ui/DataTable.jsx";
import EmptyState from "../../ui/EmptyState.jsx";
import Spinner from "../../ui/Spinner.jsx";
import SalaryStructureForm from "../SalaryStructureForm.jsx";
import PayslipView from "../PayslipView.jsx";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { useAuth } from "../../../store/auth.js";
import { money, dateShort } from "../../../utils/format.js";

export default function PayrollTab({ employee, strategy }) {
  const can = useAuth((s) => s.can);
  const canView = can("payroll:read");
  const canConfigure = can("payroll:configure");
  const [editing, setEditing] = useState(false);
  const [payslipId, setPayslipId] = useState(null);

  const structure = useApiQuery(`/hrm/payroll/structures/${employee.id}`, { skip: !canView });
  const payslips = useApiQuery("/hrm/payroll/payslips", {
    params: { employee: employee.id, limit: 24 },
    skip: !canView,
  });

  if (!canView) {
    return (
      <EmptyState
        title="Restricted"
        description="You do not have permission to view payroll information for this employee."
      />
    );
  }

  if (structure.loading) {
    return (
      <div className="flex justify-center py-10 text-ink-400">
        <Spinner size={22} />
      </div>
    );
  }

  const current = structure.data?.current;
  const history = structure.data?.history || [];

  return (
    <div className="space-y-6">
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Current salary structure</h3>
          {canConfigure && (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
              {current ? "Update" : "Set structure"}
            </Button>
          )}
        </div>

        {!current ? (
          <p className="text-sm text-ink-500">No salary structure set. This employee is excluded from payroll runs.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {strategy === "fixed-monthly" && <Row label="Gross monthly" value={money(current.grossMonthly || current.fixedGross)} />}
            {strategy === "hybrid" && (
              <>
                <Row label="Base salary" value={money(current.basic)} />
                <Row label="Per trip" value={money(current.commissionPerTrip)} />
              </>
            )}
            {strategy === "allowance-based" && (
              <>
                <Row label="Basic" value={money(current.basic)} />
                <Row label="Housing" value={money(current.housing)} />
                <Row label="Transport" value={money(current.transport)} />
                <Row label="Hazard" value={money(current.hazard)} />
                <Row label="Meal" value={money(current.meal)} />
              </>
            )}
            <Row label="PAYE" value={current.payeApplicable ? "Yes" : "No"} />
            <Row label="Pension" value={current.pensionApplicable ? "Yes" : "No"} />
            <Row label="NHF" value={current.nhfApplicable ? "Yes" : "No"} />
            <Row label="Effective from" value={dateShort(current.effectiveFrom)} />
          </dl>
        )}
      </div>

      {history.length > 1 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-ink-900">Salary history</h3>
          <ul className="space-y-1.5 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex items-baseline justify-between gap-3">
                <span className="text-ink-800">
                  {money(h.grossMonthly || h.basic + h.housing + h.transport + h.hazard + h.meal)}
                  {h.reason ? ` — ${h.reason}` : ""}
                </span>
                <span className="shrink-0 text-xs text-ink-500">
                  {dateShort(h.effectiveFrom)} – {h.effectiveTo ? dateShort(h.effectiveTo) : "present"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-900">Payslip history</h3>
        <DataTable
          loading={payslips.loading}
          error={payslips.error}
          rows={payslips.data || []}
          keyField="id"
          empty={{ title: "No payslips", description: "No payroll has been processed for this employee." }}
          onRowClick={(p) => setPayslipId(p.id)}
          columns={[
            { key: "period", header: "Period", primary: true, render: (p) => p.periodLabel },
            { key: "gross", header: "Gross", align: "right", render: (p) => money(p.grossEarnings) },
            { key: "paye", header: "PAYE", align: "right", render: (p) => money(p.paye) },
            { key: "net", header: "Net", align: "right", secondary: true, render: (p) => money(p.netPay) },
            { key: "status", header: "Status", render: (p) => <Badge status={p.status}>{p.status}</Badge> },
          ]}
        />
      </div>

      {editing && (
        <SalaryStructureForm
          employeeId={employee.id}
          strategy={strategy}
          current={current}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            structure.refetch();
          }}
        />
      )}
      {payslipId && <PayslipView id={payslipId} onClose={() => setPayslipId(null)} onChanged={payslips.refetch} />}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value}</dd>
    </div>
  );
}
