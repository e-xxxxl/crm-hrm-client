import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Alert from "../../components/ui/Alert.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import CustomerForm from "../../components/crm/CustomerForm.jsx";
import CommunicationsTab from "../../components/crm/CommunicationsTab.jsx";
import TicketForm from "../../components/crm/TicketForm.jsx";
import { dateShort, dateTime, fromNow, money, number } from "../../utils/format.js";

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("customer:write"));
  const canComms = useAuth((s) => s.can("communication:read"));
  const canTicket = useAuth((s) => s.can("ticket:write"));
  const { data, loading, error, refetch } = useApiQuery(`/crm/customers/${id}/360`);
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [raisingTicket, setRaisingTicket] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Customer not found"
        description={error.message}
        action={<Button variant="secondary" onClick={() => navigate("/crm/customers")}>Back to customers</Button>}
      />
    );
  }

  const c = data.customer;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {c.displayName}
            <Badge status={c.status} />
          </span>
        }
        description={`${c.customerId} · ${c.type === "business" ? "Business" : "Individual"} · added ${dateShort(c.createdAt)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/crm/customers")}>
              Back
            </Button>
            {canTicket && <Button variant="secondary" onClick={() => setRaisingTicket(true)}>Raise ticket</Button>}
            {canWrite && <Button onClick={() => setEditing(true)}>Edit</Button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
        <Stat label="Orders" value={number(data.stats.orders)} />
        <Stat label="Shipments" value={number(data.stats.shipments)} />
        <Stat label="Open tickets" value={number(data.stats.tickets)} />
        <Stat label="Lifetime value" value={money(data.stats.lifetimeValue, { whole: true })} />
      </div>

      <Tabs
        tabs={[
          { key: "overview", label: "Overview" },
          { key: "history", label: `History${data.history.length ? ` (${data.history.length})` : ""}` },
          canComms && { key: "communications", label: "Communications" },
          { key: "notes", label: `Notes${c.notes?.length ? ` (${c.notes.length})` : ""}` },
        ].filter(Boolean)}
        active={tab}
        onChange={setTab}
      />

      {tab === "overview" && <Overview customer={c} />}
      {tab === "history" && <History history={data.history} sources={data.historySources} />}
      {tab === "communications" && <CommunicationsTab customerId={id} onLogged={refetch} />}
      {tab === "notes" && <Notes customerId={id} notes={c.notes || []} canWrite={canWrite} onChanged={refetch} />}

      {editing && (
        <CustomerForm
          value={c}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refetch();
          }}
        />
      )}
      {raisingTicket && (
        <TicketForm
          presetCustomer={{ id, displayName: c.displayName, customerId: c.customerId, primaryPhone: c.primaryPhone, primaryEmail: c.primaryEmail }}
          onClose={() => setRaisingTicket(false)}
          onSaved={(t) => {
            setRaisingTicket(false);
            navigate(`/crm/tickets/${t.id}`);
          }}
        />
      )}
    </>
  );
}

function Overview({ customer: c }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Contact">
        <Row label="Phone(s)" value={c.phones?.map((p) => p.value).join(", ") || "—"} />
        <Row label="Email(s)" value={c.emails?.map((e) => e.value).join(", ") || "—"} />
        <Row
          label="Address"
          value={
            c.addresses?.length
              ? c.addresses
                  .map((a) => [a.line1, a.city, a.lga, a.state].filter(Boolean).join(", "))
                  .join(" · ")
              : "—"
          }
        />
      </Card>

      <Card title="Profile">
        {c.type === "business" ? (
          <>
            <Row label="Business name" value={c.businessName} />
            <Row label="RC number" value={c.rcNumber || "—"} />
          </>
        ) : (
          <>
            <Row label="Full name" value={[c.firstName, c.lastName].filter(Boolean).join(" ") || "—"} />
            <Row label="Gender" value={c.gender || "—"} />
            <Row label="Date of birth" value={c.dateOfBirth ? dateShort(c.dateOfBirth) : "—"} />
          </>
        )}
        <Row label="Source" value={c.source || "—"} />
        <Row label="Segment" value={c.segment || "—"} />
        <Row label="Account manager" value={c.ownerName || "—"} />
      </Card>

      <Card title="Consent & tags">
        <Row label="Marketing email" value={c.consent?.marketingEmail ? "Granted" : "Not granted"} />
        <Row label="Marketing SMS" value={c.consent?.marketingSms ? "Granted" : "Not granted"} />
        <Row
          label="Tags"
          value={
            c.tags?.length ? (
              <span className="flex flex-wrap gap-1">
                {c.tags.map((t) => (
                  <Badge key={t} tone="slate">
                    {t}
                  </Badge>
                ))}
              </span>
            ) : (
              "—"
            )
          }
        />
      </Card>

      {c.externalRefs?.length > 0 && (
        <Card title="Linked records">
          {c.externalRefs.map((r, i) => (
            <Row key={i} label={r.system} value={r.ref} />
          ))}
        </Card>
      )}
    </div>
  );
}

function History({ history, sources }) {
  if (history.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description={
          sources?.length
            ? "This customer has no orders, shipments or tickets on record."
            : "Customer history aggregates orders, shipments, tickets and communications as those modules come online."
        }
      />
    );
  }
  return (
    <ol className="space-y-3 border-l border-ink-200 pl-4">
      {history.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.4rem] top-1 h-2 w-2 rounded-full bg-brand-600" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-ink-900">{e.title}</p>
            <span className="text-2xs text-ink-400">{dateTime(e.at)}</span>
          </div>
          {e.description && <p className="text-sm text-ink-600">{e.description}</p>}
          <div className="mt-0.5 flex items-center gap-2 text-2xs uppercase tracking-wide text-ink-400">
            <span>{e.type}</span>
            {e.status && <Badge status={e.status}>{e.status}</Badge>}
            {e.amount != null && <span>{money(e.amount)}</span>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Notes({ customerId, notes, canWrite, onChanged }) {
  const [body, setBody] = useState("");
  const add = useMutation((client, text) => client.post(`/crm/customers/${customerId}/notes`, { body: text }));

  async function submit() {
    if (!body.trim()) return;
    try {
      await add.mutate(body.trim());
      setBody("");
      onChanged();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {canWrite && (
        <div className="flex gap-2">
          <input className="input" placeholder="Add a note" value={body} onChange={(e) => setBody(e.target.value)} />
          <Button loading={add.loading} onClick={submit}>
            Add
          </Button>
        </div>
      )}
      {notes.length === 0 ? (
        <p className="text-sm text-ink-500">No notes recorded.</p>
      ) : (
        <ul className="space-y-2">
          {[...notes].reverse().map((n) => (
            <li key={n._id || n.at} className="card p-3">
              <p className="text-sm text-ink-800">{n.body}</p>
              <p className="mt-1 text-2xs text-ink-400">
                {n.byName} · {fromNow(n.at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card p-4">
      <p className="mb-3 text-sm font-semibold text-ink-900">{title}</p>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="col-span-2 text-ink-800">{value}</dd>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white px-3 py-2.5">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-ink-900">{value}</p>
    </div>
  );
}
