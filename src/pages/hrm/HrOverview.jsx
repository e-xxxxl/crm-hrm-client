import { Link } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useAuth } from "../../store/auth.js";
import { dateShort, fromNow } from "../../utils/format.js";

export default function HrOverview() {
  const orgName = useAuth((s) => s.session?.organizationName);
  const { data, loading, error, refetch } = useApiQuery("/hrm/overview");

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-ink-400">
        <Spinner size={24} />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        title="Could not load the overview"
        description={error.message}
        action={
          <button className="btn-secondary" onClick={refetch}>
            Retry
          </button>
        }
      />
    );
  }

  const d = data;
  const es = d.byEmploymentStatus;

  return (
    <>
      <PageHeader title="HR Overview" description={orgName} />

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total employees" value={d.headcount.total} />
        <Stat label="Active" value={d.headcount.active} />
        <Stat label="Probation" value={es.Probation || 0} />
        <Stat label="On leave" value={es["On Leave"] || 0} />
        <Stat label="Suspended" value={es.Suspended || 0} />
        <Stat label="Deactivated" value={d.headcount.inactive} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-4">
        <Stat label="Departments" value={d.structure.departments} to="/hrm/departments" />
        <Stat label="Branches" value={d.structure.branches} to="/hrm/branches" />
        <Stat
          label="Absent today"
          value={d.pending.attendanceToday ?? "—"}
          hint={d.pending.attendanceToday == null ? "Attendance module pending" : undefined}
        />
        <Stat
          label="Pending leave"
          value={d.pending.pendingLeaveRequests ?? "—"}
          hint={d.pending.pendingLeaveRequests == null ? "Leave module pending" : undefined}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Panel title="Recent hires" action={<Link to="/hrm/employees" className="link">View all</Link>}>
          {d.recentHires.length === 0 ? (
            <Empty>No employees yet.</Empty>
          ) : (
            <Table
              head={["Employee", "Position", "Department", "Joined"]}
              rows={d.recentHires.map((e) => [
                <Link key="n" to={`/hrm/employees/${e.id}`} className="link">
                  {e.firstName} {e.lastName}
                </Link>,
                e.position,
                e.department?.name || "—",
                dateShort(e.dateJoined),
              ])}
            />
          )}
        </Panel>

        <Panel title="Upcoming events">
          <SubHead>Contract expirations (next 60 days)</SubHead>
          {d.upcomingContractEnds.length === 0 ? (
            <Empty>No contracts expiring soon.</Empty>
          ) : (
            <Table
              head={["Employee", "Position", "Ends"]}
              rows={d.upcomingContractEnds.map((e) => [
                `${e.firstName} ${e.lastName}`,
                e.position,
                dateShort(e.contractEndDate),
              ])}
            />
          )}
          <SubHead className="mt-4">Birthdays (next 30 days)</SubHead>
          {d.upcomingBirthdays.length === 0 ? (
            <Empty>No birthdays coming up.</Empty>
          ) : (
            <Table
              head={["Employee", "Position", "Date"]}
              rows={d.upcomingBirthdays.map((e) => [
                `${e.firstName} ${e.lastName}`,
                e.position,
                dateShort(e.nextBirthday),
              ])}
            />
          )}
        </Panel>

        <Panel title="Headcount by department">
          {d.byDepartment.length === 0 ? (
            <Empty>No departments with staff.</Empty>
          ) : (
            <BarList items={d.byDepartment} />
          )}
        </Panel>

        <Panel title="Headcount by branch">
          {d.byBranch.length === 0 ? (
            <Empty>No branches with staff.</Empty>
          ) : (
            <BarList items={d.byBranch} />
          )}
        </Panel>

        <Panel title="Recent HR activity" className="lg:col-span-2">
          {d.recentActivity.length === 0 ? (
            <Empty>No recorded activity yet.</Empty>
          ) : (
            <ul className="divide-y divide-ink-100">
              {d.recentActivity.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-4 py-2 text-sm">
                  <span className="text-ink-800">{a.summary || a.action}</span>
                  <span className="shrink-0 text-xs text-ink-500">
                    {a.actorName ? `${a.actorName} · ` : ""}
                    {fromNow(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Stat({ label, value, hint, to }) {
  const body = (
    <div className="bg-white px-3 py-3">
      <p className="text-2xs uppercase tracking-wide text-ink-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-2xs text-ink-400">{hint}</p>}
    </div>
  );
  return to ? (
    <Link to={to} className="transition-colors hover:bg-ink-50">
      {body}
    </Link>
  ) : (
    body
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`card p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function SubHead({ children, className = "" }) {
  return (
    <p className={`mb-1.5 text-2xs font-medium uppercase tracking-wide text-ink-400 ${className}`}>
      {children}
    </p>
  );
}

function Empty({ children }) {
  return <p className="py-3 text-sm text-ink-500">{children}</p>;
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-2xs uppercase tracking-wide text-ink-400">
            {head.map((h) => (
              <th key={h} className="pb-1.5 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((c, j) => (
                <td key={j} className="py-1.5 pr-3 text-ink-800">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarList({ items }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.id} className="text-sm">
          <div className="mb-0.5 flex justify-between">
            <span className="text-ink-700">{it.name}</span>
            <span className="text-ink-500">{it.count}</span>
          </div>
          <div className="h-1.5 rounded-full bg-ink-100">
            <div
              className="h-1.5 rounded-full bg-brand-600"
              style={{ width: `${(it.count / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
