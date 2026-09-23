import { useMemo, useState } from "react";
import Button from "../../ui/Button.jsx";
import Modal from "../../ui/Modal.jsx";
import TextField from "../../ui/TextField.jsx";
import Textarea from "../../ui/Textarea.jsx";
import Select from "../../ui/Select.jsx";
import Badge from "../../ui/Badge.jsx";
import EmptyState from "../../ui/EmptyState.jsx";
import Spinner from "../../ui/Spinner.jsx";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../../hooks/useMutation.js";
import { useAuth } from "../../../store/auth.js";
import { toast } from "../../../store/toast.js";
import { dateShort } from "../../../utils/format.js";

const REFERRAL_TONE = { submitted: "blue", interviewing: "amber", hired: "green", not_selected: "slate" };
const referralLabel = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function PerformanceTab({ employee }) {
  const can = useAuth((s) => s.can);
  const canView = can("performance:read");
  const canManage = can("performance:write");
  const [addingReferral, setAddingReferral] = useState(false);

  const ranking = useApiQuery("/hrm/attendance/reports/punctuality", { skip: !canView });
  const referrals = useApiQuery("/hrm/referrals", { params: { employee: employee.id }, skip: !canView });

  const mine = useMemo(
    () => (ranking.data || []).find((r) => r.employee.id === employee.id),
    [ranking.data, employee.id],
  );

  if (!canView) {
    return <EmptyState title="Restricted" description="You cannot view this employee's performance." />;
  }
  if (ranking.loading) {
    return (
      <div className="flex justify-center py-10 text-ink-400">
        <Spinner size={22} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-900">Punctuality</h3>
        {mine ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Rank" value={`#${mine.rank}`} />
            <Stat label="Times early" value={mine.timesEarly} tone="green" />
            <Stat label="Times late" value={mine.timesLate} tone="red" />
            <Stat label="Days tracked" value={mine.totalDays} />
          </div>
        ) : (
          <p className="text-sm text-ink-500">No clock-in history yet.</p>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Referrals</h3>
          {canManage && (
            <Button variant="secondary" onClick={() => setAddingReferral(true)}>
              Add referral
            </Button>
          )}
        </div>
        {referrals.loading ? (
          <Spinner size={18} />
        ) : (referrals.data || []).length === 0 ? (
          <p className="text-sm text-ink-500">No referrals logged for this employee.</p>
        ) : (
          <ul className="space-y-2">
            {referrals.data.map((r) => (
              <li key={r.id} className="card flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{r.referredName}</p>
                  <p className="truncate text-xs text-ink-500">
                    {r.referredFor ? `${r.referredFor} · ` : ""}
                    {dateShort(r.dateReferred)}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <Badge tone={REFERRAL_TONE[r.status]}>{referralLabel(r.status)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {addingReferral && (
        <ReferralForm
          employee={employee}
          onClose={() => setAddingReferral(false)}
          onSaved={() => {
            setAddingReferral(false);
            referrals.refetch();
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className="card p-3">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === "green" ? "text-emerald-600" : tone === "red" ? "text-red-600" : "text-ink-900"}`}>
        {value}
      </p>
    </div>
  );
}

function ReferralForm({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    referredName: "",
    referredContact: "",
    referredFor: "",
    dateReferred: new Date().toISOString().slice(0, 10),
    status: "submitted",
    notes: "",
  });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/referrals", body));
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    try {
      await mutate({ ...form, employee: employee.id });
      toast.success("Referral logged");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Add referral"
      description={`Credited to ${employee.firstName} ${employee.lastName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="referral-form" type="submit" loading={loading}>
            Save
          </Button>
        </>
      }
    >
      <form id="referral-form" onSubmit={submit} className="space-y-4">
        <TextField
          label="Referred person's name"
          required
          value={form.referredName}
          error={errs.referredName}
          onChange={(e) => setForm((f) => ({ ...f, referredName: e.target.value }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Contact" value={form.referredContact} onChange={(e) => setForm((f) => ({ ...f, referredContact: e.target.value }))} />
          <TextField label="Referred for (role)" value={form.referredFor} onChange={(e) => setForm((f) => ({ ...f, referredFor: e.target.value }))} />
          <TextField label="Date referred" type="date" value={form.dateReferred} onChange={(e) => setForm((f) => ({ ...f, dateReferred: e.target.value }))} />
          <Select
            label="Status"
            options={["submitted", "interviewing", "hired", "not_selected"].map((v) => ({ value: v, label: referralLabel(v) }))}
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
          />
        </div>
        <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </form>
    </Modal>
  );
}
