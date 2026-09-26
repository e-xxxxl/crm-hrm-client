import { useState } from "react";
import Drawer from "../ui/Drawer.jsx";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import Spinner from "../ui/Spinner.jsx";
import DataTable from "../ui/DataTable.jsx";
import Modal from "../ui/Modal.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { payroll, downloadFile } from "../../services/hrm.js";
import { money } from "../../utils/format.js";
import PayslipView from "./PayslipView.jsx";

const STEP = { draft: 0, calculated: 1, approved: 2, finalized: 3, cancelled: -1 };

export default function PayrollRunDetail({ id, onClose, onChanged }) {
  const { data, loading, error, refetch } = useApiQuery(`/hrm/payroll/runs/${id}`);
  const can = useAuth((s) => s.can);
  const [payslipId, setPayslipId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const calc = useMutation(() => payroll.calculateRun(id));
  const approve = useMutation(() => payroll.approveRun(id));
  const finalize = useMutation(() => payroll.finalizeRun(id));
  const cancel = useMutation(() => payroll.cancelRun(id));

  const run = data?.run;
  const payslips = data?.payslips || [];

  async function act(fn, label, mut) {
    try {
      await mut.mutate();
      toast.success(label);
      setConfirm(null);
      refetch();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function exportCsv() {
    try {
      await downloadFile(payroll.bankExportUrl(id), `payroll-${run.reference}.csv`);
    } catch (e) {
      toast.error(e.message || "Export failed");
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="xl"
      title={run ? `${run.reference} · ${run.periodLabel}` : "Payroll run"}
      description={run ? `${run.strategy} strategy` : ""}
    >
      {loading && (
        <div className="flex justify-center py-10 text-ink-400">
          <Spinner size={22} />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {run && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge status={run.status}>{run.status}</Badge>
            {run.excludedEmployeeCount > 0 && (
              <Badge tone="amber">{run.excludedEmployeeCount} excluded</Badge>
            )}
          </div>

          {/* Progress */}
          <ol className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
            {["Draft", "Calculated", "Approved", "Finalized"].map((label, i) => (
              <li
                key={label}
                className={
                  STEP[run.status] >= i ? "font-medium text-brand-700" : "text-ink-400"
                }
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-6">
            <Tile label="Employees" value={run.totals.employeeCount} />
            <Tile label="Gross" value={money(run.totals.grossEarnings, { whole: true })} />
            <Tile label="PAYE (employee)" value={money(run.totals.paye, { whole: true })} />
            <Tile label="PAYE (company)" value={money(run.totals.payeEmployer, { whole: true })} />
            <Tile label="Pension (emp)" value={money(run.totals.pensionEmployee, { whole: true })} />
            <Tile label="Deductions" value={money(run.totals.totalDeductions, { whole: true })} />
            <Tile label="Net pay" value={money(run.totals.netPay, { whole: true })} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {["draft", "calculated"].includes(run.status) && can("payroll:run") && (
              <Button loading={calc.loading} onClick={() => act(calc, "Payroll calculated", calc)}>
                {run.status === "draft" ? "Calculate" : "Recalculate"}
              </Button>
            )}
            {run.status === "calculated" && can("payroll:approve") && (
              <Button onClick={() => setConfirm("approve")}>Approve</Button>
            )}
            {run.status === "approved" && can("payroll:approve") && (
              <Button onClick={() => setConfirm("finalize")}>Finalize &amp; notify</Button>
            )}
            {["approved", "finalized"].includes(run.status) && can("payroll:export") && (
              <Button variant="secondary" onClick={exportCsv}>
                Bank CSV
              </Button>
            )}
            {!["finalized", "cancelled"].includes(run.status) && can("payroll:run") && (
              <Button variant="danger" onClick={() => setConfirm("cancel")}>
                Cancel run
              </Button>
            )}
          </div>

          {/* Payslips */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-900">Payslips ({payslips.length})</p>
            <DataTable
              rows={payslips}
              keyField="id"
              empty={{
                title: "No payslips",
                description:
                  run.status === "draft"
                    ? "Calculate the run to generate payslips."
                    : "No employees had a salary structure for this period.",
              }}
              onRowClick={(p) => setPayslipId(p.id)}
              columns={[
                {
                  key: "name",
                  header: "Employee",
                  primary: true,
                  render: (p) => p.employeeSnapshot?.name,
                },
                { key: "empId", header: "ID", render: (p) => p.employeeSnapshot?.employeeId },
                { key: "gross", header: "Gross", align: "right", render: (p) => money(p.grossEarnings) },
                { key: "paye", header: "PAYE", align: "right", render: (p) => money(p.paye) },
                {
                  key: "deductions",
                  header: "Deductions",
                  align: "right",
                  render: (p) => money(p.totalDeductions),
                },
                {
                  key: "net",
                  header: "Net",
                  align: "right",
                  secondary: true,
                  render: (p) => money(p.netPay),
                },
                { key: "status", header: "Status", render: (p) => <Badge status={p.status}>{p.status}</Badge> },
              ]}
            />
          </div>
        </div>
      )}

      {payslipId && (
        <PayslipView id={payslipId} onClose={() => setPayslipId(null)} onChanged={refetch} />
      )}

      {confirm && (
        <Modal
          open
          onClose={() => setConfirm(null)}
          title={
            confirm === "approve"
              ? "Approve payroll run"
              : confirm === "finalize"
                ? "Finalize payroll run"
                : "Cancel payroll run"
          }
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(null)}>
                Back
              </Button>
              {confirm === "approve" && (
                <Button loading={approve.loading} onClick={() => act(approve, "Payroll approved", approve)}>
                  Approve
                </Button>
              )}
              {confirm === "finalize" && (
                <Button loading={finalize.loading} onClick={() => act(finalize, "Payroll finalized", finalize)}>
                  Finalize
                </Button>
              )}
              {confirm === "cancel" && (
                <Button
                  variant="danger"
                  loading={cancel.loading}
                  onClick={() => act(cancel, "Payroll run cancelled", cancel)}
                >
                  Cancel run
                </Button>
              )}
            </>
          }
        >
          <p className="text-sm text-ink-600">
            {confirm === "approve" &&
              "Approving locks the calculated figures. Recalculation is not possible after approval — cancel and recreate the run if numbers need to change."}
            {confirm === "finalize" &&
              "Finalizing marks the run complete, notifies every employee their payslip is available, and consumes the period's trip logs. This cannot be undone."}
            {confirm === "cancel" && "This deletes the run's payslips. Trip logs are released back to the pool."}
          </p>
        </Modal>
      )}
    </Drawer>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
