import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Select from "../../components/ui/Select.jsx";
import Alert from "../../components/ui/Alert.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { fromNow } from "../../utils/format.js";

const AVAIL_TONE = { available: "green", busy: "amber", offline: "slate" };

export default function RiderList() {
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("rider:write"));
  const [filters, setFilters] = useState({ search: "", status: "", availability: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebouncedValue(filters.search);

  const params = useMemo(
    () => ({ page, limit: 25, search: search || undefined, status: filters.status || undefined, availability: filters.availability || undefined }),
    [page, search, filters],
  );
  const list = useApiQuery("/crm/riders", { params });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Riders" actions={canWrite && <Button onClick={() => setCreating(true)}>Add rider</Button>} />

      <FilterBar active={filters.search || filters.status || filters.availability} onClear={() => update({ search: "", status: "", availability: "" })}>
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Name, phone, code, plate" />
        <Select className="lg:w-36" placeholder="Any status" options={["active", "inactive", "suspended"]} value={filters.status} onChange={(e) => update({ status: e.target.value })} />
        <Select className="lg:w-36" placeholder="Any availability" options={["available", "busy", "offline"]} value={filters.availability} onChange={(e) => update({ availability: e.target.value })} />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No riders", description: "Add a rider to start dispatching." }}
        onRowClick={(r) => navigate(`/crm/riders/${r.id}`)}
        columns={[
          {
            key: "name",
            header: "Rider",
            primary: true,
            render: (r) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{r.name}</p>
                <p className="truncate text-xs text-ink-500">{r.riderCode} · {r.phone}</p>
              </div>
            ),
          },
          { key: "vehicle", header: "Vehicle", render: (r) => `${r.vehicleType}${r.plateNumber ? ` · ${r.plateNumber}` : ""}` },
          { key: "hub", header: "Hub", secondary: true, render: (r) => r.assignedHub || "—" },
          { key: "success", header: "Success", align: "right", render: (r) => (r.successRate == null ? "—" : `${r.successRate}%`) },
          { key: "seen", header: "Last seen", render: (r) => (r.lastSeenAt ? fromNow(r.lastSeenAt) : "—") },
          { key: "avail", header: "Availability", render: (r) => <Badge tone={AVAIL_TONE[r.availability]}>{r.availability}</Badge> },
          { key: "status", header: "Status", render: (r) => <Badge status={r.status}>{r.status}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && <RiderForm onClose={() => setCreating(false)} onSaved={() => { setCreating(false); list.refetch(); }} />}
    </>
  );
}

function RiderForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", vehicleType: "bike", plateNumber: "",
    licenseNumber: "", assignedHub: "", zones: "", provisionLogin: false, password: "",
  });
  const { mutate, loading, error } = useMutation((c, b) => c.post("/crm/riders", b));
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    try {
      const body = {
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        vehicleType: form.vehicleType,
        plateNumber: form.plateNumber || undefined,
        licenseNumber: form.licenseNumber || undefined,
        assignedHub: form.assignedHub || undefined,
        zones: form.zones ? form.zones.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      };
      if (form.provisionLogin) body.provisionLogin = { password: form.password || undefined };
      const res = await mutate(body);
      const temp = res.meta?.login?.tempPassword;
      toast.success(temp ? `Rider added. Temp password: ${temp}` : "Rider added");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title="Add rider" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button form="rider-form" type="submit" loading={loading}>Add rider</Button></>}>
      <form id="rider-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" required value={form.name} error={errs.name} onChange={set("name")} />
          <TextField label="Phone" required value={form.phone} error={errs.phone} onChange={set("phone")} />
          <TextField label="Email" type="email" value={form.email} error={errs.email} onChange={set("email")} hint="Needed for a PWA login" />
          <Select label="Vehicle" options={["bike", "bicycle", "car", "van", "truck", "foot"]} value={form.vehicleType} onChange={set("vehicleType")} />
          <TextField label="Plate number" value={form.plateNumber} onChange={set("plateNumber")} />
          <TextField label="License number" value={form.licenseNumber} onChange={set("licenseNumber")} />
          <TextField label="Assigned hub" value={form.assignedHub} onChange={set("assignedHub")} />
          <TextField label="Zones (comma separated)" value={form.zones} onChange={set("zones")} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.provisionLogin} onChange={(e) => setForm((f) => ({ ...f, provisionLogin: e.target.checked }))} />
          Create a rider app login now
        </label>
        {form.provisionLogin && (
          <TextField label="Temp password (optional)" value={form.password} onChange={set("password")} hint="Auto-generated if left blank; rider must change on first login" />
        )}
      </form>
    </Modal>
  );
}
