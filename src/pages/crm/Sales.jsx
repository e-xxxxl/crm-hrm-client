import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { money, number } from "../../utils/format.js";

const label = (s) => s.replace(/\b\w/g, (m) => m.toUpperCase());

export default function Sales() {
  const { data, loading, error } = useApiQuery("/crm/sales/overview");

  if (loading) return <div className="flex justify-center py-20 text-ink-400"><Spinner size={24} /></div>;
  if (error) return <EmptyState title="Sales overview unavailable" description={error.message} />;

  const maxStage = Math.max(...data.pipeline.map((p) => p.count), 1);
  const maxRev = Math.max(...data.revenueSeries.map((r) => r.amount), 1);

  return (
    <>
      <PageHeader title="Sales" description={`${label(data.brandKind)} brand`} />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
        <Tile label="Open pipeline value" value={money(data.openPipelineValue, { whole: true })} />
        <Tile label="Conversion rate" value={data.conversionRate == null ? "—" : `${data.conversionRate}%`} />
        <Tile label="Revenue collected" value={money(data.revenue.collected, { whole: true })} />
        <Tile label="Outstanding" value={money(data.revenue.outstanding, { whole: true })} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Pipeline</h2>
          <ul className="space-y-2.5">
            {data.pipeline.map((p) => (
              <li key={p.stage} className="text-sm">
                <div className="mb-0.5 flex justify-between">
                  <span className="text-ink-700">{label(p.stage)}</span>
                  <span className="text-ink-500">
                    {number(p.count)}
                    {p.value ? ` · ${money(p.value, { whole: true })}` : ""}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-ink-100">
                  <div
                    className={`h-1.5 rounded-full ${p.stage === "won" ? "bg-emerald-500" : p.stage === "lost" ? "bg-red-400" : "bg-brand-600"}`}
                    style={{ width: `${(p.count / maxStage) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Revenue — last {data.revenueSeries.length || 6} months</h2>
          {data.revenueSeries.length === 0 ? (
            <p className="text-sm text-ink-500">No revenue recorded in this period.</p>
          ) : (
            <div className="flex items-end gap-2" style={{ height: 160 }}>
              {data.revenueSeries.map((r) => (
                <div key={r.period} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div className="w-full rounded-t bg-brand-600" style={{ height: `${Math.max(4, (r.amount / maxRev) * 100)}%` }} title={money(r.amount)} />
                  </div>
                  <span className="text-2xs text-ink-400">{r.period.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-ink-900">Salesperson performance</h2>
        <DataTable
          rows={data.salespeople}
          keyField="name"
          empty={{ title: "No leads assigned", description: "Assign leads to salespeople to see performance." }}
          columns={[
            { key: "name", header: "Salesperson", primary: true, render: (s) => s.name },
            { key: "total", header: "Leads", align: "right", render: (s) => number(s.total) },
            { key: "won", header: "Won", align: "right", render: (s) => number(s.won) },
            { key: "lost", header: "Lost", align: "right", render: (s) => number(s.lost) },
            { key: "winRate", header: "Win rate", align: "right", secondary: true, render: (s) => (s.winRate == null ? "—" : `${s.winRate}%`) },
            { key: "wonValue", header: "Won value", align: "right", render: (s) => money(s.wonValue, { whole: true }) },
          ]}
        />
      </section>
    </>
  );
}

function Tile({ label, value }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}
