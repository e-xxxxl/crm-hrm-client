import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { fromNow, number, money } from "../../utils/format.js";
import CustomerSearch from "../../components/crm/CustomerSearch.jsx";

export default function CrmOverview() {
  const brand = useApiQuery("/crm/brands/current");
  const recent = useApiQuery("/crm/customers", { params: { limit: 8, sort: "-createdAt" } });
  const active = useApiQuery("/crm/customers", { params: { limit: 1, status: "active" } });
  const tickets = useApiQuery("/crm/tickets/stats");

  const kind = brand.data?.kind;
  const shipStats = useApiQuery("/crm/shipments/stats", { skip: kind !== "courier" });
  const orderStats = useApiQuery("/crm/orders/stats", { skip: kind !== "logistics" });
  const bizStats = useApiQuery("/crm/marketplace/businesses/stats", { skip: kind !== "marketplace" });
  const leadStats = useApiQuery("/crm/marketplace/leads/stats", { skip: kind !== "marketplace" });

  return (
    <>
      <PageHeader
        title={brand.data ? brand.data.name : "CRM Overview"}
        description={brand.data ? `${brand.data.kind} brand · ${brand.data.code}` : ""}
      />

      <div className="mb-6 max-w-xl">
        <CustomerSearch />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4 lg:grid-cols-6">
        <Tile label="Customers" value={recent.meta?.total} to="/crm/customers" />
        <Tile label="Active customers" value={active.meta?.total} />
        <Tile label="Open tickets" value={tickets.data?.open} to="/crm/tickets" />
        <Tile label="Overdue tickets" value={tickets.data?.overdue} tone={tickets.data?.overdue ? "red" : undefined} to="/crm/tickets" />

        {kind === "courier" && (
          <>
            <Tile label="Active shipments" value={shipStats.data?.active} to="/crm/shipments" />
            <Tile label="COD to remit" value={money(shipStats.data?.cod?.outstanding || 0, { whole: true })} tone={shipStats.data?.cod?.outstanding ? "amber" : undefined} to="/crm/shipments" />
          </>
        )}
        {kind === "logistics" && (
          <>
            <Tile label="Orders quoted" value={orderStats.data?.byStatus?.quoted || 0} to="/crm/orders" />
            <Tile label="Paid revenue" value={money(orderStats.data?.paidRevenue || 0, { whole: true })} to="/crm/orders" />
          </>
        )}
        {kind === "marketplace" && (
          <>
            <Tile label="Businesses pending" value={bizStats.data?.pendingApproval} tone={bizStats.data?.pendingApproval ? "amber" : undefined} to="/crm/businesses" />
            <Tile label="Open leads" value={leadStats.data ? Object.entries(leadStats.data.byStage || {}).filter(([k]) => !["won", "lost"].includes(k)).reduce((a, [, v]) => a + v, 0) : 0} to="/crm/leads" />
          </>
        )}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Recently added customers</h2>
          <Link to="/crm/customers" className="link text-sm">View all</Link>
        </div>
        {recent.loading ? (
          <div className="flex justify-center py-10 text-ink-400"><Spinner size={20} /></div>
        ) : (recent.data || []).length === 0 ? (
          <p className="text-sm text-ink-500">No customers yet.</p>
        ) : (
          <div className="card divide-y divide-ink-100">
            {recent.data.map((c) => (
              <Link key={c.id} to={`/crm/customers/${c.id}`} className="flex items-center justify-between px-4 py-2.5 hover:bg-ink-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{c.displayName}</p>
                  <p className="truncate text-xs text-ink-500">{c.customerId} · {c.primaryPhone || c.primaryEmail || "no contact"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge status={c.status} />
                  <span className="hidden text-xs text-ink-400 sm:inline">{fromNow(c.createdAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Tile({ label, value, tone, to }) {
  const inner = (
    <>
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-0.5 text-base font-semibold ${tone === "red" ? "text-red-600" : tone === "amber" ? "text-amber-600" : "text-ink-900"}`}>
        {value == null ? "—" : typeof value === "number" ? number(value) : value}
      </p>
    </>
  );
  return to ? (
    <Link to={to} className="bg-white px-3 py-2.5 hover:bg-ink-50">{inner}</Link>
  ) : (
    <div className="bg-white px-3 py-2.5">{inner}</div>
  );
}
