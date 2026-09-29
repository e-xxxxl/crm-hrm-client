import { useState } from "react";
import DataTable from "../ui/DataTable.jsx";
import Badge from "../ui/Badge.jsx";
import Button from "../ui/Button.jsx";
import Modal from "../ui/Modal.jsx";
import TextField from "../ui/TextField.jsx";
import Textarea from "../ui/Textarea.jsx";
import Alert from "../ui/Alert.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { dateShort } from "../../utils/format.js";

export default function HolidayManager() {
  const canWrite = useAuth((s) => s.can("leave:configure"));
  const list = useApiQuery("/hrm/holidays", { params: {} });
  const [editing, setEditing] = useState(null);
  const remove = useMutation((client, id) => client.delete(`/hrm/holidays/${id}`));

  async function handleDelete(row) {
    if (!confirm(`Delete holiday "${row.name}"?`)) return;
    try {
      await remove.mutate(row.id);
      toast.success(`${row.name} deleted`);
      list.refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Holidays</h2>
          <p className="text-xs text-ink-500">Shows automatically on the leave calendar for everyone.</p>
        </div>
        {canWrite && <Button onClick={() => setEditing("new")}>New holiday</Button>}
      </div>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No holidays set up", description: "Add public and company holidays here." }}
        columns={[
          { key: "name", header: "Name", primary: true, render: (r) => r.name },
          { key: "date", header: "Date", render: (r) => dateShort(r.date) },
          { key: "recurring", header: "Repeats yearly", render: (r) => (r.recurringAnnually ? <Badge tone="green">Yes</Badge> : <Badge tone="neutral">One-off</Badge>) },
          { key: "notes", header: "Notes", secondary: true, render: (r) => r.notes || "—" },
        ]}
        rowActions={
          canWrite
            ? (row) => (
                <div className="flex justify-end gap-3">
                  <button type="button" className="text-xs font-medium text-brand-600 hover:text-brand-700" onClick={() => setEditing(row)}>
                    Edit
                  </button>
                  <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700" onClick={() => handleDelete(row)}>
                    Delete
                  </button>
                </div>
              )
            : undefined
        }
      />

      {editing && (
        <HolidayForm
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

function HolidayForm({ value, onClose, onSaved }) {
  const isNew = !value;
  const [form, setForm] = useState({
    name: value?.name || "",
    date: value?.date ? value.date.slice(0, 10) : "",
    recurringAnnually: value?.recurringAnnually ?? true,
    notes: value?.notes || "",
  });
  const { mutate, loading, error } = useMutation((client, body) =>
    isNew ? client.post("/hrm/holidays", body) : client.patch(`/hrm/holidays/${value.id}`, body),
  );
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    try {
      await mutate({ ...form, notes: form.notes || undefined });
      toast.success(isNew ? "Holiday added" : "Holiday updated");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "New holiday" : `Edit ${value.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="holiday-form" type="submit" loading={loading}>
            {isNew ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <form id="holiday-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Name" required value={form.name} error={errs.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <TextField label="Date" type="date" required value={form.date} error={errs.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.recurringAnnually}
            onChange={(e) => setForm((f) => ({ ...f, recurringAnnually: e.target.checked }))}
          />
          Repeats every year on this month/day
        </label>
        <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </form>
    </Modal>
  );
}
