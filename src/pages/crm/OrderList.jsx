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
import OrderForm from "../../components/crm/OrderForm.jsx";
import { money, fromNow } from "../../utils/format.js";

export const ORDER_TONE = {
  draft: "slate",
  quoted: "slate",
  confirmed: "blue",
  picked_up: "blue",
  in_transit: "blue",
  out_for_delivery: "amber",
  delivered: "green",
  cancelled: "slate",
  returned: "red",
};
export const oLabel = (s) => String(s).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());

export default function OrderList() {
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("order:write"));
  const [filters, setFilters] = useState({ search: "", status: "", paymentStatus: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebouncedValue(filters.search);

  const stats = useApiQuery("/crm/orders/stats");
  const params = useMemo(
    () => ({
      page,
      limit: 25,
      search: search || undefined,
      status: filters.status || undefined,
      paymentStatus: filters.paymentStatus || undefined,
    }),
    [page, search, filters],
  );
  const list = useApiQuery("/crm/orders", { params });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const s = stats.data;

  return (
    <>
      <PageHeader title="Orders" actions={canWrite && <Button onClick={() => setCreating(true)}>New order</Button>} />

      {s && (
        <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-5">
          <Tile label="Quoted" value={s.byStatus?.quoted || 0} />
          <Tile label="In transit" value={(s.byStatus?.in_transit || 0) + (s.byStatus?.out_for_delivery || 0)} />
          <Tile label="Delivered" value={s.byStatus?.delivered || 0} />
          <Tile label="Awaiting payment" value={s.byPayment?.pending || 0} tone={s.byPayment?.pending ? "amber" : undefined} />
          <Tile label="Paid revenue" value={money(s.paidRevenue, { whole: true })} />
        </div>
      )}

      <FilterBar active={filters.search || filters.status || filters.paymentStatus} onClear={() => update({ search: "", status: "", paymentStatus: "" })}>
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Order no, tracking, recipient" />
        <Select
          className="lg:w-44"
          placeholder="Any status"
          options={Object.keys(ORDER_TONE).map((v) => ({ value: v, label: oLabel(v) }))}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
        />
        <Select
          className="lg:w-40"
          placeholder="Any payment"
          options={["pending", "paid", "cod", "failed", "refunded"]}
          value={filters.paymentStatus}
          onChange={(e) => update({ paymentStatus: e.target.value })}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No orders", description: "Create an order or adjust the filters." }}
        onRowClick={(o) => navigate(`/crm/orders/${o.id}`)}
        columns={[
          {
            key: "order",
            header: "Order",
            primary: true,
            render: (o) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{o.orderNumber}</p>
                <p className="truncate text-xs text-ink-500">
                  {o.dropoff?.name} · {o.dropoff?.city || o.dropoff?.state}
                </p>
              </div>
            ),
          },
          { key: "type", header: "Type", render: (o) => oLabel(o.deliveryType) },
          { key: "total", header: "Quote", align: "right", render: (o) => money(o.quote?.total, { whole: true }) },
          { key: "payment", header: "Payment", secondary: true, render: (o) => <Badge status={o.paymentStatus === "paid" ? "paid" : o.paymentStatus === "failed" ? "failed" : "pending"}>{o.paymentStatus}</Badge> },
          { key: "created", header: "Created", render: (o) => fromNow(o.createdAt) },
          { key: "status", header: "Status", render: (o) => <Badge tone={ORDER_TONE[o.status]}>{oLabel(o.status)}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <OrderForm
          onClose={() => setCreating(false)}
          onSaved={(o) => {
            setCreating(false);
            navigate(`/crm/orders/${o.id}`);
          }}
        />
      )}
    </>
  );
}

function Tile({ label, value, tone }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>{value ?? 0}</p>
    </div>
  );
}
