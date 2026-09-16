import { useState } from "react";
import Modal from "../ui/Modal.jsx";
import Button from "../ui/Button.jsx";
import Select from "../ui/Select.jsx";
import TextField from "../ui/TextField.jsx";
import Textarea from "../ui/Textarea.jsx";
import Alert from "../ui/Alert.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { customers as customerApi } from "../../services/crm.js";
import { toast } from "../../store/toast.js";

/**
 * New-ticket flow: search customer → auto-load contact → fill fields.
 * `presetCustomer` skips the search step (used from a customer profile).
 */
export default function TicketForm({ presetCustomer, onClose, onSaved }) {
  const [customer, setCustomer] = useState(presetCustomer || null);
  const [term, setTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const debounced = useDebouncedValue(term, 250);

  const agents = useApiQuery("/hrm/employees", {
    params: { limit: 200, status: "active", sort: "lastName" },
  });

  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "general",
    priority: "normal",
    channel: "phone",
    assignee: "",
    fromCustomer: true,
  });

  const { mutate, loading, error } = useMutation((client, body) => client.post("/crm/tickets", body));
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function runSearch(value) {
    setTerm(value);
    if (value.trim().length < 2) return setMatches([]);
    try {
      const res = await customerApi.search(value.trim());
      setMatches(res.results || []);
    } catch {
      setMatches([]);
    }
  }

  async function submit(e) {
    e.preventDefault();
    try {
      const ticket = await mutate({
        subject: form.subject,
        description: form.description || undefined,
        customer: customer?.id || undefined,
        category: form.category || undefined,
        priority: form.priority,
        channel: form.channel,
        assignee: form.assignee || undefined,
        fromCustomer: form.fromCustomer,
      });
      toast.success(`Ticket ${ticket.ticketNumber} created`);
      onSaved(ticket);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="New ticket"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="ticket-form" type="submit" loading={loading}>
            Create ticket
          </Button>
        </>
      }
    >
      <form id="ticket-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}

        {/* Customer */}
        {customer ? (
          <div className="flex items-center justify-between rounded-md border border-ink-200 bg-ink-50 px-3 py-2">
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium text-ink-900">{customer.displayName || customer.name}</p>
              <p className="truncate text-xs text-ink-500">
                {customer.customerId} · {customer.primaryPhone || customer.phone || customer.primaryEmail || customer.email || "no contact"}
              </p>
            </div>
            {!presetCustomer && (
              <button type="button" className="text-xs text-ink-500 hover:text-ink-800" onClick={() => setCustomer(null)}>
                Change
              </button>
            )}
          </div>
        ) : (
          <div>
            <label className="label">Customer (optional)</label>
            <input
              className="input"
              placeholder="Search name, phone, email, ID"
              value={term}
              onChange={(e) => runSearch(e.target.value)}
            />
            {matches.length > 0 && (
              <ul className="mt-1 max-h-44 divide-y divide-ink-100 overflow-y-auto rounded-md border border-ink-200">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-ink-50"
                      onClick={() => {
                        setCustomer(m);
                        setMatches([]);
                        setTerm("");
                      }}
                    >
                      <span className="font-medium text-ink-900">{m.name}</span>
                      <span className="ml-2 text-xs text-ink-500">
                        {m.customerId} · {m.phone || m.email}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <TextField label="Subject" required value={form.subject} error={errs.subject} onChange={set("subject")} />
        <Textarea label="Description" rows={4} value={form.description} error={errs.description} onChange={set("description")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Category" value={form.category} onChange={set("category")} />
          <Select
            label="Priority"
            options={["low", "normal", "high", "urgent"]}
            value={form.priority}
            onChange={set("priority")}
          />
          <Select
            label="Channel"
            options={["phone", "email", "whatsapp", "walk-in", "web", "social"]}
            value={form.channel}
            onChange={set("channel")}
          />
          <Select
            label="Assign to"
            placeholder="Unassigned"
            options={(agents.data || [])
              .filter((a) => a.user)
              .map((a) => ({ value: a.user, label: `${a.firstName} ${a.lastName}` }))}
            value={form.assignee}
            onChange={set("assignee")}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.fromCustomer}
            onChange={(e) => setForm((f) => ({ ...f, fromCustomer: e.target.checked }))}
          />
          Opening message is from the customer
        </label>
      </form>
    </Modal>
  );
}
