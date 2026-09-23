import { useState } from "react";
import DataTable from "../ui/DataTable.jsx";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Modal from "../ui/Modal.jsx";
import TextField from "../ui/TextField.jsx";
import Select from "../ui/Select.jsx";
import Textarea from "../ui/Textarea.jsx";
import Alert from "../ui/Alert.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { toast } from "../../store/toast.js";
import { days as fmtDays } from "../../utils/format.js";

const CATEGORIES = ["annual", "casual", "sick", "maternity", "paternity", "compassionate", "unpaid", "other"];

export default function LeaveTypeManager() {
  const list = useApiQuery("/hrm/leave/types", { params: {} });
  const [editing, setEditing] = useState(null);
  const toggle = useMutation((client, { id, active }) =>
    client.patch(`/hrm/leave/types/${id}/active`, { active }),
  );

  async function setActive(row, active) {
    try {
      await toggle.mutate({ id: row.id, active });
      toast.success(`${row.name} ${active ? "activated" : "deactivated"}`);
      list.refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Leave types</h2>
        <Button onClick={() => setEditing("new")}>New leave type</Button>
      </div>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No leave types", description: "Create your organisation's leave types." }}
        columns={[
          { key: "name", header: "Name", primary: true, render: (r) => r.name },
          { key: "code", header: "Code", render: (r) => r.code },
          { key: "category", header: "Category", secondary: true, render: (r) => r.category },
          { key: "entitlement", header: "Per year", align: "right", render: (r) => fmtDays(r.defaultDaysPerYear) },
          { key: "paid", header: "Paid", render: (r) => (r.paid ? "Yes" : "No") },
          {
            key: "rules",
            header: "Rules",
            render: (r) =>
              [
                r.minNoticeDays ? `${r.minNoticeDays}d notice` : null,
                r.requiresDocument ? "document" : null,
                r.genderEligibility !== "any" ? r.genderEligibility : null,
              ]
                .filter(Boolean)
                .join(", ") || "—",
          },
          { key: "active", header: "Status", render: (r) => <Badge status={r.active ? "active" : "inactive"} /> },
        ]}
        rowActions={(row) => (
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
              onClick={() => setEditing(row)}
            >
              Edit
            </button>
            <button
              type="button"
              className="text-xs font-medium text-ink-500 hover:text-ink-700"
              onClick={() => setActive(row, !row.active)}
            >
              {row.active ? "Deactivate" : "Activate"}
            </button>
          </div>
        )}
      />

      {editing && (
        <LeaveTypeForm
          value={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.refetch();
          }}
        />
      )}
    </>
  );
}

function LeaveTypeForm({ value, onClose, onSaved }) {
  const isNew = !value;
  const [form, setForm] = useState({
    name: value?.name || "",
    code: value?.code || "",
    category: value?.category || "annual",
    description: value?.description || "",
    paid: value?.paid ?? true,
    defaultDaysPerYear: value?.defaultDaysPerYear ?? 0,
    accrual: value?.accrual || "annual",
    carryOverMaxDays: value?.carryOverMaxDays ?? 0,
    genderEligibility: value?.genderEligibility || "any",
    minTenureMonths: value?.minTenureMonths ?? 0,
    minNoticeDays: value?.minNoticeDays ?? 0,
    maxConsecutiveDays: value?.maxConsecutiveDays ?? 0,
    allowHalfDay: value?.allowHalfDay ?? true,
    includeWeekends: value?.includeWeekends ?? false,
    requiresDocument: value?.requiresDocument ?? false,
    countsTowardCoverage: value?.countsTowardCoverage ?? true,
  });

  const { mutate, loading, error } = useMutation((client, body) =>
    isNew ? client.post("/hrm/leave/types", body) : client.patch(`/hrm/leave/types/${value.id}`, body),
  );
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (k) => (e) => setForm((f) => ({ ...f, [k]: Number(e.target.value) }));
  const chk = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  async function submit(e) {
    e.preventDefault();
    try {
      await mutate(form);
      toast.success(isNew ? "Leave type created" : "Leave type updated");
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
      title={isNew ? "New leave type" : `Edit ${value.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="lt-form" type="submit" loading={loading}>
            {isNew ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <form id="lt-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" required value={form.name} error={errs.name} onChange={set("name")} />
          <TextField
            label="Code"
            required
            value={form.code}
            error={errs.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
          />
          <Select label="Category" options={CATEGORIES} value={form.category} onChange={set("category")} />
          <Select
            label="Accrual"
            options={[
              { value: "annual", label: "Annual (full entitlement upfront)" },
              { value: "monthly", label: "Monthly" },
              { value: "none", label: "None (fixed event)" },
            ]}
            value={form.accrual}
            onChange={set("accrual")}
          />
          <TextField
            label="Days per year"
            type="number"
            min="0"
            value={form.defaultDaysPerYear}
            error={errs.defaultDaysPerYear}
            onChange={num("defaultDaysPerYear")}
          />
          <TextField label="Carry-over max" type="number" min="0" value={form.carryOverMaxDays} onChange={num("carryOverMaxDays")} />
          <TextField label="Min notice (days)" type="number" min="0" value={form.minNoticeDays} onChange={num("minNoticeDays")} />
          <TextField label="Min tenure (months)" type="number" min="0" value={form.minTenureMonths} onChange={num("minTenureMonths")} />
          <TextField label="Max consecutive days (0 = none)" type="number" min="0" value={form.maxConsecutiveDays} onChange={num("maxConsecutiveDays")} />
          <Select
            label="Eligibility"
            options={[
              { value: "any", label: "All employees" },
              { value: "Female", label: "Female only" },
              { value: "Male", label: "Male only" },
            ]}
            value={form.genderEligibility}
            onChange={set("genderEligibility")}
          />
        </div>

        <Textarea label="Description" rows={2} value={form.description} onChange={set("description")} />

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.paid} onChange={chk("paid")} /> Paid leave
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.allowHalfDay} onChange={chk("allowHalfDay")} /> Allow half days
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.includeWeekends} onChange={chk("includeWeekends")} /> Count weekends
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.requiresDocument} onChange={chk("requiresDocument")} /> Requires document
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.countsTowardCoverage} onChange={chk("countsTowardCoverage")} /> Counts toward branch coverage
          </label>
        </div>
      </form>
    </Modal>
  );
}
