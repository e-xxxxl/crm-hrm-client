import { useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { sync as syncApi } from "../../services/crm.js";

export default function BrandSettings() {
  const canWrite = useAuth((s) => s.can("settings:write"));
  const { data, loading, error, refetch } = useApiQuery("/crm/brands/current");
  const [form, setForm] = useState(null);
  const save = useMutation((client, body) => client.patch("/crm/brands/current", body));

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name,
        description: data.description || "",
        primaryColor: data.primaryColor || "#0f172a",
        email: data.supportChannels?.email || "",
        phone: data.supportChannels?.phone || "",
        whatsapp: data.supportChannels?.whatsapp || "",
        website: data.supportChannels?.website || "",
        ticketPrefix: data.settings?.ticketPrefix || "",
        trackingPrefix: data.settings?.trackingPrefix || "",
        codEnabled: !!data.settings?.codEnabled,
        slaHours: data.settings?.slaHours || 48,
      });
    }
  }, [data]);

  if (loading || !form) {
    return (
      <div className="flex justify-center py-20 text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }
  if (error) return <Alert tone="error">{error.message}</Alert>;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    try {
      await save.mutate({
        name: form.name,
        description: form.description || undefined,
        primaryColor: form.primaryColor,
        supportChannels: {
          email: form.email || undefined,
          phone: form.phone || undefined,
          whatsapp: form.whatsapp || undefined,
          website: form.website || undefined,
        },
        settings: {
          ticketPrefix: form.ticketPrefix || undefined,
          trackingPrefix: form.trackingPrefix || undefined,
          codEnabled: form.codEnabled,
          slaHours: Number(form.slaHours),
        },
      });
      toast.success("Brand settings saved");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Brand Settings"
        description={
          <span className="flex items-center gap-2">
            {data.code} <Badge tone="slate">{data.kind}</Badge>
          </span>
        }
      />

      <form onSubmit={submit} className="max-w-2xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Brand name" value={form.name} disabled={!canWrite} onChange={set("name")} />
          <TextField label="Primary colour" value={form.primaryColor} disabled={!canWrite} onChange={set("primaryColor")} />
        </div>
        <Textarea label="Description" rows={2} value={form.description} disabled={!canWrite} onChange={set("description")} />

        <div>
          <p className="label">Support channels</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Email" value={form.email} disabled={!canWrite} onChange={set("email")} />
            <TextField label="Phone" value={form.phone} disabled={!canWrite} onChange={set("phone")} />
            <TextField label="WhatsApp" value={form.whatsapp} disabled={!canWrite} onChange={set("whatsapp")} />
            <TextField label="Website" value={form.website} disabled={!canWrite} onChange={set("website")} />
          </div>
        </div>

        <div>
          <p className="label">Module configuration</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Ticket prefix" value={form.ticketPrefix} disabled={!canWrite} onChange={set("ticketPrefix")} />
            <TextField label="Tracking prefix" value={form.trackingPrefix} disabled={!canWrite} onChange={set("trackingPrefix")} />
            <TextField label="Default SLA (hours)" type="number" value={form.slaHours} disabled={!canWrite} onChange={set("slaHours")} />
            <label className="flex items-center gap-2 pt-6 text-sm">
              <input
                type="checkbox"
                checked={form.codEnabled}
                disabled={!canWrite}
                onChange={(e) => setForm((f) => ({ ...f, codEnabled: e.target.checked }))}
              />
              Cash on delivery enabled
            </label>
          </div>
        </div>

        {canWrite && (
          <Button type="submit" loading={save.loading}>
            Save brand settings
          </Button>
        )}
      </form>

      {canWrite && <DataSyncPanel kind={data.kind} />}
    </>
  );
}

const BRAND_TO_SYNC_KEY = { courier: "ajcl", logistics: "quickship", marketplace: "tradies" };
const BRAND_LABEL = { ajcl: "AJ Courier Logistics", quickship: "QuickShipAfrica", tradies: "9jaTradiesPages" };

function DataSyncPanel({ kind }) {
  const syncKey = BRAND_TO_SYNC_KEY[kind];
  const status = useApiQuery("/crm/sync/status");
  const [result, setResult] = useState(null);
  const run = useMutation((client) => client.post(`/crm/sync/${syncKey}`, {}));

  if (!syncKey) return null;
  const configured = status.data?.[syncKey];

  return (
    <div className="mt-8 max-w-2xl">
      <p className="label">Live data sync</p>
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink-900">{BRAND_LABEL[syncKey]}'s own database</p>
            <p className="mt-0.5 text-xs text-ink-500">
              Pulls real customers, {syncKey === "tradies" ? "businesses, leads and reviews" : syncKey === "quickship" ? "orders" : "shipments"} from
              the brand's live production system (read-only) into this CRM. Existing CRM edits are never overwritten — only source-of-truth fields
              are refreshed, and re-running is safe.
            </p>
          </div>
          <Badge tone={configured ? "green" : "slate"}>{status.loading ? "…" : configured ? "Configured" : "Not configured"}</Badge>
        </div>

        {configured && (
          <Button
            className="mt-3"
            variant="secondary"
            loading={run.loading}
            onClick={async () => {
              try {
                const stats = await run.mutate();
                setResult(stats);
                toast.success("Sync complete");
              } catch (e) {
                toast.error(e.message);
              }
            }}
          >
            Sync now
          </Button>
        )}
        {!configured && (
          <p className="mt-3 text-xs text-ink-400">
            Set the corresponding <code>*_SOURCE_DB_URI</code> in <code>server/.env</code> to enable this.
          </p>
        )}

        {result && (
          <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-ink-100 pt-3 text-sm sm:grid-cols-4">
            {Object.entries(result).map(([k, v]) => (
              <div key={k}>
                <dt className="text-2xs uppercase tracking-wide text-ink-400">{k}</dt>
                <dd className={`font-semibold ${k === "errors" && v > 0 ? "text-amber-600" : "text-ink-900"}`}>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
}
