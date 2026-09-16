import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import FileInput from "../../components/ui/FileInput.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { documents as api } from "../../services/hrm.js";
import { dateShort } from "../../utils/format.js";

const CATEGORIES = ["contract", "identification", "certification", "education", "hr_letter", "medical", "other"];
const label = (c) => c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function Documents() {
  const can = useAuth((s) => s.can);
  const canWrite = can("document:write");
  const canDelete = can("document:delete");

  const [filters, setFilters] = useState({ search: "", category: "", status: "", scope: "" });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const search = useDebouncedValue(filters.search);

  const summary = useApiQuery("/hrm/documents/summary");
  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      category: filters.category || undefined,
      status: filters.status || undefined,
      orgLevel: filters.scope === "org" ? "true" : undefined,
    }),
    [page, search, filters],
  );
  const list = useApiQuery("/hrm/documents", { params });

  const s = summary.data;

  return (
    <>
      <PageHeader
        title="Documents & Contracts"
        actions={canWrite && <Button onClick={() => setEditing("new")}>Add document</Button>}
      />

      {s && (s.expired > 0 || s.within7 > 0 || s.within14 > 0 || s.within30 > 0) && (
        <div className="mb-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
          <Tile label="Expired" value={s.expired} tone={s.expired ? "red" : undefined} />
          <Tile label="≤ 7 days" value={s.within7} tone={s.within7 ? "amber" : undefined} />
          <Tile label="≤ 14 days" value={s.within14} />
          <Tile label="≤ 30 days" value={s.within30} />
        </div>
      )}

      <FilterBar
        active={filters.search || filters.category || filters.status || filters.scope}
        onClear={() => {
          setFilters({ search: "", category: "", status: "", scope: "" });
          setPage(1);
        }}
      >
        <SearchInput
          value={filters.search}
          onChange={(v) => {
            setFilters((f) => ({ ...f, search: v }));
            setPage(1);
          }}
          placeholder="Search documents"
        />
        <Select
          className="lg:w-44"
          placeholder="All categories"
          options={CATEGORIES.map((c) => ({ value: c, label: label(c) }))}
          value={filters.category}
          onChange={(e) => {
            setFilters((f) => ({ ...f, category: e.target.value }));
            setPage(1);
          }}
        />
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={["active", "expiring", "expired", "archived"]}
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: e.target.value }));
            setPage(1);
          }}
        />
        <Select
          className="lg:w-40"
          placeholder="All documents"
          options={[{ value: "org", label: "Organisation only" }]}
          value={filters.scope}
          onChange={(e) => {
            setFilters((f) => ({ ...f, scope: e.target.value }));
            setPage(1);
          }}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No documents", description: "Upload contracts, IDs and certifications here." }}
        columns={[
          { key: "name", header: "Document", primary: true, render: (d) => d.name },
          { key: "category", header: "Category", render: (d) => label(d.category) },
          {
            key: "employee",
            header: "Employee",
            secondary: true,
            render: (d) => (d.employee ? `${d.employee.firstName} ${d.employee.lastName}` : "Organisation"),
          },
          { key: "issued", header: "Issued", render: (d) => (d.issueDate ? dateShort(d.issueDate) : "—") },
          {
            key: "expiry",
            header: "Expires",
            render: (d) =>
              d.expiryDate ? (
                <span className={d.status === "expired" ? "text-red-600" : d.status === "expiring" ? "text-amber-600" : ""}>
                  {dateShort(d.expiryDate)}
                </span>
              ) : (
                "—"
              ),
          },
          { key: "status", header: "Status", render: (d) => <Badge status={d.status} /> },
          {
            key: "actions",
            header: "",
            hideOnMobile: true,
            render: (d) => (
              <div className="flex justify-end gap-3 text-xs">
                <a href={`/api${d.fileUrl}`} target="_blank" rel="noreferrer" className="link">
                  Open
                </a>
                {canWrite && (
                  <button type="button" className="link" onClick={() => setEditing(d)}>
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-700"
                    onClick={async () => {
                      if (!confirm(`Delete "${d.name}"?`)) return;
                      await api.remove(d.id);
                      toast.success("Document deleted");
                      list.refetch();
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ),
          },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {editing && (
        <DocumentForm
          value={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.refetch();
            summary.refetch();
          }}
        />
      )}
    </>
  );
}

function Tile({ label: l, value, tone }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{l}</p>
      <p className={`mt-0.5 text-lg font-semibold ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>
        {value}
      </p>
    </div>
  );
}

function DocumentForm({ value, onClose, onSaved }) {
  const isNew = !value;
  const employees = useApiQuery("/hrm/employees", { params: { limit: 300, status: "active", sort: "lastName" } });
  const [form, setForm] = useState({
    employee: value?.employee?.id || value?.employee || "",
    category: value?.category || "contract",
    name: value?.name || "",
    description: value?.description || "",
    fileUrl: value?.fileUrl || "",
    fileName: value?.fileName || "",
    fileType: value?.fileType || "",
    fileSize: value?.fileSize || undefined,
    issueDate: value?.issueDate ? value.issueDate.slice(0, 10) : "",
    expiryDate: value?.expiryDate ? value.expiryDate.slice(0, 10) : "",
  });
  const { mutate, loading, error } = useMutation((client, body) =>
    isNew ? client.post("/hrm/documents", body) : client.patch(`/hrm/documents/${value.id}`, body),
  );
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    if (!form.fileUrl) {
      toast.error("Upload a file first");
      return;
    }
    const body = {
      category: form.category,
      name: form.name,
      description: form.description || undefined,
      fileUrl: form.fileUrl,
      fileName: form.fileName || undefined,
      fileType: form.fileType || undefined,
      fileSize: form.fileSize,
      issueDate: form.issueDate || undefined,
      expiryDate: form.expiryDate || undefined,
    };
    if (form.employee) body.employee = form.employee;
    try {
      await mutate(body);
      toast.success(isNew ? "Document added" : "Document updated");
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
      title={isNew ? "Add document" : `Edit ${value.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="doc-form" type="submit" loading={loading}>
            {isNew ? "Save" : "Update"}
          </Button>
        </>
      }
    >
      <form id="doc-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
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
          <Select
            label="Employee"
            placeholder="Organisation-level document"
            options={(employees.data || []).map((emp) => ({ value: emp.id, label: `${emp.firstName} ${emp.lastName}` }))}
            value={form.employee}
            onChange={(e) => setForm((f) => ({ ...f, employee: e.target.value }))}
          />
          <div />
          <TextField label="Issue date" type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
          <TextField
            label="Expiry date"
            type="date"
            hint="Alerts fire 30, 14 and 7 days before"
            value={form.expiryDate}
            onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
          />
        </div>
        <Textarea label="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </form>
    </Modal>
  );
}
