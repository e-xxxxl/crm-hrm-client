import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Drawer from "../../components/ui/Drawer.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { departments as api, branches as branchApi } from "../../services/hrm.js";
import { dateShort } from "../../utils/format.js";

const EMPTY = { name: "", code: "", description: "", branch: "", head: "" };

export default function DepartmentList() {
  const can = useAuth((s) => s.can);
  const canWrite = can("department:write");

  const [filters, setFilters] = useState({ search: "", branch: "", status: "" });
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filters.search);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      branch: filters.branch || undefined,
      status: filters.status || undefined,
      sort: "name",
    }),
    [page, search, filters.branch, filters.status],
  );

  const list = useApiQuery("/hrm/departments", { params });
  const branchOptions = useApiQuery("/hrm/branches", { params: { limit: 100, status: "active" } });
  const branchSelect = (branchOptions.data || []).map((b) => ({ value: b.id, label: b.name }));

  const [editing, setEditing] = useState(null); // null | "new" | row
  const [detail, setDetail] = useState(null);

  const filtersActive = filters.search || filters.branch || filters.status;

  return (
    <>
      <PageHeader
        title="Departments"
        description="Organisational units within this organization."
        actions={
          canWrite && (
            <Button onClick={() => setEditing("new")}>New department</Button>
          )
        }
      />

      <FilterBar
        active={Boolean(filtersActive)}
        onClear={() => {
          setFilters({ search: "", branch: "", status: "" });
          setPage(1);
        }}
      >
        <SearchInput
          value={filters.search}
          onChange={(v) => {
            setFilters((f) => ({ ...f, search: v }));
            setPage(1);
          }}
          placeholder="Search departments"
        />
        <Select
          className="lg:w-48"
          placeholder="All branches"
          options={branchSelect}
          value={filters.branch}
          onChange={(e) => {
            setFilters((f) => ({ ...f, branch: e.target.value }));
            setPage(1);
          }}
        />
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ]}
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: e.target.value }));
            setPage(1);
          }}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        empty={{
          title: "No departments",
          description: canWrite
            ? "Create your first department to start assigning employees."
            : "No departments have been created yet.",
        }}
        onRowClick={(row) => setDetail(row)}
        columns={[
          {
            key: "name",
            header: "Department",
            primary: true,
            render: (r) => (
              <div>
                <span className="font-medium text-ink-900">{r.name}</span>
                {r.code && <span className="ml-2 text-2xs text-ink-400">{r.code}</span>}
              </div>
            ),
          },
          {
            key: "head",
            header: "Head",
            render: (r) =>
              r.head ? `${r.head.firstName} ${r.head.lastName}` : <span className="text-ink-400">Unassigned</span>,
          },
          { key: "branch", header: "Branch", render: (r) => r.branch?.name || "—" },
          {
            key: "employeeCount",
            header: "Employees",
            align: "right",
            render: (r) => r.employeeCount ?? 0,
          },
          {
            key: "status",
            header: "Status",
            secondary: true,
            render: (r) => <Badge status={r.status} />,
          },
        ]}
        rowActions={
          canWrite
            ? (row) => (
                <button
                  type="button"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  onClick={() => setEditing(row)}
                >
                  Edit
                </button>
              )
            : undefined
        }
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {editing && (
        <DepartmentForm
          value={editing === "new" ? EMPTY : editing}
          branchOptions={branchSelect}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.refetch();
          }}
        />
      )}

      {detail && (
        <DepartmentDetail
          id={detail.id}
          canWrite={canWrite}
          onClose={() => setDetail(null)}
          onChanged={() => list.refetch()}
          onEdit={(row) => {
            setDetail(null);
            setEditing(row);
          }}
        />
      )}
    </>
  );
}

function DepartmentForm({ value, branchOptions, onClose, onSaved }) {
  const isNew = !value.id;
  const [form, setForm] = useState({
    name: value.name || "",
    code: value.code || "",
    description: value.description || "",
    branch: value.branch?.id || value.branch || "",
  });
  const { mutate, loading, error } = useMutation((client, body) =>
    isNew ? client.post("/hrm/departments", body) : client.patch(`/hrm/departments/${value.id}`, body),
  );
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    try {
      const body = { ...form };
      if (!body.branch) delete body.branch;
      if (!body.code) delete body.code;
      await mutate(body);
      toast.success(isNew ? "Department created" : "Department updated");
      onSaved();
    } catch {
      /* error shown inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? "New department" : `Edit ${value.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="dept-form" type="submit" loading={loading}>
            {isNew ? "Create" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="dept-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        )}
        <TextField
          label="Name"
          required
          value={form.name}
          error={errs.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <TextField
          label="Code"
          hint="Short identifier, e.g. OPS"
          value={form.code}
          error={errs.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
        />
        <Select
          label="Branch"
          placeholder="No specific branch"
          options={branchOptions}
          value={form.branch}
          error={errs.branch}
          onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
        />
        <Textarea
          label="Description"
          rows={3}
          value={form.description}
          error={errs.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </form>
    </Modal>
  );
}

function DepartmentDetail({ id, canWrite, onClose, onChanged, onEdit }) {
  const { data, loading, error, refetch } = useApiQuery(`/hrm/departments/${id}`);
  const dept = data?.department;
  const { mutate, loading: saving } = useMutation((client, status) =>
    client.patch(`/hrm/departments/${id}/status`, { status }),
  );

  async function toggleStatus() {
    const next = dept.status === "active" ? "inactive" : "active";
    try {
      await mutate(next);
      toast.success(`Department ${next === "active" ? "activated" : "deactivated"}`);
      refetch();
      onChanged();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={dept?.name || "Department"}
      description={dept?.code}
      footer={
        canWrite &&
        dept && (
          <>
            <Button variant="secondary" onClick={() => onEdit(dept)}>
              Edit
            </Button>
            <Button
              variant={dept.status === "active" ? "danger" : "primary"}
              loading={saving}
              onClick={toggleStatus}
            >
              {dept.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </>
        )
      }
    >
      {loading && <p className="text-sm text-ink-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {dept && (
        <div className="space-y-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Status" value={<Badge status={dept.status} />} />
            <Detail label="Branch" value={dept.branch?.name || "—"} />
            <Detail
              label="Head"
              value={dept.head ? `${dept.head.firstName} ${dept.head.lastName}` : "Unassigned"}
            />
            <Detail label="Created" value={dateShort(dept.createdAt)} />
          </dl>
          {dept.description && (
            <div>
              <p className="label">Description</p>
              <p className="text-sm text-ink-700">{dept.description}</p>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">
              Employees ({data.employees.length})
            </p>
            {data.employees.length === 0 ? (
              <p className="text-sm text-ink-500">No active employees assigned.</p>
            ) : (
              <ul className="divide-y divide-ink-100 rounded-md border border-ink-200">
                {data.employees.map((e) => (
                  <li key={e.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="truncate text-ink-800">
                      {e.firstName} {e.lastName}
                    </span>
                    <span className="ml-3 shrink-0 text-xs text-ink-500">{e.position}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value}</dd>
    </div>
  );
}
