import Drawer from "../ui/Drawer.jsx";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import Spinner from "../ui/Spinner.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useAuth } from "../../store/auth.js";
import { payroll, downloadFile } from "../../services/hrm.js";
import { toast } from "../../store/toast.js";
import { money, dateShort } from "../../utils/format.js";

export default function PayslipView({ id, onClose, onChanged }) {
  const { data: slip, loading, error, refetch } = useApiQuery(`/hrm/payroll/payslips/${id}`);
  const canManage = useAuth((s) => s.can("payroll:approve"));

  async function download() {
    try {
      await downloadFile(
        payroll.payslipPdfUrl(id),
        `payslip-${slip.employeeSnapshot?.employeeId}-${slip.periodLabel}.pdf`,
      );
    } catch (e) {
      toast.error(e.message || "Download failed");
    }
  }

  async function markPaid() {
    try {
      await payroll.markPaid(id);
      toast.success("Payslip marked as paid");
      refetch();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      title={slip ? `Payslip · ${slip.periodLabel}` : "Payslip"}
      description={slip?.employeeSnapshot?.name}
      footer={
        slip && (
          <>
            <Button variant="secondary" onClick={download}>
              Download PDF
            </Button>
            {canManage && slip.status !== "paid" && slip.payrollRun?.status === "finalized" && (
              <Button onClick={markPaid}>Mark paid</Button>
            )}
          </>
        )
      }
    >
      {loading && (
        <div className="flex justify-center py-10 text-ink-400">
          <Spinner size={22} />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {slip && (
        <div className="space-y-5 text-sm">
          <div className="flex items-center gap-2">
            <Badge status={slip.status}>{slip.status}</Badge>
            <Badge tone="neutral">{slip.payrollRun?.reference}</Badge>
            {slip.payrollRun?.status && <Badge tone="slate">run: {slip.payrollRun.status}</Badge>}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Row label="Employee ID" value={slip.employeeSnapshot?.employeeId} />
            <Row label="Position" value={slip.employeeSnapshot?.position} />
            <Row label="Department" value={slip.employeeSnapshot?.department || "—"} />
            <Row label="Branch" value={slip.employeeSnapshot?.branch || "—"} />
            <Row label="Bank" value={slip.employeeSnapshot?.bank?.bankName || "—"} />
            <Row label="Account" value={slip.employeeSnapshot?.bank?.accountNumber || "—"} />
            <Row label="Tax state" value={slip.employeeSnapshot?.taxState || "—"} />
            <Row label="PFA" value={slip.employeeSnapshot?.pfaName || "—"} />
            {slip.paidAt && <Row label="Paid" value={dateShort(slip.paidAt)} />}
          </dl>

          <Section title="Earnings" items={slip.earnings} total={["Gross earnings", slip.grossEarnings]} />
          <Section title="Deductions" items={slip.deductions} total={["Total deductions", slip.totalDeductions]} />

          <div className="flex items-center justify-between border-t border-ink-900 pt-2 text-base font-semibold text-ink-900">
            <span>Net pay</span>
            <span>{money(slip.netPay)}</span>
          </div>

          <p className="text-2xs text-ink-500">
            PAYE (you pay) {money(slip.paye)} · PAYE (company pays) {money(slip.payeEmployer)} · Pension (employee){" "}
            {money(slip.pensionEmployee)} · Pension (employer) {money(slip.pensionEmployer)}
            {slip.nhf ? ` · NHF ${money(slip.nhf)}` : ""}
            {slip.tripCount ? ` · ${slip.tripCount} trips` : ""}
          </p>

          {slip.taxDetail && (
            <details className="rounded-md border border-ink-200 p-2">
              <summary className="cursor-pointer text-xs font-medium text-ink-700">PAYE calculation</summary>
              <div className="mt-2 space-y-1 text-xs text-ink-600">
                <p className="text-ink-500">PAYE is charged on basic + housing + transport only.</p>
                <p>Annual taxable income (basic + housing + transport): {money(slip.taxDetail.taxableIncome)}</p>
                {slip.taxDetail.breakdown?.map((b, i) => (
                  <p key={i}>
                    {money(b.amount)} @ {(b.rate * 100).toFixed(0)}% = {money(b.tax)}
                  </p>
                ))}
                <p>
                  Annual PAYE: {money(slip.taxDetail.annualTax)} ({slip.taxDetail.effectiveRate}% effective) — split
                  50/50: {money(slip.taxDetail.employeeAnnualTax)} you, {money(slip.taxDetail.employerAnnualTax)} company
                </p>
              </div>
            </details>
          )}
        </div>
      )}
    </Drawer>
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

function Section({ title, items, total }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink-900">{title}</p>
      <div className="divide-y divide-ink-100 rounded-md border border-ink-200">
        {(items || []).map((it, i) => (
          <div key={i} className="flex justify-between px-3 py-1.5">
            <span className="text-ink-700">{it.label}</span>
            <span className="text-ink-900">{money(it.amount)}</span>
          </div>
        ))}
        {(!items || items.length === 0) && (
          <div className="px-3 py-1.5 text-ink-400">None</div>
        )}
        <div className="flex justify-between bg-ink-50 px-3 py-1.5 font-medium">
          <span>{total[0]}</span>
          <span>{money(total[1])}</span>
        </div>
      </div>
    </div>
  );
}
