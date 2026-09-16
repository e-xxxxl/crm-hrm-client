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
import { NIGERIAN_STATES } from "../../utils/constants.js";
import { dateShort } from "../../utils/format.js";

export default function BranchList() {
  const can = useAuth((s) => s.can);
  const canWrite = can("branch:write");

  const [filters, setFilters] = useState({ search: "", state: "", status: "" });
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filters.search);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      search: search || undefined,
      state: filters.state || undefined,
      status: filters.status || undefined,
      sort: "name",
    }),
    [page, search, filters.state, filters.status],
  );

  const list = useApiQuery("/hrm/branches", { params });
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const filtersActive = filters.search || filters.state || filters.status;

  return (
    <>
      <PageHeader
        title="Branches"
        description="Physical locations. Attendance is geofenced against each branch."
        actions={canWrite && <Button onClick={() => setEditing("new")}>New branch</Button>}
      />

      <FilterBar
        active={Boolean(filtersActive)}
        onClear={() => {
          setFilters({ search: "", state: "", status: "" });
          setPage(1);
        }}
      >
        <SearchInput
          value={filters.search}
          onChange={(v) => {
            setFilters((f) => ({ ...f, search: v }));
            setPage(1);
          }}
          placeholder="Search branches"
        />
        <Select
          className="lg:w-48"
          placeholder="All states"
          options={NIGERIAN_STATES}
          value={filters.state}
          onChange={(e) => {
            setFilters((f) => ({ ...f, state: e.target.value }));
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
        empty={{ title: "No branches", description: "Add a branch to enable geofenced attendance." }}
        onRowClick={(row) => setDetail(row)}
        columns={[
          { key: "name", header: "Branch", primary: true, render: (r) => <span className="font-medium text-ink-900">{r.name}</span> },
          { key: "location", header: "Location", secondary: true, render: (r) => [r.lga, r.state].filter(Boolean).join(", ") || "—" },
          {
            key: "geofence",
            header: "Geofence",
            render: (r) =>
              r.latitude != null ? `${r.geofenceRadiusMeters} m` : <span className="text-ink-400">Not set</span>,
          },
          { key: "manager", header: "Manager", render: (r) => (r.manager ? `${r.manager.firstName} ${r.manager.lastName}` : "—") },
          { key: "employeeCount", header: "Employees", align: "right", render: (r) => r.employeeCount ?? 0 },
          { key: "status", header: "Status", render: (r) => <Badge status={r.status} /> },
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
        <BranchForm
          value={editing === "new" ? {} : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            list.refetch();
          }}
        />
      )}

      {detail && (
        <BranchDetail
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

function BranchForm({ value, onClose, onSaved }) {
  const isNew = !value.id;
  const [form, setForm] = useState({
    name: value.name || "",
    code: value.code || "",
    address: value.address || "",
    state: value.state || "",
    lga: value.lga || "",
    latitude: value.latitude ?? "",
    longitude: value.longitude ?? "",
    geofenceRadiusMeters: value.geofenceRadiusMeters ?? 200,
    phone: value.phone || "",
    openingTime: value.openingTime || "08:00",
    closingTime: value.closingTime || "17:00",
  });
  const { mutate, loading, error } = useMutation((client, body) =>
    isNew ? client.post("/hrm/branches", body) : client.patch(`/hrm/branches/${value.id}`, body),
  );
  const errs = fieldErrors(error);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    const body = { ...form };
    ["code", "address", "state", "lga", "phone"].forEach((k) => {
      if (!body[k]) delete body[k];
    });
    if (body.latitude === "" || body.longitude === "") {
      delete body.latitude;
      delete body.longitude;
    } else {
      body.latitude = Number(body.latitude);
      body.longitude = Number(body.longitude);
    }
    body.geofenceRadiusMeters = Number(body.geofenceRadiusMeters);
    try {
      await mutate(body);
      toast.success(isNew ? "Branch created" : "Branch updated");
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
      title={isNew ? "New branch" : `Edit ${value.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="branch-form" type="submit" loading={loading}>
            {isNew ? "Create" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="branch-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" required value={form.name} error={errs.name} onChange={set("name")} />
          <TextField label="Code" value={form.code} error={errs.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
        </div>
        <TextField label="Address" value={form.address} error={errs.address} onChange={set("address")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="State" placeholder="Select state" options={NIGERIAN_STATES} value={form.state} error={errs.state} onChange={set("state")} />
          <TextField label="LGA" value={form.lga} error={errs.lga} onChange={set("lga")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Latitude" type="number" step="any" value={form.latitude} error={errs.latitude} onChange={set("latitude")} />
          <TextField label="Longitude" type="number" step="any" value={form.longitude} error={errs.longitude} onChange={set("longitude")} />
          <TextField
            label="Geofence radius (m)"
            type="number"
            min="20"
            max="5000"
            value={form.geofenceRadiusMeters}
            error={errs.geofenceRadiusMeters}
            onChange={set("geofenceRadiusMeters")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Phone" value={form.phone} error={errs.phone} onChange={set("phone")} />
          <TextField label="Opening time" type="time" value={form.openingTime} onChange={set("openingTime")} />
          <TextField label="Closing time" type="time" value={form.closingTime} onChange={set("closingTime")} />
        </div>
      </form>
    </Modal>
  );
}

function BranchDetail({ id, canWrite, onClose, onChanged, onEdit }) {
  const { data, loading, error, refetch } = useApiQuery(`/hrm/branches/${id}`);
  const branch = data?.branch;
  const { mutate, loading: saving } = useMutation((client, status) =>
    client.patch(`/hrm/branches/${id}/status`, { status }),
  );

  async function toggleStatus() {
    const next = branch.status === "active" ? "inactive" : "active";
    try {
      await mutate(next);
      toast.success(`Branch ${next === "active" ? "activated" : "deactivated"}`);
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
      title={branch?.name || "Branch"}
      description={[branch?.lga, branch?.state].filter(Boolean).join(", ")}
      footer={
        canWrite &&
        branch && (
          <>
            <Button variant="secondary" onClick={() => onEdit(branch)}>
              Edit
            </Button>
            <Button
              variant={branch.status === "active" ? "danger" : "primary"}
              loading={saving}
              onClick={toggleStatus}
            >
              {branch.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </>
        )
      }
    >
      {loading && <p className="text-sm text-ink-500">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {branch && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Detail label="Status" value={<Badge status={branch.status} />} />
          <Detail label="Employees" value={data.employeeCount} />
          <Detail label="Address" value={branch.address || "—"} wide />
          <Detail label="Coordinates" value={branch.latitude != null ? `${branch.latitude}, ${branch.longitude}` : "Not set"} />
          <Detail label="Geofence radius" value={`${branch.geofenceRadiusMeters} m`} />
          <Detail label="Opening hours" value={`${branch.openingTime} – ${branch.closingTime}`} />
          <Detail label="Phone" value={branch.phone || "—"} />
          <Detail
            label="Manager"
            value={branch.manager ? `${branch.manager.firstName} ${branch.manager.lastName}` : "Unassigned"}
          />
          <Detail label="Created" value={dateShort(branch.createdAt)} />
        </dl>
      )}
    </Drawer>
  );
}

function Detail({ label, value, wide }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-2xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value}</dd>
    </div>
  );
}
