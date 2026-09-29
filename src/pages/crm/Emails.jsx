import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Button from "../../components/ui/Button.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import FileInput from "../../components/ui/FileInput.jsx";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { customers as customerApi } from "../../services/crm.js";
import { toast } from "../../store/toast.js";

function formatBytes(n) {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Emails() {
  const [customer, setCustomer] = useState(null);
  const [term, setTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);

  const { mutate, loading, error } = useMutation((client, b) => client.post("/crm/emails/send", b));
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

  function addAttachment(result, file) {
    setAttachments((list) => [...list, { id: result.id, name: result.originalName || file.name, size: result.size }]);
  }
  function removeAttachment(id) {
    setAttachments((list) => list.filter((a) => a.id !== id));
  }

  async function submit(e) {
    e.preventDefault();
    if (!customer) return toast.error("Select a customer to email");
    try {
      await mutate({
        customer: customer.id,
        subject,
        body,
        attachments: attachments.map((a) => ({ id: a.id, name: a.name })),
      });
      toast.success(`Email sent to ${customer.name}`);
      setSubject("");
      setBody("");
      setCustomer(null);
      setAttachments([]);
    } catch {
      /* inline */
    }
  }

  return (
    <>
      <PageHeader title="Emails" description="Send an email straight to a customer, sent as this organization." />

      <form onSubmit={submit} className="max-w-xl space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}

        {customer ? (
          <div className="flex items-center justify-between rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
            <span className="font-medium text-ink-900">
              {customer.name} · {customer.email || customer.phone || customer.customerId}
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
              <ul className="mt-1 max-h-48 divide-y divide-ink-100 overflow-y-auto rounded-md border border-ink-200">
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

        <TextField label="Subject" required value={subject} error={errs.subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label="Message" required rows={8} value={body} error={errs.body} onChange={(e) => setBody(e.target.value)} />

        <div>
          <p className="label">Attachments</p>
          {attachments.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border border-ink-200 px-3 py-1.5 text-sm">
                  <span className="truncate text-ink-700">
                    {a.name}
                    {a.size ? <span className="ml-1.5 text-xs text-ink-400">({formatBytes(a.size)})</span> : null}
                  </span>
                  <button type="button" className="ml-2 shrink-0 text-xs text-red-600 hover:text-red-700" onClick={() => removeAttachment(a.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <FileInput label={attachments.length ? "Add another file" : "Attach a file"} purpose="email-attachment" onUploaded={addAttachment} />
          {errs.attachments && <p className="mt-1 text-xs text-red-600">{errs.attachments}</p>}
        </div>

        <Button type="submit" loading={loading}>
          Send email
        </Button>
      </form>
    </>
  );
}
