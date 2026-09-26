import { useState } from "react";
import Button from "../../ui/Button.jsx";
import Badge from "../../ui/Badge.jsx";
import Modal from "../../ui/Modal.jsx";
import TextField from "../../ui/TextField.jsx";
import Textarea from "../../ui/Textarea.jsx";
import Select from "../../ui/Select.jsx";
import EmptyState from "../../ui/EmptyState.jsx";
import Spinner from "../../ui/Spinner.jsx";
import FileInput from "../../ui/FileInput.jsx";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../../hooks/useMutation.js";
import { useAuth } from "../../../store/auth.js";
import { toast } from "../../../store/toast.js";
import { dateShort } from "../../../utils/format.js";

const CATEGORIES = ["contract", "identification", "certification", "education", "hr_letter", "medical", "other"];
const label = (c) => c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function DocumentsTab({ employee }) {
  const canWrite = useAuth((s) => s.can("document:write"));
  const [uploading, setUploading] = useState(false);

  const list = useApiQuery("/hrm/documents", { params: { employee: employee.id, limit: 100 } });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900">Documents &amp; Contracts</h3>
        {canWrite && <Button variant="secondary" onClick={() => setUploading(true)}>Add document</Button>}
      </div>

      {list.loading ? (
        <div className="flex justify-center py-10 text-ink-400">
          <Spinner size={22} />
        </div>
      ) : list.error ? (
        <EmptyState title="Could not load" description={list.error.message} />
      ) : (list.data || []).length === 0 ? (
        <p className="text-sm text-ink-500">No document uploaded yet.</p>
      ) : (
        <ul className="space-y-2">
          {list.data.map((d) => (
            <li key={d.id} className="card flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink-900">{d.name}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {label(d.category)}
                  {d.expiryDate ? ` · expires ${dateShort(d.expiryDate)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge status={d.status} />
                <a href={`/api${d.fileUrl}`} target="_blank" rel="noreferrer" className="link text-xs">
                  Open
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {uploading && (
        <UploadForm
          employee={employee}
          onClose={() => setUploading(false)}
          onSaved={() => {
            setUploading(false);
            list.refetch();
          }}
        />
      )}
    </div>
  );
}

function UploadForm({ employee, onClose, onSaved }) {
  const [form, setForm] = useState({
    category: "contract",
    name: "",
    description: "",
    fileUrl: "",
    fileName: "",
    fileType: "",
    fileSize: undefined,
    issueDate: "",
    expiryDate: "",
  });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/documents", body));
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    if (!form.fileUrl) {
      toast.error("Upload a file first");
      return;
    }
    try {
      await mutate({
        employee: employee.id,
        category: form.category,
        name: form.name,
        description: form.description || undefined,
        fileUrl: form.fileUrl,
        fileName: form.fileName || undefined,
        fileType: form.fileType || undefined,
        fileSize: form.fileSize,
        issueDate: form.issueDate || undefined,
        expiryDate: form.expiryDate || undefined,
      });
      toast.success("Document added");
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
      title="Add document"
      description={`${employee.firstName} ${employee.lastName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="emp-doc-form" type="submit" loading={loading}>
            Save
          </Button>
        </>
      }
    >
      <form id="emp-doc-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <p className="text-sm text-red-600">{error.message}</p>}
        <FileInput
          label="File"
          value={form.fileUrl ? { name: form.fileName } : null}
          onUploaded={(result, file) =>
            setForm((f) => ({
              ...f,
              fileUrl: result.url,
              fileName: result.originalName || file.name,
              fileType: result.mimeType,
              fileSize: result.size,
              name: f.name || (result.originalName || file.name).replace(/\.[^.]+$/, ""),
            }))
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Document name" required value={form.name} error={errs.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Select
            label="Category"
            options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))}
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <TextField label="Issue date" type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
          <TextField label="Expiry date" type="date" hint="Alerts fire 30, 14 and 7 days before" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
        </div>
        <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </form>
    </Modal>
  );
}
