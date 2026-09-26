import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import TextField from "../ui/TextField.jsx";
import Textarea from "../ui/Textarea.jsx";
import Alert from "../ui/Alert.jsx";
import { useMutation } from "../../hooks/useMutation.js";
import { toast } from "../../store/toast.js";
import { money } from "../../utils/format.js";

/**
 * Set an employee's salary structure. Fields shown depend on the organization's
 * payroll strategy.
 */
// Numeric fields are kept as raw strings in form state — coercing to Number
// on every keystroke (the old behaviour) snaps a controlled input's display
// back to an integer the instant a decimal point is typed, since the state
// immediately loses the trailing ".", making decimals impossible to enter.
const MONEY_FIELDS = [
  "basic", "housing", "transport", "subsidy", "dataAllowance",
  "exGratia", "referralBonus", "overtime", "grossMonthly", "commissionPerTrip",
];
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function SalaryStructureForm({ employeeId, strategy, current, onClose, onSaved }) {
  const [form, setForm] = useState({
    basic: String(current?.basic ?? 0),
    housing: String(current?.housing ?? 0),
    transport: String(current?.transport ?? 0),
    subsidy: String(current?.subsidy ?? 0),
    dataAllowance: String(current?.dataAllowance ?? 0),
    exGratia: String(current?.exGratia ?? 0),
    referralBonus: String(current?.referralBonus ?? 0),
    overtime: String(current?.overtime ?? 0),
    grossMonthly: String(current?.grossMonthly ?? 0),
    commissionPerTrip: String(current?.commissionPerTrip ?? 0),
    payeApplicable: current?.payeApplicable ?? true,
    pensionApplicable: current?.pensionApplicable ?? true,
    nhfApplicable: current?.nhfApplicable ?? false,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    reason: "",
  });
  const { mutate, loading, error } = useMutation((client, body) =>
    client.put(`/hrm/payroll/structures/${employeeId}`, body),
  );

  const num = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const chk = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const allowanceGross =
    toNum(form.basic) + toNum(form.housing) + toNum(form.transport) + toNum(form.subsidy) +
    toNum(form.dataAllowance) + toNum(form.exGratia) + toNum(form.referralBonus) + toNum(form.overtime);
  const previewGross =
    strategy === "fixed-monthly" ? toNum(form.grossMonthly) || allowanceGross : allowanceGross;

  async function submit(e) {
    e.preventDefault();
    const body = { ...form };
    for (const f of MONEY_FIELDS) body[f] = toNum(form[f]);
    try {
      await mutate(body);
      toast.success("Salary structure updated");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Salary structure"
      description={
        strategy === "fixed-monthly"
          ? "Fixed monthly salary"
          : strategy === "hybrid"
            ? "Base salary + per-trip commission"
            : "Allowance-based (basic + allowances, with PAYE & pension)"
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="ss-form" type="submit" loading={loading}>
            Save structure
          </Button>
        </>
      }
    >
      <form id="ss-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}

        {strategy === "fixed-monthly" && (
          <TextField
            label="Gross monthly salary (NGN)"
            type="number"
            min="0"
            step="0.01"
            value={form.grossMonthly}
            onChange={num("grossMonthly")}
          />
        )}

        {strategy === "hybrid" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Base salary (NGN)" type="number" min="0" step="0.01" value={form.basic} onChange={num("basic")} />
            <TextField
              label="Commission per trip (NGN)"
              type="number"
              min="0"
              step="0.01"
              value={form.commissionPerTrip}
              onChange={num("commissionPerTrip")}
            />
            <TextField label="Ex gratia" type="number" min="0" step="0.01" value={form.exGratia} onChange={num("exGratia")} />
            <TextField label="Referral bonus" type="number" min="0" step="0.01" value={form.referralBonus} onChange={num("referralBonus")} />
            <TextField label="Overtime" type="number" min="0" step="0.01" hint="Not taxed" value={form.overtime} onChange={num("overtime")} />
          </div>
        )}

        {strategy === "allowance-based" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Basic (NGN)" type="number" min="0" step="0.01" value={form.basic} onChange={num("basic")} />
            <TextField label="Housing allowance" type="number" min="0" step="0.01" value={form.housing} onChange={num("housing")} />
            <TextField label="Transport allowance" type="number" min="0" step="0.01" value={form.transport} onChange={num("transport")} />
            <TextField label="Subsidy" type="number" min="0" step="0.01" value={form.subsidy} onChange={num("subsidy")} />
            <TextField label="Data allowance" type="number" min="0" step="0.01" value={form.dataAllowance} onChange={num("dataAllowance")} />
            <TextField label="Ex gratia" type="number" min="0" step="0.01" value={form.exGratia} onChange={num("exGratia")} />
            <TextField label="Referral bonus" type="number" min="0" step="0.01" value={form.referralBonus} onChange={num("referralBonus")} />
            <TextField label="Overtime" type="number" min="0" step="0.01" hint="Not taxed" value={form.overtime} onChange={num("overtime")} />
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.payeApplicable} onChange={chk("payeApplicable")} /> PAYE tax
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.pensionApplicable} onChange={chk("pensionApplicable")} /> Pension (8%)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.nhfApplicable} onChange={chk("nhfApplicable")} /> NHF (2.5%)
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Effective from"
            type="date"
            value={form.effectiveFrom}
            onChange={(e) => setForm((f) => ({ ...f, effectiveFrom: e.target.value }))}
          />
        </div>
        <Textarea
          label="Reason for change"
          rows={2}
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
        />

        <div className="rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
          Fixed gross:{" "}
          <span className="font-medium text-ink-900">{money(previewGross)}</span>
          {strategy === "hybrid" && (
            <span className="text-ink-500"> + commission per completed trip</span>
          )}
        </div>
      </form>
    </Modal>
  );
}
