import { useMemo, useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Select from "../ui/Select.jsx";
import TextField from "../ui/TextField.jsx";
import Textarea from "../ui/Textarea.jsx";
import Alert from "../ui/Alert.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { toast } from "../../store/toast.js";
import { days as fmtDays } from "../../utils/format.js";

/** Rough working-day estimate for the live hint (server is authoritative). */
function estimateDays(start, end, includeWeekends, halfStart, halfEnd) {
  if (!start || !end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return null;
  let n = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    const wd = d.getDay();
    if (includeWeekends || (wd !== 0 && wd !== 6)) n += 1;
  }
  if (halfStart) n -= 0.5;
  if (halfEnd && end !== start) n -= 0.5;
  return Math.max(0, n);
}

export default function LeaveRequestForm({ onBehalf = false, onClose, onSaved }) {
  const types = useApiQuery("/hrm/leave/types", { params: { active: "true" } });
  const employees = useApiQuery("/hrm/employees", {
    params: { limit: 200, status: "active", sort: "lastName" },
    skip: !onBehalf,
  });

  const [form, setForm] = useState({
    employee: "",
    leaveType: "",
    startDate: "",
    endDate: "",
    halfDayStart: false,
    halfDayEnd: false,
    reason: "",
    supportingDocumentUrl: "",
    contactWhileAway: "",
  });

  const selectedType = useMemo(
    () => (types.data || []).find((t) => t.id === form.leaveType),
    [types.data, form.leaveType],
  );

  const { mutate, loading, error } = useMutation((client, body) =>
    client.post("/hrm/leave/requests", body),
  );
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  const estimate = estimateDays(
    form.startDate,
    form.endDate,
    selectedType?.includeWeekends,
    form.halfDayStart,
    form.halfDayEnd,
  );

  async function submit(e) {
    e.preventDefault();
    const body = {
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      halfDayStart: form.halfDayStart,
      halfDayEnd: form.halfDayEnd,
      reason: form.reason,
    };
    if (form.supportingDocumentUrl) body.supportingDocumentUrl = form.supportingDocumentUrl;
    if (form.contactWhileAway) body.contactWhileAway = form.contactWhileAway;
    if (onBehalf && form.employee) body.employee = form.employee;
    try {
      const saved = await mutate(body);
      toast.success(`Leave request ${saved.reference} submitted`);
      onSaved(saved);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={onBehalf ? "Record leave for an employee" : "Request leave"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="leave-form" type="submit" loading={loading}>
            Submit request
          </Button>
        </>
      }
    >
      <form id="leave-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}

        {onBehalf && (
          <Select
            label="Employee"
            required
            placeholder="Select employee"
            options={(employees.data || []).map((e) => ({
              value: e.id,
              label: `${e.firstName} ${e.lastName} — ${e.employeeId}`,
            }))}
            value={form.employee}
            error={errs.employee}
            onChange={set("employee")}
          />
        )}

        <Select
          label="Leave type"
          required
          placeholder="Select leave type"
          options={(types.data || []).map((t) => ({
            value: t.id,
            label: `${t.name}${t.paid ? "" : " (unpaid)"}`,
          }))}
          value={form.leaveType}
          error={errs.leaveType}
          onChange={set("leaveType")}
        />
        {selectedType && (
          <p className="-mt-2 text-xs text-ink-500">
            {selectedType.defaultDaysPerYear} days/year ·{" "}
            {selectedType.minNoticeDays > 0 ? `${selectedType.minNoticeDays} days notice · ` : ""}
            {selectedType.requiresDocument ? "supporting document required" : "no document required"}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Start date"
            type="date"
            required
            value={form.startDate}
            error={errs.startDate}
            onChange={set("startDate")}
          />
          <TextField
            label="End date"
            type="date"
            required
            value={form.endDate}
            min={form.startDate || undefined}
            error={errs.endDate}
            onChange={set("endDate")}
          />
        </div>

        {selectedType?.allowHalfDay && (
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.halfDayStart} onChange={toggle("halfDayStart")} />
              Half day on start date
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.halfDayEnd} onChange={toggle("halfDayEnd")} />
              Half day on end date
            </label>
          </div>
        )}

        {estimate != null && (
          <p className="text-sm text-ink-600">
            Chargeable: <span className="font-medium text-ink-900">{fmtDays(estimate)}</span>{" "}
            <span className="text-ink-400">(server confirms on submit)</span>
          </p>
        )}

        <Textarea
          label="Reason"
          required
          rows={3}
          value={form.reason}
          error={errs.reason}
          onChange={set("reason")}
        />

        {selectedType?.requiresDocument && (
          <TextField
            label="Supporting document URL"
            required={!onBehalf}
            placeholder="Link to uploaded document"
            value={form.supportingDocumentUrl}
            error={errs.supportingDocumentUrl}
            onChange={set("supportingDocumentUrl")}
          />
        )}

        <TextField
          label="Contact while away"
          placeholder="Phone or email"
          value={form.contactWhileAway}
          onChange={set("contactWhileAway")}
        />
      </form>
    </Modal>
  );
}
