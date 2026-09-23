import { useState } from "react";
import Button from "../../ui/Button.jsx";
import Modal from "../../ui/Modal.jsx";
import TextField from "../../ui/TextField.jsx";
import Textarea from "../../ui/Textarea.jsx";
import Select from "../../ui/Select.jsx";
import EmptyState from "../../ui/EmptyState.jsx";
import Spinner from "../../ui/Spinner.jsx";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../../hooks/useMutation.js";
import { useAuth } from "../../../store/auth.js";
import { toast } from "../../../store/toast.js";
import { dateShort } from "../../../utils/format.js";

export default function TrainingsTab({ employee }) {
  const canRecord = useAuth((s) => s.can("employee:write"));
  const [recording, setRecording] = useState(false);

  const attendance = useApiQuery("/hrm/trainings/attendance", { params: { employee: employee.id } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900">Trainings attended</h3>
        {canRecord && <Button variant="secondary" onClick={() => setRecording(true)}>Record training</Button>}
      </div>

      {attendance.loading ? (
        <div className="flex justify-center py-10 text-ink-400">
          <Spinner size={22} />
        </div>
      ) : attendance.error ? (
        <EmptyState title="Could not load" description={attendance.error.message} />
      ) : (attendance.data || []).length === 0 ? (
        <p className="text-sm text-ink-500">No trainings recorded for this employee yet.</p>
      ) : (
        <ul className="space-y-2">
          {attendance.data.map((a) => (
            <li key={a.id} className="card p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-sm font-medium text-ink-900">{a.training?.name || a.trainingName}</p>
                <span className="shrink-0 text-xs text-ink-500">{dateShort(a.dateAttended)}</span>
              </div>
              {(a.training?.category || a.notes) && (
                <p className="mt-0.5 text-xs text-ink-500">
                  {a.training?.category}
                  {a.training?.category && a.notes ? " · " : ""}
                  {a.notes}
                </p>
              )}
              {a.certificateUrl && (
                <a href={a.certificateUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs link">
                  View certificate
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {recording && (
        <RecordTrainingForm
          employee={employee}
          onClose={() => setRecording(false)}
          onSaved={() => {
            setRecording(false);
            attendance.refetch();
          }}
        />
      )}
    </div>
  );
}

function RecordTrainingForm({ employee, onClose, onSaved }) {
  const catalog = useApiQuery("/hrm/trainings", { params: { active: "true" } });
  const [form, setForm] = useState({
    training: "",
    dateAttended: new Date().toISOString().slice(0, 10),
    certificateUrl: "",
    notes: "",
  });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/trainings/attendance", body));
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    if (!form.training) {
      toast.error("Choose a training");
      return;
    }
    try {
      await mutate({ ...form, employee: employee.id });
      toast.success("Training recorded");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Record training"
      description={`${employee.firstName} ${employee.lastName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="training-form" type="submit" loading={loading}>
            Save
          </Button>
        </>
      }
    >
      <form id="training-form" onSubmit={submit} className="space-y-4">
        <Select
          label="Training"
          required
          placeholder={catalog.data?.length ? "Select a training" : "No trainings in the catalog yet"}
          options={(catalog.data || []).map((t) => ({ value: t.id, label: t.name }))}
          value={form.training}
          error={errs.training}
          onChange={(e) => setForm((f) => ({ ...f, training: e.target.value }))}
        />
        <TextField label="Date attended" type="date" required value={form.dateAttended} onChange={(e) => setForm((f) => ({ ...f, dateAttended: e.target.value }))} />
        <TextField label="Certificate URL" value={form.certificateUrl} onChange={(e) => setForm((f) => ({ ...f, certificateUrl: e.target.value }))} />
        <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </form>
    </Modal>
  );
}
