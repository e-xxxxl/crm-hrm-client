import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Select from "../../components/ui/Select.jsx";
import Alert from "../../components/ui/Alert.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { NIGERIAN_STATES } from "../../utils/constants.js";
import { fromNow } from "../../utils/format.js";

const BIZ_TONE = { pending: "amber", approved: "green", rejected: "red", suspended: "slate" };

export default function BusinessList() {
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("business:write"));
  const [filters, setFilters] = useState({ search: "", status: "", state: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebouncedValue(filters.search);

  const stats = useApiQuery("/crm/marketplace/businesses/stats");
  const params = useMemo(
    () => ({ page, limit: 25, search: search || undefined, status: filters.status || undefined, state: filters.state || undefined }),
    [page, search, filters],
  );
  const list = useApiQuery("/crm/marketplace/businesses", { params });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const s = stats.data;

  return (
    <>
      <PageHeader title="Businesses" actions={canWrite && <Button onClick={() => setCreating(true)}>Register business</Button>} />

      {s && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
          <Tile label="Pending approval" value={s.pendingApproval} tone={s.pendingApproval ? "amber" : undefined} active={filters.status === "pending"} onClick={() => update({ status: filters.status === "pending" ? "" : "pending" })} />
          <Tile label="Approved" value={s.byStatus?.approved || 0} />
          <Tile label="Suspended" value={s.byStatus?.suspended || 0} />
          <Tile label="Paid subs" value={(s.bySubscriptionTier?.basic || 0) + (s.bySubscriptionTier?.premium || 0) + (s.bySubscriptionTier?.featured || 0)} />
        </div>
      )}

      <FilterBar active={filters.search || filters.status || filters.state} onClear={() => update({ search: "", status: "", state: "" })}>
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Name, owner, phone" />
        <Select className="lg:w-40" placeholder="Any status" options={Object.keys(BIZ_TONE)} value={filters.status} onChange={(e) => update({ status: e.target.value })} />
        <Select className="lg:w-40" placeholder="Any state" options={NIGERIAN_STATES} value={filters.state} onChange={(e) => update({ state: e.target.value })} />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No businesses", description: "Register a business or adjust the filters." }}
        onRowClick={(b) => navigate(`/crm/businesses/${b.id}`)}
        columns={[
          {
            key: "name",
            header: "Business",
            primary: true,
            render: (b) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{b.name}</p>
                <p className="truncate text-xs text-ink-500">{b.businessCode} · {b.category}</p>
              </div>
            ),
          },
          { key: "location", header: "Location", secondary: true, render: (b) => [b.city, b.state].filter(Boolean).join(", ") || "—" },
          { key: "rating", header: "Rating", align: "right", render: (b) => (b.ratingCount ? `${b.ratingAverage} (${b.ratingCount})` : "—") },
          { key: "sub", header: "Subscription", render: (b) => <Badge tone={b.subscription?.tier === "free" || !b.subscription?.tier ? "slate" : "blue"}>{b.subscription?.tier || "none"}</Badge> },
          { key: "submitted", header: "Submitted", render: (b) => fromNow(b.createdAt) },
          { key: "status", header: "Status", render: (b) => <Badge tone={BIZ_TONE[b.status]}>{b.status}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && <BusinessForm onClose={() => setCreating(false)} onSaved={(b) => { setCreating(false); navigate(`/crm/businesses/${b.id}`); }} />}
    </>
  );
}

function BusinessForm({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "", ownerName: "", category: "", services: "", description: "",
    phone: "", whatsapp: "", email: "", address: "", city: "", lga: "", state: "", ninNumber: "",
  });
  const { mutate, loading, error } = useMutation((c, b) => c.post("/crm/marketplace/businesses", b));
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    try {
      const biz = await mutate({
        ...form,
        services: form.services ? form.services.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      toast.success(`${biz.name} submitted for approval`);
      onSaved(biz);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal open onClose={onClose} size="lg" title="Register business" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button form="biz-form" type="submit" loading={loading}>Submit</Button></>}>
      <form id="biz-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Business name" required value={form.name} error={errs.name} onChange={set("name")} />
          <TextField label="Owner name" value={form.ownerName} onChange={set("ownerName")} />
          <TextField label="Category" required placeholder="Plumbing, Electrical…" value={form.category} error={errs.category} onChange={set("category")} />
          <TextField label="Services (comma separated)" value={form.services} onChange={set("services")} />
          <TextField label="Phone" value={form.phone} onChange={set("phone")} />
          <TextField label="WhatsApp" value={form.whatsapp} onChange={set("whatsapp")} />
          <TextField label="Email" value={form.email} onChange={set("email")} />
          <TextField label="NIN" value={form.ninNumber} onChange={set("ninNumber")} maxLength={11} hint="National Identity Number" />
          <TextField label="Address" className="sm:col-span-2" value={form.address} onChange={set("address")} />
          <TextField label="City" value={form.city} onChange={set("city")} />
          <TextField label="LGA" value={form.lga} onChange={set("lga")} />
          <Select label="State" placeholder="—" options={NIGERIAN_STATES} value={form.state} onChange={set("state")} />
        </div>
        <Textarea label="Description" rows={3} value={form.description} onChange={set("description")} />
      </form>
    </Modal>
  );
}

function Tile({ label, value, tone, active, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick} className={`bg-white px-3 py-2.5 text-left ${onClick ? "hover:bg-ink-50" : ""} ${active ? "ring-1 ring-inset ring-brand-600" : ""}`}>
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>{value ?? 0}</p>
    </button>
  );
}
