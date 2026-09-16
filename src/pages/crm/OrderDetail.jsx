import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Select from "../../components/ui/Select.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { money, dateTime, dateShort } from "../../utils/format.js";
import { ORDER_TONE, oLabel } from "./OrderList.jsx";

const NEXT = {
  confirmed: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "returned"],
  in_transit: ["out_for_delivery", "returned"],
  out_for_delivery: ["delivered", "returned"],
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const { data: o, loading, error, refetch } = useApiQuery(`/crm/orders/${id}`);

  const M = {
    confirm: useMutation((c) => c.post(`/crm/orders/${id}/confirm`)),
    payment: useMutation((c, b) => c.post(`/crm/orders/${id}/payment`, b)),
    status: useMutation((c, b) => c.post(`/crm/orders/${id}/status`, b)),
  };

  if (loading) return <div className="flex justify-center py-20 text-ink-400"><Spinner size={24} /></div>;
  if (error) return <EmptyState title="Order not found" description={error.message} action={<Button variant="secondary" onClick={() => navigate("/crm/orders")}>Back</Button>} />;

  async function run(m, body, msg) {
    try {
      await m.mutate(body);
      if (msg) toast.success(msg);
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const q = o.quote || {};
  const nextStatuses = NEXT[o.status] || [];

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-3">{o.orderNumber}<Badge tone={ORDER_TONE[o.status]}>{oLabel(o.status)}</Badge></span>}
        description={<span className="text-xs text-ink-500">{oLabel(o.deliveryType)}{o.trackingNumber ? ` · ${o.trackingNumber}` : ""} · {dateShort(o.createdAt)}</span>}
        actions={<Button variant="secondary" onClick={() => navigate("/crm/orders")}>Back</Button>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <div className="card grid gap-4 p-4 sm:grid-cols-2">
            <Party title="Pickup" p={o.pickup} />
            <Party title="Drop-off" p={o.dropoff} />
          </div>

          <div className="card p-4">
            <p className="mb-2 text-sm font-semibold text-ink-900">Quote</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-ink-600">
              <span>Distance</span><span className="text-right">{q.distanceKm} km</span>
              <span>Base fare</span><span className="text-right">{money(q.baseFare, { whole: true })}</span>
              <span>Distance</span><span className="text-right">{money(q.distanceCharge, { whole: true })}</span>
              {q.weightCharge > 0 && (<><span>Weight</span><span className="text-right">{money(q.weightCharge, { whole: true })}</span></>)}
              {q.expressSurcharge > 0 && (<><span>Express</span><span className="text-right">{money(q.expressSurcharge, { whole: true })}</span></>)}
              {q.insurance > 0 && (<><span>Insurance</span><span className="text-right">{money(q.insurance, { whole: true })}</span></>)}
            </div>
            <p className="mt-1 border-t border-ink-200 pt-1 text-sm font-semibold text-ink-900">
              Total <span className="float-right">{money(q.total, { whole: true })}</span>
            </p>
            {q.expiresAt && <p className="mt-1 text-2xs text-ink-400">Quote valid until {dateTime(q.expiresAt)}</p>}
          </div>

          <div className="card p-4">
            <p className="mb-3 text-sm font-semibold text-ink-900">History</p>
            <ol className="space-y-2 border-l border-ink-200 pl-4">
              {[...o.statusHistory].reverse().map((e, i) => (
                <li key={i} className="text-sm">
                  <span className="text-ink-800">{oLabel(e.status)}</span>
                  {e.note && <span className="text-ink-500"> — {e.note}</span>}
                  <span className="ml-2 text-2xs text-ink-400">{dateTime(e.at)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <aside className="space-y-4">
          {o.customer && (
            <Panel title="Customer">
              <Link to={`/crm/customers/${typeof o.customer === "object" ? o.customer.id || o.customer._id : o.customer}`} className="link text-sm">
                View account
              </Link>
            </Panel>
          )}

          <Panel title="Payment">
            <p className="text-sm text-ink-800">
              <Badge status={o.paymentStatus === "paid" ? "paid" : o.paymentStatus === "failed" ? "failed" : "pending"}>{o.paymentStatus}</Badge>
              <span className="ml-2 text-ink-500">{o.paymentMethod}</span>
            </p>
            {can("order:write") && o.paymentStatus !== "paid" && (
              <Select
                className="mt-2"
                placeholder="Record payment…"
                options={[
                  { value: "paid", label: "Mark paid" },
                  { value: "cod", label: "Cash on delivery" },
                  { value: "failed", label: "Payment failed" },
                  { value: "refunded", label: "Refunded" },
                ]}
                value=""
                onChange={(e) => e.target.value && run(M.payment, { status: e.target.value }, "Payment updated")}
              />
            )}
          </Panel>

          {can("order:write") && (
            <Panel title="Progress">
              <div className="flex flex-col gap-1.5">
                {o.status === "quoted" && (
                  <Button loading={M.confirm.loading} onClick={() => run(M.confirm, undefined, "Order confirmed")}>
                    Confirm order
                  </Button>
                )}
                {nextStatuses.map((ns) => (
                  <Button key={ns} variant="secondary" onClick={() => run(M.status, { status: ns }, `Moved to ${oLabel(ns)}`)}>
                    → {oLabel(ns)}
                  </Button>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Package">
            <dl className="space-y-1 text-sm">
              <Row label="Category" v={o.package?.category || "—"} />
              <Row label="Weight" v={`${o.package?.weightKg || 0} kg`} />
              <Row label="Value" v={money(o.package?.value, { whole: true })} />
              <Row label="Rider" v={o.riderName || "—"} />
            </dl>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Party({ title, p }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-ink-500">{title}</p>
      <p className="mt-1 text-sm font-medium text-ink-900">{p?.name || "—"}</p>
      <p className="text-xs text-ink-500">{p?.phone}</p>
      <p className="text-xs text-ink-600">{[p?.address, p?.city, p?.state].filter(Boolean).join(", ")}</p>
    </div>
  );
}
function Panel({ title, children }) {
  return (
    <div className="card p-3">
      <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-ink-500">{title}</p>
      {children}
    </div>
  );
}
function Row({ label, v }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-800">{v}</dd>
    </div>
  );
}
