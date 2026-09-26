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

/**
 * Org-scoped training catalog — the source list for the "Record training"
 * dropdown on an employee's Trainings attended tab. Only a Super Admin /
 * Group Admin can create new entries; HR Manager can additionally edit,
 * (de)activate, and delete existing ones.
 */
export default function TrainingManager() {
  const canCreate = useAuth((s) => s.can("training:write"));
  const session = useAuth((s) => s.session);
  const canEdit = canCreate || session?.role === "HR Manager";
  const list = useApiQuery("/hrm/trainings", { params: {} });
  const [editing, setEditing] = useState(null);
  const toggle = useMutation((client, { id, active }) => client.patch(`/hrm/trainings/${id}/active`, { active }));
  const remove = useMutation((client, id) => client.delete(`/hrm/trainings/${id}`));

  async function setActive(row, active) {
    try {
      await toggle.mutate({ id: row.id, active });
      toast.success(`${row.name} ${active ? "activated" : "deactivated"}`);
      list.refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete(row) {
    if (!confirm(`Delete training "${row.name}"? This only works if no attendance record ever used it.`)) return;
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
        <h2 className="text-sm font-semibold text-ink-900">Training catalog</h2>
        {canCreate && <Button onClick={() => setEditing("new")}>New training</Button>}
      </div>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No trainings yet", description: "Add the trainings employees can be recorded as having attended." }}
        columns={[
          { key: "name", header: "Name", primary: true, render: (r) => r.name },
          { key: "category", header: "Category", secondary: true, render: (r) => r.category || "—" },
          { key: "provider", header: "Provider", secondary: true, render: (r) => r.provider || "—" },
          { key: "active", header: "Status", render: (r) => <Badge status={r.active ? "active" : "inactive"} /> },
        ]}
        rowActions={(row) =>
          canEdit && (
            <div className="flex justify-end gap-3">
              <button type="button" className="text-xs font-medium text-brand-600 hover:text-brand-700" onClick={() => setEditing(row)}>
                Edit
              </button>
              <button type="button" className="text-xs font-medium text-ink-500 hover:text-ink-700" onClick={() => setActive(row, !row.active)}>
                {row.active ? "Deactivate" : "Activate"}
              </button>
              <button type="button" className="text-xs font-medium text-red-600 hover:text-red-700" onClick={() => handleDelete(row)}>
                Delete
              </button>
            </div>
          )
        }
      />

      {editing && (
        <TrainingForm
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

function TrainingForm({ value, onClose, onSaved }) {
  const isNew = !value;
  const [form, setForm] = useState({
    name: value?.name || "",
    description: value?.description || "",
    category: value?.category || "",
    provider: value?.provider || "",
  });
  const { mutate, loading, error } = useMutation((client, body) =>
    isNew ? client.post("/hrm/trainings", body) : client.patch(`/hrm/trainings/${value.id}`, body),
  );
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    try {
      await mutate(form);
      toast.success(isNew ? "Training created" : "Training updated");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "New training" : `Edit ${value.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="training-catalog-form" type="submit" loading={loading}>
            {isNew ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <form id="training-catalog-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Name" required value={form.name} error={errs.name} onChange={set("name")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Category" placeholder="Compliance, Safety, Onboarding…" value={form.category} onChange={set("category")} />
          <TextField label="Provider" placeholder="Internal or vendor name" value={form.provider} onChange={set("provider")} />
        </div>
        <Textarea label="Description" rows={2} value={form.description} onChange={set("description")} />
      </form>
    </Modal>
  );
}
