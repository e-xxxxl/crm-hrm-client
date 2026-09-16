import { useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import TextField from "../../components/ui/TextField.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { money, number } from "../../utils/format.js";

export default function HrReports() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, loading, error } = useApiQuery("/hrm/reports/hr", { params: { month } });

  return (
    <>
      <PageHeader
        title="HR Reports"
        actions={
          <TextField
            type="month"
            value={month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={(e) => setMonth(e.target.value)}
          />
        }
      />

      {loading ? (
        <div className="flex justify-center py-16 text-ink-400">
          <Spinner size={22} />
        </div>
      ) : error ? (
        <EmptyState title="Report unavailable" description={error.message} />
      ) : (
        <div className="space-y-8">
          <p className="text-sm text-ink-500">
            {data.organization} · {data.period} · {data.workingDays} working days
          </p>

          <Section title="Workforce">
            <Metrics
              items={[
                ["Total headcount", number(data.workforce.total)],
                ["Active", number(data.workforce.active)],
                ["Inactive", number(data.workforce.inactive)],
              ]}
            />
            <TwoCol>
              <BarCard title="By department" rows={data.workforce.byDepartment} />
              <BarCard title="By branch" rows={data.workforce.byBranch} />
            </TwoCol>
            <KeyValue title="Employment type" data={data.workforce.byType} />
          </Section>

          <Section title="Attendance">
            <Metrics
              items={[
                ["Attendance rate", data.attendance.attendanceRate != null ? `${data.attendance.attendanceRate}%` : "—"],
                ["Late rate", data.attendance.lateRate != null ? `${data.attendance.lateRate}%` : "—"],
                ["Present", number(data.attendance.present)],
                ["Late", number(data.attendance.late)],
                ["Absent", number(data.attendance.absent)],
                ["Hours logged", number(data.attendance.totalHours)],
              ]}
            />
          </Section>

          <Section title="Leave">
            <Metrics
              items={[
                ["Approved days (year)", number(data.leave.totalApprovedDays)],
                ["Pending approvals", number(data.leave.pendingApprovals)],
              ]}
            />
            {data.leave.byType.length > 0 && (
              <BarCard
                title="Leave utilisation by type"
                rows={data.leave.byType.map((r) => ({ name: r.name, count: r.days }))}
              />
            )}
          </Section>

          <Section title="Payroll">
            {data.payroll ? (
              <Metrics
                items={[
                  ["Period", data.payroll.period],
                  ["Status", data.payroll.status],
                  ["Employees", number(data.payroll.employees)],
                  ["Gross", money(data.payroll.gross, { whole: true })],
                  ["PAYE", money(data.payroll.paye, { whole: true })],
                  ["Pension", money(data.payroll.pension, { whole: true })],
                  ["Net payroll", money(data.payroll.net, { whole: true })],
                ]}
              />
            ) : (
              <p className="text-sm text-ink-500">No approved payroll run yet.</p>
            )}
          </Section>
        </div>
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-ink-900">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Metrics({ items }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-6">
      {items.map(([label, value]) => (
        <div key={label} className="bg-white px-3 py-2.5">
          <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

function TwoCol({ children }) {
  return <div className="grid gap-4 lg:grid-cols-2">{children}</div>;
}

function BarCard({ title, rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card p-4">
        <p className="mb-2 text-sm font-medium text-ink-900">{title}</p>
        <p className="text-sm text-ink-500">No data.</p>
      </div>
    );
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="card p-4">
      <p className="mb-3 text-sm font-medium text-ink-900">{title}</p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.name} className="text-sm">
            <div className="mb-0.5 flex justify-between">
              <span className="text-ink-700">{r.name}</span>
              <span className="text-ink-500">{number(r.count)}</span>
            </div>
            <div className="h-1.5 rounded-full bg-ink-100">
              <div className="h-1.5 rounded-full bg-brand-600" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeyValue({ title, data }) {
  const entries = Object.entries(data || {});
  if (entries.length === 0) return null;
  return (
    <div className="card p-4">
      <p className="mb-2 text-sm font-medium text-ink-900">{title}</p>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {entries.map(([k, v]) => (
          <div key={k}>
            <dt className="text-2xs uppercase tracking-wide text-ink-400">{k}</dt>
            <dd className="text-ink-800">{number(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
