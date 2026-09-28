import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Select from "../../components/ui/Select.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import FilterBar from "../../components/ui/FilterBar.jsx";
import PayrollRunDetail from "../../components/hrm/PayrollRunDetail.jsx";
import PayslipView from "../../components/hrm/PayslipView.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { loans as loansApi } from "../../services/hrm.js";
import { money, dateShort } from "../../utils/format.js";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Payroll() {
  const can = useAuth((s) => s.can);
  const isManager = can("payroll:read");

  const tabs = [
    isManager && { key: "runs", label: "Payroll runs" },
    isManager && { key: "payslips", label: "Payslips" },
    { key: "mine", label: "My payslips" },
    { key: "loans", label: "Loans" },
  ].filter(Boolean);

  const [tab, setTab] = useState(isManager ? "runs" : "mine");

  return (
    <>
      <PageHeader title="Payroll" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "runs" && <Runs />}
      {tab === "payslips" && <AllPayslips />}
      {tab === "mine" && <MyPayslips />}
      {tab === "loans" && <Loans />}
    </>
  );
}

function Runs() {
  const can = useAuth((s) => s.can);
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [creating, setCreating] = useState(false);

  const list = useApiQuery("/hrm/payroll/runs", { params: { page, limit: 20 } });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Payroll runs</h2>
        {can("payroll:run") && <Button onClick={() => setCreating(true)}>New payroll run</Button>}
      </div>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{
          title: "No payroll runs",
          description: can("payroll:run")
            ? "Create a run for the current month to begin."
            : "No payroll has been run yet.",
        }}
        onRowClick={(r) => setDetailId(r.id)}
        columns={[
          { key: "reference", header: "Ref", render: (r) => r.reference },
          { key: "period", header: "Period", primary: true, render: (r) => r.periodLabel },
          { key: "strategy", header: "Strategy", render: (r) => r.strategy },
          { key: "employees", header: "Employees", align: "right", render: (r) => r.totals?.employeeCount ?? 0 },
          {
            key: "paye",
            header: "Total PAYE",
            align: "right",
            secondary: true,
            render: (r) => money(r.totals?.paye, { whole: true }),
          },
          {
            key: "net",
            header: "Net pay",
            align: "right",
            render: (r) => money(r.totals?.netPay, { whole: true }),
          },
          {
            key: "status",
            header: "Status",
            secondary: true,
            render: (r) => <Badge status={r.status}>{r.status}</Badge>,
          },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <CreateRunModal
          onClose={() => setCreating(false)}
          onCreated={(run) => {
            setCreating(false);
            list.refetch();
            setDetailId(run.id);
          }}
        />
      )}
      {detailId && (
        <PayrollRunDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onChanged={() => list.refetch()}
        />
      )}
    </>
  );
}

function CreateRunModal({ onClose, onCreated }) {
  const now = new Date();
  const [form, setForm] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    notes: "",
  });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/payroll/runs", body));
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    try {
      const run = await mutate({ year: Number(form.year), month: Number(form.month), notes: form.notes || undefined });
      toast.success(`Payroll run ${run.reference} created`);
      onCreated(run);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="New payroll run"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="run-form" type="submit" loading={loading}>
            Create
          </Button>
        </>
      }
    >
      <form id="run-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Month"
            options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
            value={form.month}
            error={errs.month}
            onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))}
          />
          <TextField
            label="Year"
            type="number"
            min="2000"
            max="2100"
            value={form.year}
            error={errs.year}
            onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
          />
        </div>
        <p className="text-xs text-ink-500">
          Payslips are generated when you calculate the run. Employees without a salary structure are
          excluded.
        </p>
      </form>
    </Modal>
  );
}

