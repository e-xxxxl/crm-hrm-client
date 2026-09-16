import { useEffect, useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Select from "../ui/Select.jsx";
import TextField from "../ui/TextField.jsx";
import Alert from "../ui/Alert.jsx";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { orders as orderApi, customers as customerApi } from "../../services/crm.js";
import { toast } from "../../store/toast.js";
import { money } from "../../utils/format.js";
import { NIGERIAN_STATES } from "../../utils/constants.js";

const emptyParty = { name: "", phone: "", address: "", city: "", state: "" };

export default function OrderForm({ presetCustomer, onClose, onSaved }) {
  const [customer, setCustomer] = useState(presetCustomer || null);
  const [term, setTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const debounced = useDebouncedValue(term, 250);

  const [form, setForm] = useState({
    pickup: { ...emptyParty },
    dropoff: { ...emptyParty },
    deliveryType: "standard",
    category: "general",
    description: "",
    weightKg: "",
    value: "",
    paymentMethod: "transfer",
  });
  const [quote, setQuote] = useState(null);
  const debouncedForm = useDebouncedValue(JSON.stringify(form), 400);

  const { mutate, loading, error } = useMutation((client, body) => client.post("/crm/orders", body));
  const errs = fieldErrors(error);
  const setParty = (which, key) => (e) => setForm((f) => ({ ...f, [which]: { ...f[which], [key]: e.target.value } }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Live quote preview
  useEffect(() => {
    let cancelled = false;
    orderApi
      .quote({
        pickup: form.pickup,
        dropoff: form.dropoff,
        weightKg: form.weightKg ? Number(form.weightKg) : 0,
        deliveryType: form.deliveryType,
        value: form.value ? Number(form.value) : 0,
      })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedForm]);

  async function runSearch(v) {
    setTerm(v);
    if (v.trim().length < 2) return setMatches([]);
    try {
      const res = await customerApi.search(v.trim());
      setMatches(res.results || []);
    } catch {
      setMatches([]);
    }
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const order = await mutate({
        customer: customer?.id || undefined,
        pickup: form.pickup,
        dropoff: form.dropoff,
        deliveryType: form.deliveryType,
        package: {
          category: form.category,
          description: form.description || undefined,
          weightKg: form.weightKg ? Number(form.weightKg) : undefined,
          value: form.value ? Number(form.value) : undefined,
        },
        paymentMethod: form.paymentMethod,
      });
      toast.success(`Order ${order.orderNumber} created`);
      onSaved(order);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="New order"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="order-form" type="submit" loading={loading}>Create order</Button>
        </>
      }
    >
      <form id="order-form" onSubmit={submit} className="space-y-5">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}

        {customer ? (
          <div className="flex items-center justify-between rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">{customer.displayName || customer.name} · {customer.customerId}</span>
            {!presetCustomer && <button type="button" className="text-xs text-ink-500" onClick={() => setCustomer(null)}>Change</button>}
          </div>
        ) : (
          <div>
            <label className="label">Account customer (optional)</label>
            <input className="input" placeholder="Search customer" value={term} onChange={(e) => runSearch(e.target.value)} />
            {matches.length > 0 && (
              <ul className="mt-1 max-h-40 divide-y divide-ink-100 overflow-y-auto rounded-md border border-ink-200">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-50" onClick={() => { setCustomer(m); setMatches([]); setTerm(""); }}>
                      {m.name} · <span className="text-ink-500">{m.customerId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Party title="Pickup" value={form.pickup} onChange={setParty.bind(null, "pickup")} />
        <Party title="Drop-off" value={form.dropoff} onChange={setParty.bind(null, "dropoff")} />

        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Delivery type" options={["standard", "express", "same_day", "scheduled"]} value={form.deliveryType} onChange={set("deliveryType")} />
          <TextField label="Category" value={form.category} onChange={set("category")} />
          <TextField label="Weight (kg)" type="number" value={form.weightKg} onChange={set("weightKg")} />
          <TextField label="Declared value (₦)" type="number" value={form.value} onChange={set("value")} />
          <Select label="Payment method" options={["transfer", "card", "wallet", "cash", "cod"]} value={form.paymentMethod} onChange={set("paymentMethod")} />
          <TextField label="Description" value={form.description} onChange={set("description")} />
        </div>

        {quote && (
          <div className="rounded-md border border-ink-200 bg-ink-50 p-3 text-sm">
            <p className="mb-1 font-medium text-ink-900">Estimated quote</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-ink-600">
              <span>Distance</span><span className="text-right">{quote.distanceKm} km</span>
              <span>Base fare</span><span className="text-right">{money(quote.baseFare, { whole: true })}</span>
              <span>Distance charge</span><span className="text-right">{money(quote.distanceCharge, { whole: true })}</span>
              {quote.weightCharge > 0 && (<><span>Weight</span><span className="text-right">{money(quote.weightCharge, { whole: true })}</span></>)}
              {quote.expressSurcharge > 0 && (<><span>Express surcharge</span><span className="text-right">{money(quote.expressSurcharge, { whole: true })}</span></>)}
              {quote.insurance > 0 && (<><span>Insurance</span><span className="text-right">{money(quote.insurance, { whole: true })}</span></>)}
            </div>
            <p className="mt-1 border-t border-ink-200 pt-1 font-semibold text-ink-900">
              Total <span className="float-right">{money(quote.total, { whole: true })}</span>
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
}

function Party({ title, value, onChange }) {
  return (
    <div>
      <p className="label">{title}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Name" value={value.name} onChange={onChange("name")} />
        <TextField label="Phone" value={value.phone} onChange={onChange("phone")} />
        <TextField label="City" value={value.city} onChange={onChange("city")} />
        <TextField label="Address" className="sm:col-span-2" value={value.address} onChange={onChange("address")} />
        <Select label="State" placeholder="—" options={NIGERIAN_STATES} value={value.state} onChange={onChange("state")} />
      </div>
    </div>
  );
}
