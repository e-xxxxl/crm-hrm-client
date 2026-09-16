import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import Select from "../../components/ui/Select.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuth } from "../../store/auth.js";
import ShipmentForm from "../../components/crm/ShipmentForm.jsx";
import { money, fromNow, dateShort } from "../../utils/format.js";

export const SHIPMENT_TONE = {
  created: "slate",
  pickup_requested: "slate",
  rider_assigned: "blue",
  picked_up: "blue",
  at_hub: "blue",
  in_transit: "blue",
  out_for_delivery: "amber",
  delivered: "green",
  failed: "red",
  rescheduled: "amber",
  returned: "red",
};
export const shLabel = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function ShipmentList() {
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("shipment:write"));
  const [filters, setFilters] = useState({ search: "", status: "", cod: "", view: "active" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebouncedValue(filters.search);

  const stats = useApiQuery("/crm/shipments/stats");

  const params = useMemo(() => {
    const p = { page, limit: 25, search: search || undefined };
    if (filters.status) p.status = filters.status;
    else if (filters.view === "active") p.active = "true";
    else if (filters.view === "overdue") p.overdue = "true";
    else if (filters.view === "unassigned") p.unassigned = "true";
    if (filters.cod === "outstanding") p.codOutstanding = "true";
    else if (filters.cod === "cod") p.cod = "true";
    return p;
  }, [page, search, filters]);

  const list = useApiQuery("/crm/shipments", { params });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const s = stats.data;

  return (
    <>
      <PageHeader
        title="Shipments"
        actions={canWrite && <Button onClick={() => setCreating(true)}>Book shipment</Button>}
      />

      {s && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-6">
          <Tile label="Active" value={s.active} active={filters.view === "active" && !filters.status} onClick={() => update({ view: "active", status: "", cod: "" })} />
          <Tile label="Delivered" value={s.delivered} />
          <Tile label="Overdue" value={s.overdue} tone={s.overdue ? "red" : undefined} active={filters.view === "overdue"} onClick={() => update({ view: "overdue", status: "", cod: "" })} />
          <Tile label="Success rate" value={s.successRate == null ? "—" : `${s.successRate}%`} />
          <Tile label="COD in field" value={money(s.cod.inField, { whole: true })} />
          <Tile label="COD to remit" value={money(s.cod.outstanding, { whole: true })} tone={s.cod.outstanding ? "amber" : undefined} active={filters.cod === "outstanding"} onClick={() => update({ cod: filters.cod === "outstanding" ? "" : "outstanding", status: "", view: "all" })} />
        </div>
      )}

      <FilterBar active={filters.search || filters.status || filters.cod} onClear={() => update({ search: "", status: "", cod: "", view: "active" })}>
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Tracking no, recipient" />
        <Select
          className="lg:w-44"
          placeholder="Any status"
          options={Object.keys(SHIPMENT_TONE).map((v) => ({ value: v, label: shLabel(v) }))}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
        />
        <Select
          className="lg:w-40"
          placeholder="All shipments"
          options={[
            { value: "cod", label: "COD only" },
            { value: "outstanding", label: "COD to remit" },
          ]}
          value={filters.cod}
          onChange={(e) => update({ cod: e.target.value })}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No shipments", description: "Book a shipment or adjust the filters." }}
        onRowClick={(x) => navigate(`/crm/shipments/${x.id}`)}
        columns={[
          {
            key: "tracking",
            header: "Tracking",
            primary: true,
            render: (x) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{x.trackingNumber}</p>
                <p className="truncate text-xs text-ink-500">
                  {x.recipient?.name} · {x.recipient?.city || x.recipient?.state}
                </p>
              </div>
            ),
          },
          { key: "service", header: "Service", render: (x) => shLabel(x.serviceLevel) },
          { key: "rider", header: "Rider", secondary: true, render: (x) => x.riderName || "—" },
          {
            key: "cod",
            header: "COD",
            align: "right",
            render: (x) =>
              x.codAmount > 0 ? (
                <span className={x.codCollected ? (x.codRemittedAt ? "text-ink-400" : "text-amber-600") : ""}>
                  {money(x.codAmount, { whole: true })}
                </span>
              ) : (
                "—"
              ),
          },
          { key: "eta", header: "ETA", render: (x) => (x.expectedDeliveryDate ? dateShort(x.expectedDeliveryDate) : "—") },
          { key: "status", header: "Status", render: (x) => <Badge tone={SHIPMENT_TONE[x.status]}>{shLabel(x.status)}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <ShipmentForm
          onClose={() => setCreating(false)}
          onSaved={(x) => {
            setCreating(false);
            navigate(`/crm/shipments/${x.id}`);
          }}
        />
      )}
    </>
  );
}

function Tile({ label, value, tone, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`bg-white px-3 py-2.5 text-left ${onClick ? "hover:bg-ink-50" : ""} ${active ? "ring-1 ring-inset ring-brand-600" : ""}`}
    >
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>
        {value ?? 0}
      </p>
    </button>
  );
}