function AllPayslips() {
  const [filters, setFilters] = useState({ status: "", year: "", month: "" });
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit: 25,
      status: filters.status || undefined,
      year: filters.year || undefined,
      month: filters.month || undefined,
    }),
    [page, filters],
  );
  const list = useApiQuery("/hrm/payroll/payslips", { params });

  return (
    <>
      <FilterBar
        active={filters.status || filters.year || filters.month}
        onClear={() => {
          setFilters({ status: "", year: "", month: "" });
          setPage(1);
        }}
      >
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={["pending", "paid"]}
          value={filters.status}
          onChange={(e) => {
            setFilters((f) => ({ ...f, status: e.target.value }));
            setPage(1);
          }}
        />
        <Select
          className="lg:w-40"
          placeholder="Any month"
          options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
          value={filters.month}
          onChange={(e) => {
            setFilters((f) => ({ ...f, month: e.target.value }));
            setPage(1);
          }}
        />
        <TextField
          className="lg:w-28"
          type="number"
          placeholder="Year"
          value={filters.year}
          onChange={(e) => {
            setFilters((f) => ({ ...f, year: e.target.value }));
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
        empty={{ title: "No payslips", description: "Payslips appear here after a run is calculated." }}
        onRowClick={(p) => setViewId(p.id)}
        columns={[
          { key: "name", header: "Employee", primary: true, render: (p) => p.employeeSnapshot?.name },
          { key: "period", header: "Period", secondary: true, render: (p) => p.periodLabel },
          { key: "gross", header: "Gross", align: "right", render: (p) => money(p.grossEarnings) },
          { key: "net", header: "Net", align: "right", render: (p) => money(p.netPay) },
          { key: "status", header: "Status", render: (p) => <Badge status={p.status}>{p.status}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {viewId && <PayslipView id={viewId} onClose={() => setViewId(null)} onChanged={list.refetch} />}
    </>
  );
}

function MyPayslips() {
  const { data, loading, error } = useApiQuery("/hrm/payroll/payslips/mine");
  const [viewId, setViewId] = useState(null);

  if (loading) return <p className="py-10 text-center text-sm text-ink-400">Loading…</p>;
  if (error) return <EmptyState title="Payslips unavailable" description={error.message} />;

  return (
    <>
      <DataTable
        rows={data || []}
        keyField="id"
        empty={{ title: "No payslips yet", description: "Your payslips appear here once payroll is finalized." }}
        onRowClick={(p) => setViewId(p.id)}
        columns={[
          { key: "period", header: "Period", primary: true, render: (p) => p.periodLabel },
          { key: "gross", header: "Gross", align: "right", render: (p) => money(p.grossEarnings) },
          { key: "deductions", header: "Deductions", align: "right", render: (p) => money(p.totalDeductions) },
          { key: "net", header: "Net pay", align: "right", secondary: true, render: (p) => money(p.netPay) },
          { key: "status", header: "Status", render: (p) => <Badge status={p.status}>{p.status}</Badge> },
          { key: "issued", header: "Issued", render: (p) => dateShort(p.createdAt) },
        ]}
      />
      {viewId && <PayslipView id={viewId} onClose={() => setViewId(null)} />}
    </>
  );
}

const LOAN_LABEL = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function Loans() {
  const canManage = useAuth((s) => s.can("payroll:configure"));
  const [applying, setApplying] = useState(false);
  const mine = useApiQuery("/hrm/loans/mine");

  return (
    <div className="space-y-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">My loan</h2>
          <Button onClick={() => setApplying(true)}>Apply for a loan</Button>
        </div>
        {mine.loading ? (
          <p className="py-6 text-center text-sm text-ink-400">Loading…</p>
        ) : mine.error ? (
          <EmptyState title="Could not load" description={mine.error.message} />
        ) : (mine.data || []).length === 0 ? (
          <p className="text-sm text-ink-500">You haven't applied for a loan.</p>
        ) : (
          <ul className="space-y-2">
            {mine.data.map((l) => (
              <MyLoanRow key={l.id} loan={l} onChanged={mine.refetch} />
            ))}
          </ul>
        )}
      </div>

      {canManage && <ManageLoans />}

      {applying && (
        <ApplyLoanModal
          onClose={() => setApplying(false)}
          onSaved={() => {
            setApplying(false);
            mine.refetch();
          }}
        />
      )}
    </div>
  );
}

function MyLoanRow({ loan, onChanged }) {
  const cancel = useMutation(() => loansApi.cancel(loan.id));

  async function handleCancel() {
    if (!confirm("Withdraw this loan request?")) return;
    try {
      await cancel.mutate();
      toast.success("Loan request withdrawn");
      onChanged();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <li className="card flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-900">
          {money(loan.amount)} · {loan.repaymentMonths} month{loan.repaymentMonths === 1 ? "" : "s"} at {money(loan.monthlyDeduction)}/mo
        </p>
        <p className="mt-0.5 text-xs text-ink-500">
          {loan.reason || "No reason given"} · requested {dateShort(loan.requestedAt)}
        </p>
        {["approved", "completed"].includes(loan.status) && (
          <p className="mt-0.5 text-xs text-ink-500">Balance remaining: {money(loan.balanceRemaining)}</p>
        )}
        {loan.status === "rejected" && loan.decisionNote && (
          <p className="mt-0.5 text-xs text-red-600">{loan.decisionNote}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge status={loan.status === "completed" ? "completed" : loan.status === "pending" ? "pending" : loan.status === "rejected" || loan.status === "cancelled" ? "inactive" : "active"}>
          {LOAN_LABEL(loan.status)}
        </Badge>
        {loan.status === "pending" && (
          <button type="button" className="text-xs text-red-600 hover:text-red-700" onClick={handleCancel}>
            Withdraw
          </button>
        )}
      </div>
    </li>
  );
}

function ApplyLoanModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ amount: "", repaymentMonths: "1", reason: "" });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/loans", body));
  const errs = fieldErrors(error);

  async function submit(e) {
    e.preventDefault();
    try {
      await mutate({
        amount: Number(form.amount),
        repaymentMonths: Number(form.repaymentMonths) || 1,
        reason: form.reason || undefined,
      });
      toast.success("Loan request submitted");
      onSaved();
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Apply for a loan"
      description="Capped at 50% of your current monthly gross salary."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="loan-form" type="submit" loading={loading}>
            Submit request
          </Button>
        </>
      }
    >
      <form id="loan-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error.message}</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Amount (NGN)"
            type="number"
            min="0"
            step="0.01"
            required
            value={form.amount}
            error={errs.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <TextField
            label="Repay over (months)"
            type="number"
            min="1"
            max="24"
            value={form.repaymentMonths}
            error={errs.repaymentMonths}
            onChange={(e) => setForm((f) => ({ ...f, repaymentMonths: e.target.value }))}
            hint="1 month = deducted in full from next salary"
          />
        </div>
        <Textarea
          label="Reason"
          rows={2}
          value={form.reason}
          onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
        />
      </form>
    </Modal>
  );
}

function ManageLoans() {
  const [status, setStatus] = useState("pending");
  const list = useApiQuery("/hrm/loans", { params: { status: status || undefined } });
  const [decidingId, setDecidingId] = useState(null);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Loan requests</h2>
        <Select
          className="w-40"
          options={["pending", "approved", "rejected", "completed", "cancelled"].map((s) => ({ value: s, label: LOAN_LABEL(s) }))}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>
      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No loan requests", description: `No ${status} requests right now.` }}
        columns={[
          { key: "name", header: "Employee", primary: true, render: (l) => `${l.employee?.firstName} ${l.employee?.lastName}` },
          { key: "amount", header: "Amount", align: "right", render: (l) => money(l.amount) },
          { key: "monthly", header: "Monthly", align: "right", render: (l) => money(l.monthlyDeduction) },
          { key: "balance", header: "Balance", align: "right", render: (l) => money(l.balanceRemaining) },
          { key: "requested", header: "Requested", render: (l) => dateShort(l.requestedAt) },
        ]}
        rowActions={
          status === "pending"
            ? (l) => (
                <div className="flex justify-end gap-3 text-xs">
                  <button type="button" className="link" onClick={() => setDecidingId({ id: l.id, action: "approved" })}>
                    Approve
                  </button>
                  <button type="button" className="text-red-600 hover:text-red-700" onClick={() => setDecidingId({ id: l.id, action: "rejected" })}>
                    Reject
                  </button>
                </div>
              )
            : undefined
        }
      />

      {decidingId && (
        <DecideLoanModal
          id={decidingId.id}
          action={decidingId.action}
          onClose={() => setDecidingId(null)}
          onDone={() => {
            setDecidingId(null);
            list.refetch();
          }}
        />
      )}
    </div>
  );
}

function DecideLoanModal({ id, action, onClose, onDone }) {
  const [note, setNote] = useState("");
  const { mutate, loading } = useMutation((client, body) => client.post(`/hrm/loans/${id}/decide`, body));

  async function submit() {
    try {
      await mutate({ status: action, note: note || undefined });
      toast.success(action === "approved" ? "Loan approved" : "Loan rejected");
      onDone();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={action === "approved" ? "Approve loan" : "Reject loan"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={action === "rejected" ? "danger" : "primary"} loading={loading} onClick={submit}>
            {action === "approved" ? "Approve" : "Reject"}
          </Button>
        </>
      }
    >
      <Textarea
        label={action === "approved" ? "Note (optional)" : "Reason for rejection"}
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  );
}
