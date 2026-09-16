import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import TextField from "../../components/ui/TextField.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { money, number, dateShort } from "../../utils/format.js";

export default function Reports() {
  const brand = useApiQuery("/crm/brands/current");
  const kind = brand.data?.kind;
  const tabs = [
    { key: "group", label: "Group dashboard" },
    { key: "support", label: "Support" },
    (kind === "courier" || kind === "logistics") && { key: "logistics", label: "Logistics" },
  ].filter(Boolean);
  const [tab, setTab] = useState("group");

  return (
    <>
      <PageHeader title="Reports" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "group" && <GroupDashboard />}
      {tab === "support" && <SupportReport />}
      {tab === "logistics" && <LogisticsReport />}
    </>
  );
}

function Loader() {
  return <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>;
}

function Metrics({ items }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([label, value, tone]) => (
        <div key={label} className="bg-white px-3 py-2.5">
          <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
          <p className={`mt-0.5 text-sm font-semibold ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>{value}</p>
        </div>
      ))}
    </div>
  );
}

function DateFilter({ value, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <TextField type="date" className="lg:w-44" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} />
      <TextField type="date" className="lg:w-44" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} />
    </div>
  );
}

/* ---------------- Group dashboard ---------------- */

function GroupDashboard() {
  const { data, loading, error } = useApiQuery("/reports/group");
  if (loading) return <Loader />;
  if (error) return <EmptyState title="Unavailable" description={error.message} />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">{data.scope === "group" ? "All organizations" : "Your organization"}</p>
      <Metrics
        items={[
          ["Customers", number(data.totals.customers)],
          ["Open tickets", number(data.totals.openTickets)],
          ["Overdue tickets", number(data.totals.overdueTickets), data.totals.overdueTickets ? "red" : undefined],
          ["Active shipments", number(data.totals.activeShipments)],
          ["Active orders", number(data.totals.activeOrders)],
          ["Active riders", number(data.totals.activeRiders)],
          ["Outstanding COD", money(data.totals.outstandingCod, { whole: true }), data.totals.outstandingCod ? "amber" : undefined],
          ["Revenue", money(data.totals.revenue, { whole: true })],
          ["Headcount", number(data.totals.headcount)],
        ]}
      />

      <DataTable
        rows={data.brands}
        keyField="id"
        empty={{ title: "No brands", description: "No organizations to report on." }}
        columns={[
          { key: "name", header: "Brand", primary: true, render: (b) => <span>{b.name} <span className="text-ink-400">· {b.kind}</span></span> },
          { key: "customers", header: "Customers", align: "right", render: (b) => number(b.customers) },
          { key: "openTickets", header: "Open tickets", align: "right", render: (b) => number(b.openTickets) },
          { key: "active", header: "Active jobs", align: "right", render: (b) => number(b.activeShipments + b.activeOrders) },
          { key: "riders", header: "Riders", align: "right", hideOnMobile: true, render: (b) => number(b.activeRiders) },
          { key: "cod", header: "COD to remit", align: "right", render: (b) => money(b.outstandingCod, { whole: true }) },
          { key: "revenue", header: "Revenue", align: "right", render: (b) => money(b.revenue, { whole: true }) },
          { key: "headcount", header: "Staff", align: "right", secondary: true, render: (b) => number(b.headcount) },
        ]}
      />
    </div>
  );
}

/* ---------------- Support report ---------------- */

function SupportReport() {
  const [range, setRange] = useState({ from: "", to: "" });
  const params = useMemo(() => ({ from: range.from || undefined, to: range.to || undefined }), [range]);
  const { data, loading, error } = useApiQuery("/reports/support", { params });

  if (loading) return <Loader />;
  if (error) return <EmptyState title="Unavailable" description={error.message} />;

  return (
    <>
      <DateFilter value={range} onChange={setRange} />
      <p className="mb-4 text-sm text-ink-500">
        {dateShort(data.period.from)} – {dateShort(data.period.to)}
      </p>
      <div className="mb-6">
        <Metrics
          items={[
            ["Opened", number(data.opened)],
            ["Closed", number(data.closed)],
            ["Backlog", number(data.backlog), data.backlog ? "amber" : undefined],
            ["Reopened", number(data.reopened)],
            ["Escalated", number(data.escalated)],
            ["SLA breached", number(data.slaBreached), data.slaBreached ? "red" : undefined],
            ["Avg resolution", data.avgResolutionHours == null ? "—" : `${data.avgResolutionHours}h`],
            ["Avg 1st response", data.avgFirstResponseHours == null ? "—" : `${data.avgFirstResponseHours}h`],
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">By category</h2>
          <BarList rows={data.byCategory.map((c) => ({ name: c.category, value: c.count }))} />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">By agent</h2>
          <DataTable
            rows={data.byAgent}
            keyField="name"
            empty={{ title: "No resolved tickets", description: "No agent activity in this period." }}
            columns={[
              { key: "name", header: "Agent", primary: true, render: (a) => a.name },
              { key: "resolved", header: "Resolved", align: "right", render: (a) => number(a.resolved) },
              { key: "avg", header: "Avg resolution", align: "right", secondary: true, render: (a) => `${a.avgResolutionHours}h` },
            ]}
          />
        </section>
      </div>
    </>
  );
}

/* ---------------- Logistics report ---------------- */

function LogisticsReport() {
  const [range, setRange] = useState({ from: "", to: "" });
  const params = useMemo(() => ({ from: range.from || undefined, to: range.to || undefined }), [range]);
  const { data, loading, error } = useApiQuery("/reports/logistics", { params });

  if (loading) return <Loader />;
  if (error) return <EmptyState title="Unavailable" description={error.message} />;

  const cod = data.codReconciliation;
  return (
    <>
      <DateFilter value={range} onChange={setRange} />
      <div className="mb-6">
        <Metrics
          items={[
            ["Created", number(data.created)],
            ["Delivered", number(data.delivered)],
            ["Failed", number(data.failed), data.failed ? "red" : undefined],
            ["Success rate", data.successRate == null ? "—" : `${data.successRate}%`],
            ["Avg delivery time", data.avgDeliveryHours == null ? "—" : `${data.avgDeliveryHours}h`],
          ]}
        />
      </div>

      {data.brandKind === "courier" && (
        <section className="card mb-6 p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">COD reconciliation</h2>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
            <KV label="Total COD" v={money(cod.total, { whole: true })} />
            <KV label="Collected" v={money(cod.collected, { whole: true })} />
            <KV label="Remitted" v={money(cod.remitted, { whole: true })} />
            <KV label="In field" v={money(cod.inField, { whole: true })} />
            <KV label="Awaiting remittance" v={money(cod.awaitingRemittance, { whole: true })} tone={cod.awaitingRemittance ? "amber" : undefined} />
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Rider performance</h2>
          <DataTable
            rows={data.riderPerformance}
            keyField="name"
            empty={{ title: "No rider activity", description: "No assigned jobs in this period." }}
            columns={[
              { key: "name", header: "Rider", primary: true, render: (r) => r.name },
              { key: "delivered", header: "Delivered", align: "right", render: (r) => number(r.delivered) },
              { key: "failed", header: "Failed", align: "right", render: (r) => number(r.failed) },
              { key: "rate", header: "Success", align: "right", secondary: true, render: (r) => (r.successRate == null ? "—" : `${r.successRate}%`) },
            ]}
          />
        </section>
        {data.hubPerformance.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-900">Hub performance</h2>
            <DataTable
              rows={data.hubPerformance}
              keyField="hub"
              columns={[
                { key: "hub", header: "Hub", primary: true, render: (h) => h.hub },
                { key: "total", header: "Total", align: "right", render: (h) => number(h.total) },
                { key: "delivered", header: "Delivered", align: "right", render: (h) => number(h.delivered) },
                { key: "rate", header: "Rate", align: "right", secondary: true, render: (h) => (h.rate == null ? "—" : `${h.rate}%`) },
              ]}
            />
          </section>
        )}
      </div>
    </>
  );
}

function BarList({ rows }) {
  if (!rows || rows.length === 0) return <p className="text-sm text-ink-500">No data.</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="mb-0.5 flex justify-between">
            <span className="text-ink-700">{r.name}</span>
            <span className="text-ink-500">{number(r.value)}</span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-100">
            <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function KV({ label, v, tone }) {
  return (
    <div className="rounded-md border border-ink-200 px-2.5 py-2">
      <p className="text-2xs uppercase tracking-wide text-ink-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>{v}</p>
    </div>
  );
}
