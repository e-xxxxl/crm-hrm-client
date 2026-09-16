import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Select from "../ui/Select.jsx";
import TextField from "../ui/TextField.jsx";
import Alert from "../ui/Alert.jsx";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { toast } from "../../store/toast.js";
import { NIGERIAN_STATES, GENDERS } from "../../utils/constants.js";

/** Create / edit a customer. Contact rows are kept simple: one email, one phone,
 *  one address — extra rows are managed from the profile page later. */
export default function CustomerForm({ value, onClose, onSaved }) {
  const isNew = !value;
  const [form, setForm] = useState({
    type: value?.type || "individual",
    firstName: value?.firstName || "",
    lastName: value?.lastName || "",
    businessName: value?.businessName || "",
    rcNumber: value?.rcNumber || "",
    gender: value?.gender || "",
    email: value?.emails?.[0]?.value || "",
    phone: value?.phones?.[0]?.value || "",
    line1: value?.addresses?.[0]?.line1 || "",
    city: value?.addresses?.[0]?.city || "",
    lga: value?.addresses?.[0]?.lga || "",
    state: value?.addresses?.[0]?.state || "",
    source: value?.source || "direct",
    segment: value?.segment || "",
    marketingEmail: value?.consent?.marketingEmail || false,
    marketingSms: value?.consent?.marketingSms || false,
  });

  const { mutate, loading, error } = useMutation((client, body) =>
    isNew ? client.post("/crm/customers", body) : client.patch(`/crm/customers/${value.id}`, body),
  );
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const body = {
      type: form.type,
      source: form.source || undefined,
      segment: form.segment || undefined,
      consent: { marketingEmail: form.marketingEmail, marketingSms: form.marketingSms },
    };
    if (form.type === "business") {
      body.businessName = form.businessName;
      if (form.rcNumber) body.rcNumber = form.rcNumber;
    } else {
      body.firstName = form.firstName;
      body.lastName = form.lastName;
      if (form.gender) body.gender = form.gender;
    }
    const emails = form.email ? [{ value: form.email, primary: true }] : [];
    const phones = form.phone ? [{ value: form.phone, primary: true }] : [];
    body.emails = emails;
    body.phones = phones;
    if (form.line1 || form.city || form.state) {
      body.addresses = [
        { label: "Primary", line1: form.line1, city: form.city, lga: form.lga, state: form.state, isDefault: true },
      ];
    }
    try {
      const saved = await mutate(body);
      toast.success(isNew ? `Customer ${saved.customerId} created` : "Customer updated");
      onSaved(saved);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isNew ? "New customer" : `Edit ${value.displayName}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="customer-form" type="submit" loading={loading}>
            {isNew ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}

        <Select
          label="Customer type"
          options={[
            { value: "individual", label: "Individual" },
            { value: "business", label: "Business" },
          ]}
          value={form.type}
          onChange={set("type")}
        />

        {form.type === "business" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Business name" required value={form.businessName} error={errs.businessName} onChange={set("businessName")} />
            <TextField label="RC number" value={form.rcNumber} onChange={set("rcNumber")} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="First name" value={form.firstName} error={errs.firstName} onChange={set("firstName")} />
            <TextField label="Last name" value={form.lastName} onChange={set("lastName")} />
            <Select label="Gender" placeholder="—" options={GENDERS} value={form.gender} onChange={set("gender")} />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Phone" value={form.phone} error={errs.phones} onChange={set("phone")} hint="At least one of phone / email" />
          <TextField label="Email" type="email" value={form.email} error={errs.emails} onChange={set("email")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Address" value={form.line1} onChange={set("line1")} />
          <TextField label="City / town" value={form.city} onChange={set("city")} />
          <TextField label="LGA" value={form.lga} onChange={set("lga")} />
          <Select label="State" placeholder="—" options={NIGERIAN_STATES} value={form.state} onChange={set("state")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Source" value={form.source} onChange={set("source")} />
          <TextField label="Segment" value={form.segment} onChange={set("segment")} />
        </div>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.marketingEmail} onChange={(e) => setForm((f) => ({ ...f, marketingEmail: e.target.checked }))} />
            Consent — marketing email
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.marketingSms} onChange={(e) => setForm((f) => ({ ...f, marketingSms: e.target.checked }))} />
            Consent — marketing SMS
          </label>
        </div>
      </form>
    </Modal>
  );
}
