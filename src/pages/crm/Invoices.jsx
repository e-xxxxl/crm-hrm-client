import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Drawer from "../../components/ui/Drawer.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import FilterBar from "../../components/ui/FilterBar.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { invoices as api, customers as customerApi } from "../../services/crm.js";
import { downloadFile } from "../../services/hrm.js";
import { money, dateShort } from "../../utils/format.js";

export default function Invoices() {
  const canWrite = useAuth((s) => s.can("invoice:write"));
  const [filters, setFilters] = useState({ status: "", kind: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const params = { page, limit: 20, status: filters.status || undefined, kind: filters.kind || undefined };
  const list = useApiQuery("/crm/invoices", { params });

  return (
    <>
      <PageHeader
        title="Invoices & Receipts"
        actions={canWrite && <Button onClick={() => setCreating(true)}>New invoice</Button>}
      />

      <FilterBar
        active={filters.status || filters.kind}
        onClear={() => {
          setFilters({ status: "", kind: "" });
          setPage(1);
        }}
      >
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={["draft", "sent", "paid", "void"]}
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: e.target.value }));
            setPage(1);
          }}
        />
        <Select
          className="lg:w-40"
          placeholder="Invoice or receipt"
          options={[{ value: "invoice", label: "Invoice" }, { value: "receipt", label: "Receipt" }]}
          value={filters.kind}
          onChange={(e) => {
            setFilters((f) => ({ ...f, kind: e.target.value }));
            setPage(1);
          }}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No invoices yet", description: "Create an invoice or receipt for a customer to get started." }}
        onRowClick={(r) => setDetailId(r.id)}
        columns={[
          { key: "number", header: "Number", primary: true, render: (r) => r.number },
          { key: "kind", header: "Type", render: (r) => (r.kind === "receipt" ? "Receipt" : "Invoice") },
          {
            key: "customer",
            header: "Customer",
            secondary: true,
            render: (r) => r.customerSnapshot?.name || "—",
          },
          { key: "total", header: "Total", align: "right", render: (r) => money(r.total) },
          { key: "status", header: "Status", render: (r) => <Badge status={r.status === "paid" ? "completed" : r.status === "void" ? "inactive" : r.status}>{r.status}</Badge> },
          { key: "created", header: "Created", render: (r) => dateShort(r.createdAt) },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <InvoiceForm
          onClose={() => setCreating(false)}
          onSaved={(inv) => {
            setCreating(false);
            list.refetch();
            setDetailId(inv.id);
          }}
        />
      )}
      {detailId && (
        <InvoiceDetail id={detailId} canWrite={canWrite} onClose={() => setDetailId(null)} onChanged={list.refetch} />
      )}
    </>
  );
}

