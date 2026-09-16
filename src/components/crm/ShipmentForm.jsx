import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Select from "../ui/Select.jsx";
import TextField from "../ui/TextField.jsx";
import Textarea from "../ui/Textarea.jsx";
import Alert from "../ui/Alert.jsx";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { customers as customerApi } from "../../services/crm.js";
import { toast } from "../../store/toast.js";
import { NIGERIAN_STATES } from "../../utils/constants.js";

const emptyParty = { name: "", phone: "", address: "", city: "", lga: "", state: "" };

export default function ShipmentForm({ presetCustomer, onClose, onSaved }) {
  const [customer, setCustomer] = useState(presetCustomer || null);
  const [term, setTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const debounced = useDebouncedValue(term, 250);

  const [form, setForm] = useState({
    sender: { ...emptyParty },
    recipient: { ...emptyParty },
    description: "",
    packageType: "parcel",
    weightKg: "",
    declaredValue: "",
    serviceLevel: "standard",
    deliveryFee: "",
    codAmount: "",
    expectedDeliveryDate: "",
  });

  const { mutate, loading, error } = useMutation((client, body) => client.post("/crm/shipments", body));
  const errs = fieldErrors(error);
  const setParty = (which, key) => (e) =>
    setForm((f) => ({ ...f, [which]: { ...f[which], [key]: e.target.value } }));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
      const shipment = await mutate({
        customer: customer?.id || undefined,
        sender: form.sender,
        recipient: form.recipient,
        description: form.description || undefined,
        packageType: form.packageType,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        declaredValue: form.declaredValue ? Number(form.declaredValue) : undefined,
        serviceLevel: form.serviceLevel,
        deliveryFee: form.deliveryFee ? Number(form.deliveryFee) : undefined,
        codAmount: form.codAmount ? Number(form.codAmount) : undefined,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
      });
      toast.success(`Shipment ${shipment.trackingNumber} booked`);
      onSaved(shipment);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="Book shipment"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="shipment-form" type="submit" loading={loading}>
            Book shipment
          </Button>
        </>
      }
    >
      <form id="shipment-form" onSubmit={submit} className="space-y-5">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}

        {customer ? (
          <div className="flex items-center justify-between rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">
              {customer.displayName || customer.name} · {customer.customerId}
            </span>
            {!presetCustomer && (
              <button type="button" className="text-xs text-ink-500" onClick={() => setCustomer(null)}>
                Change
              </button>
            )}
          </div>
        ) : (
          <div>
            <label className="label">Account customer (optional)</label>
            <input className="input" placeholder="Search customer" value={term} onChange={(e) => runSearch(e.target.value)} />
            {matches.length > 0 && (
              <ul className="mt-1 max-h-40 divide-y divide-ink-100 overflow-y-auto rounded-md border border-ink-200">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-50"
                      onClick={() => {
                        setCustomer(m);
                        setMatches([]);
                        setTerm("");
                        setForm((f) => ({ ...f, sender: { ...f.sender, name: m.name, phone: m.phone || "" } }));
                      }}
                    >
                      {m.name} · <span className="text-ink-500">{m.customerId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <PartyFields title="Sender" value={form.sender} onChange={setParty.bind(null, "sender")} err={errs.sender} />
        <PartyFields title="Recipient" value={form.recipient} onChange={setParty.bind(null, "recipient")} err={errs.recipient} />

        <div>
          <p className="label">Parcel</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Type" options={["document", "parcel", "fragile", "perishable", "bulky"]} value={form.packageType} onChange={set("packageType")} />
            <TextField label="Weight (kg)" type="number" value={form.weightKg} onChange={set("weightKg")} />
            <TextField label="Declared value (₦)" type="number" value={form.declaredValue} onChange={set("declaredValue")} />
            <Select label="Service level" options={["standard", "express", "same_day"]} value={form.serviceLevel} onChange={set("serviceLevel")} />
            <TextField label="Delivery fee (₦)" type="number" value={form.deliveryFee} onChange={set("deliveryFee")} />
            <TextField label="COD amount (₦)" type="number" value={form.codAmount} onChange={set("codAmount")} hint="Leave blank for non-COD" />
            <TextField label="Expected delivery" type="date" value={form.expectedDeliveryDate} onChange={set("expectedDeliveryDate")} />
          </div>
          <Textarea label="Description" rows={2} value={form.description} onChange={set("description")} className="mt-3" />
        </div>
      </form>
    </Modal>
  );
}

function PartyFields({ title, value, onChange, err }) {
  return (
    <div>
      <p className="label">{title}</p>
      {err && <p className="mb-1 text-xs text-red-600">{err}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField label="Name" value={value.name} onChange={onChange("name")} />
        <TextField label="Phone" value={value.phone} onChange={onChange("phone")} />
        <TextField label="City / town" value={value.city} onChange={onChange("city")} />
        <TextField label="Address" className="sm:col-span-2" value={value.address} onChange={onChange("address")} />
        <Select label="State" placeholder="—" options={NIGERIAN_STATES} value={value.state} onChange={onChange("state")} />
      </div>
    </div>
  );
}
