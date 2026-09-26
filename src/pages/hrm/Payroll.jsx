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
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
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
  ].filter(Boolean);

  const [tab, setTab] = useState(isManager ? "runs" : "mine");

  return (
    <>
      <PageHeader title="Payroll" />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "runs" && <Runs />}
      {tab === "payslips" && <AllPayslips />}
      {tab === "mine" && <MyPayslips />}
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