function InvoiceForm({ onClose, onSaved }) {
  const [customer, setCustomer] = useState(null);
  const [term, setTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const [kind, setKind] = useState("invoice");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ description: "", quantity: "1", unitPrice: "" }]);

  const { mutate, loading, error } = useMutation((client, body) => client.post("/crm/invoices", body));
  const errs = fieldErrors(error);

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

  function setItem(i, key, value) {
    setItems((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }
  function addItem() {
    setItems((rows) => [...rows, { description: "", quantity: "1", unitPrice: "" }]);
  }
  function removeItem(i) {
    setItems((rows) => rows.filter((_, idx) => idx !== i));
  }

  const subtotal = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const total = subtotal + subtotal * ((Number(taxRate) || 0) / 100);

  async function submit(e) {
    e.preventDefault();
    if (!customer) return toast.error("Select a customer");
    const lineItems = items
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0 }));
    if (lineItems.length === 0) return toast.error("Add at least one line item");
    try {
      const invoice = await mutate({
        customer: customer.id,
        kind,
        lineItems,
        taxRate: Number(taxRate) || 0,
        notes: notes || undefined,
      });
      toast.success(`${kind === "receipt" ? "Receipt" : "Invoice"} ${invoice.number} created`);
      onSaved(invoice);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title="New invoice"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="invoice-form" type="submit" loading={loading}>
            Create
          </Button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}

        {customer ? (
          <div className="flex items-center justify-between rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">
              {customer.name} · {customer.customerId}
            </span>
            <button type="button" className="text-xs text-ink-500" onClick={() => setCustomer(null)}>
              Change
            </button>
          </div>
        ) : (
          <div>
            <label className="label">Customer</label>
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
                      }}
                    >
                      {m.name} · <span className="text-ink-500">{m.customerId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errs.customer && <p className="mt-1 text-xs text-red-600">{errs.customer}</p>}
          </div>
        )}

        <Select label="Type" options={[{ value: "invoice", label: "Invoice" }, { value: "receipt", label: "Receipt (already paid)" }]} value={kind} onChange={(e) => setKind(e.target.value)} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="label">Line items</p>
            <button type="button" className="link text-xs" onClick={addItem}>
              + Add line
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 items-start gap-2">
                <div className="col-span-6">
                  <TextField placeholder="Description" value={item.description} onChange={(e) => setItem(i, "description", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <TextField type="number" min="0" placeholder="Qty" value={item.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} />
                </div>
                <div className="col-span-3">
                  <TextField type="number" min="0" step="0.01" placeholder="Unit price" value={item.unitPrice} onChange={(e) => setItem(i, "unitPrice", e.target.value)} />
                </div>
                <div className="col-span-1 pt-2">
                  {items.length > 1 && (
                    <button type="button" className="text-xs text-red-600" onClick={() => removeItem(i)}>
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Tax rate (%)" type="number" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
        </div>
        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
          Subtotal: <span className="font-medium">{money(subtotal)}</span>
          {" · "}Total: <span className="font-medium text-ink-900">{money(total)}</span>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDetail({ id, canWrite, onClose, onChanged }) {
  const { data: invoice, loading, error, refetch } = useApiQuery(`/crm/invoices/${id}`);
  const isSuperAdmin = useAuth((s) => s.session?.role === "Super Admin");
  const [sendModal, setSendModal] = useState(false);
  const voidM = useMutation((client) => client.patch(`/crm/invoices/${id}/status`, { status: "void" }));
  const paidM = useMutation((client) => client.patch(`/crm/invoices/${id}/status`, { status: "paid" }));
  const removeM = useMutation((client) => client.delete(`/crm/invoices/${id}`));

  async function act(mut, label) {
    try {
      await mut.mutate();
      toast.success(label);
      refetch();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${invoice.number}?`)) return;
    try {
      await removeM.mutate();
      toast.success("Invoice deleted");
      onChanged?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      title={invoice ? invoice.number : "Invoice"}
      description={invoice?.customerSnapshot?.name}
      footer={
        invoice && (
          <>
            <Button variant="secondary" onClick={() => downloadFile(api.pdfUrl(id), `${invoice.number}.pdf`)}>
              Download PDF
            </Button>
            {canWrite && invoice.status !== "void" && (
              <Button onClick={() => setSendModal(true)}>Email to customer</Button>
            )}
            {canWrite && invoice.kind === "invoice" && invoice.status === "sent" && (
              <Button variant="secondary" loading={paidM.loading} onClick={() => act(paidM, "Marked as paid")}>
                Mark paid
              </Button>
            )}
            {canWrite && invoice.status !== "void" && (
              <Button variant="danger" loading={voidM.loading} onClick={() => act(voidM, "Invoice voided")}>
                Void
              </Button>
            )}
            {(isSuperAdmin || (canWrite && invoice.status === "draft")) && (
              <Button variant="danger" loading={removeM.loading} onClick={handleDelete}>
                Delete
              </Button>
            )}
          </>
        )
      }
    >
      {loading && (
        <div className="flex justify-center py-10 text-ink-400">
          <Spinner size={22} />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error.message}</p>}
      {invoice && (
        <div className="space-y-5 text-sm">
          <div className="flex items-center gap-2">
            <Badge status={invoice.status === "paid" ? "completed" : invoice.status === "void" ? "inactive" : invoice.status}>{invoice.status}</Badge>
            {invoice.sentTo && <span className="text-xs text-ink-500">Sent to {invoice.sentTo}</span>}
          </div>

          <div>
            <p className="label">Billed to</p>
            <p className="text-ink-800">{invoice.customerSnapshot?.name}</p>
            <p className="text-ink-500">{invoice.customerSnapshot?.email || "No email on file"}</p>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-2xs uppercase tracking-wide text-ink-400">
                <th className="pb-1.5">Description</th>
                <th className="pb-1.5 text-right">Qty</th>
                <th className="pb-1.5 text-right">Unit price</th>
                <th className="pb-1.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {invoice.lineItems.map((item, i) => (
                <tr key={i}>
                  <td className="py-1.5">{item.description}</td>
                  <td className="py-1.5 text-right">{item.quantity}</td>
                  <td className="py-1.5 text-right">{money(item.unitPrice)}</td>
                  <td className="py-1.5 text-right">{money(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto w-56 space-y-1">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd>{money(invoice.subtotal)}</dd>
            </div>
            {invoice.taxRate > 0 && (
              <div className="flex justify-between">
                <dt className="text-ink-500">Tax ({invoice.taxRate}%)</dt>
                <dd>{money(invoice.taxAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-ink-200 pt-1 font-semibold text-ink-900">
              <dt>Total</dt>
              <dd>{money(invoice.total)}</dd>
            </div>
          </dl>

          {invoice.notes && (
            <div>
              <p className="label">Notes</p>
              <p className="whitespace-pre-wrap text-ink-700">{invoice.notes}</p>
            </div>
          )}
        </div>
      )}

      {sendModal && invoice && (
        <SendInvoiceModal
          id={id}
          defaultTo={invoice.customerSnapshot?.email}
          onClose={() => setSendModal(false)}
          onSent={() => {
            setSendModal(false);
            refetch();
            onChanged?.();
          }}
        />
      )}
    </Drawer>
  );
}

function SendInvoiceModal({ id, defaultTo, onClose, onSent }) {
  const [to, setTo] = useState(defaultTo || "");
  const { mutate, loading, error } = useMutation((client, body) => client.post(`/crm/invoices/${id}/send`, body));

  async function submit() {
    if (!to.trim()) return toast.error("Enter a recipient email");
    try {
      await mutate({ to: to.trim() });
      toast.success("Invoice emailed");
      onSent();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Email invoice"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={submit}>
            Send
          </Button>
        </>
      }
    >
      {error && <Alert tone="error" className="mb-3">{error.message}</Alert>}
      <TextField label="Send to" type="email" required value={to} onChange={(e) => setTo(e.target.value)} />
    </Modal>
  );
}
