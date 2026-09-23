import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmployeeForm from "../../components/hrm/EmployeeForm.jsx";
import AttendanceTab from "../../components/hrm/profileTabs/AttendanceTab.jsx";
import LeaveTab from "../../components/hrm/profileTabs/LeaveTab.jsx";
import PayrollTab from "../../components/hrm/profileTabs/PayrollTab.jsx";
import TargetsTab from "../../components/hrm/profileTabs/TargetsTab.jsx";
import PerformanceTab from "../../components/hrm/profileTabs/PerformanceTab.jsx";
import TrainingsTab from "../../components/hrm/profileTabs/TrainingsTab.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { employees as employeesApi } from "../../services/hrm.js";
import { ROLES } from "../../utils/constants.js";
import { dateShort, initials } from "../../utils/format.js";

const ASSIGNABLE_ROLES = ROLES.filter((r) => r !== "Super Admin");

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "employment", label: "Employment" },
  { key: "documents", label: "Documents" },
  { key: "attendance", label: "Attendance" },
  { key: "leave", label: "Leave" },
  { key: "payroll", label: "Payroll" },
  { key: "performance", label: "Performance" },
  { key: "targets", label: "Targets" },
  { key: "trainings", label: "Trainings attended" },
  { key: "disciplinary", label: "Disciplinary" },
];

const PENDING_TAB = {
  documents: "Documents & Contracts",
  disciplinary: "Disciplinary Records",
};

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const session = useAuth((s) => s.session);
  const canWrite = can("employee:write");
  const canDeactivate = can("employee:deactivate");
  const isSuperAdmin = session?.role === "Super Admin";

  const [tab, setTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [statusModal, setStatusModal] = useState(false);
  const [loginModal, setLoginModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const deleteAction = useMutation((client, empId) => client.delete(`/hrm/employees/${empId}`));

  const { data: employee, loading, error, refetch } = useApiQuery(`/hrm/employees/${id}`);

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
        title="Employee not found"
        description={error.message}
        action={
          <Button variant="secondary" onClick={() => navigate("/hrm/employees")}>
            Back to directory
          </Button>
        }
      />
    );
  }

  const name = `${employee.firstName} ${employee.lastName}`;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {name}
            {employee.status === "inactive" ? (
              <Badge status="inactive">Deactivated</Badge>
            ) : (
              <Badge status={employee.employmentStatus} />
            )}
          </span>
        }
        description={
          <span>
            {employee.employeeId} · {employee.position}
            {employee.department?.name ? ` · ${employee.department.name}` : ""}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/hrm/employees")}>
              Back
            </Button>
            {canWrite && !employee.user && (
              <Button variant="secondary" onClick={() => setLoginModal(true)}>
                Create login
              </Button>
            )}
            {canWrite && <Button onClick={() => setEditing(true)}>Edit</Button>}
            {canDeactivate && (
              <Button
                variant={employee.status === "active" ? "danger" : "primary"}
                onClick={() => setStatusModal(true)}
              >
                {employee.status === "active" ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            {isSuperAdmin && (
              <Button variant="danger" onClick={() => setDeleteModal(true)}>
                Delete
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-200 text-base font-semibold text-ink-700">
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt={name} className="h-14 w-14 rounded-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>
        <div className="text-sm">
          <p className="text-ink-800">{employee.email}</p>
          <p className="text-ink-500">{employee.phone}</p>
          {employee.user ? (
            <p className="mt-0.5 text-2xs text-emerald-600">
              Platform login active
              {employee.user.lastLoginAt ? ` · last signed in ${dateShort(employee.user.lastLoginAt)}` : " · never signed in"}
            </p>
          ) : (
            <p className="mt-0.5 text-2xs text-ink-400">No platform login</p>
          )}
        </div>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "profile" && <ProfileTab e={employee} />}
      {tab === "employment" && <EmploymentTab e={employee} />}
      {tab === "attendance" && <AttendanceTab employee={employee} />}
      {tab === "leave" && <LeaveTab employee={employee} />}
      {tab === "payroll" && (
        <PayrollTab employee={employee} strategy={session?.organizationStrategy} />
      )}
      {tab === "targets" && <TargetsTab employee={employee} />}
      {tab === "performance" && <PerformanceTab employee={employee} />}
      {tab === "trainings" && <TrainingsTab employee={employee} />}
      {PENDING_TAB[tab] && (
        <EmptyState
          title={`${PENDING_TAB[tab]} not yet available`}
          description={`This tab surfaces data from the ${PENDING_TAB[tab]} module, which is being built. It will populate automatically once that module is live.`}
        />
      )}

      {editing && (
        <EmployeeForm
          value={employee}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refetch();
          }}
        />
      )}

      {statusModal && (
        <StatusModal
          employee={employee}
          onClose={() => setStatusModal(false)}
          onDone={() => {
            setStatusModal(false);
            refetch();
          }}
        />
      )}

      {loginModal && (
        <LoginModal
          employee={employee}
          onClose={() => setLoginModal(false)}
          onDone={() => {
            setLoginModal(false);
            refetch();
          }}
        />
      )}

      {deleteModal && (
        <Modal
          open
          onClose={() => setDeleteModal(false)}
          title="Delete employee permanently"
          description={`${name} · ${employee.employeeId}`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleteModal(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={deleteAction.loading}
                onClick={async () => {
                  try {
                    await deleteAction.mutate(employee.id);
                    toast.success(`${name} was deleted`);
                    navigate("/hrm/employees");
                  } catch (e) {
                    toast.error(e.message);
                  }
                }}
              >
                Delete permanently
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-sm">
            <p className="font-medium text-red-700">This cannot be undone.</p>
            <p className="text-ink-600">
              Deleting {name} permanently removes their employee record along with every attendance log, leave
              request and balance, salary structure and payslip history, performance review, disciplinary case,
              document, trip log and notification tied to them. Their platform login is revoked for this
              organization (and deleted outright if this was their only organization).
            </p>
            <p className="text-ink-600">
              Anything that merely referenced them — as someone else's line manager, reviewer, department head or
              branch manager — is unlinked, not deleted.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}

function LoginModal({ employee, onClose, onDone }) {
  const isSuperAdmin = useAuth((s) => s.session?.role === "Super Admin");
  const assignableRoles = isSuperAdmin ? ROLES : ASSIGNABLE_ROLES;
  const [role, setRole] = useState("Staff");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const { email, tempPassword } = await employeesApi.provisionLogin(employee.id, {
        role,
        password: password || undefined,
      });
      toast.success(
        tempPassword ? `Login created for ${email} — temporary password: ${tempPassword}` : `Login created for ${email}`,
      );
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create a login"
      description={`${employee.firstName} ${employee.lastName} · ${employee.email}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={loading} onClick={submit}>
            Create login
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Select label="Role" options={assignableRoles} value={role} onChange={(e) => setRole(e.target.value)} />
        <TextField
          label="Temporary password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Leave blank to auto-generate — shown once after saving. Either way the employee must change it on first sign-in."
        />
      </div>
    </Modal>
  );
}

function ProfileTab({ e }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Personal details">
        <Row label="Full name" value={[e.firstName, e.middleName, e.lastName].filter(Boolean).join(" ")} />
        <Row label="Date of birth" value={e.dateOfBirth ? dateShort(e.dateOfBirth) : "—"} />
        <Row label="Gender" value={e.gender || "—"} />
        <Row label="Marital status" value={e.maritalStatus || "—"} />
        <Row label="State of origin" value={e.stateOfOrigin || "—"} />
        <Row label="LGA" value={e.lga || "—"} />
        <Row label="Residential address" value={e.residentialAddress || "—"} />
        <Row label="State of residence" value={e.residentialState || "—"} />
      </Card>

      <Card title="Contact">
        <Row label="Email" value={e.email} />
        <Row label="Phone" value={e.phone} />
        <Row label="Alternate phone" value={e.altPhone || "—"} />
      </Card>

      <Card title="Emergency contact">
        <Row label="Name" value={e.emergencyContact?.name || "—"} />
        <Row label="Relationship" value={e.emergencyContact?.relationship || "—"} />
        <Row label="Phone" value={e.emergencyContact?.phone || "—"} />
      </Card>

      <Card title="Payroll details">
        <Row label="Bank" value={e.bank?.bankName || "—"} />
        <Row label="Account number" value={e.bank?.accountNumber || "—"} />
        <Row label="Account name" value={e.bank?.accountName || "—"} />
        <Row label="Pension (PFA)" value={e.pension?.pfaName || "—"} />
        <Row label="PFA PIN" value={e.pension?.pfaPin || "—"} />
        <Row label="Tax ID" value={e.taxId || "—"} />
        <Row label="Tax state" value={e.taxState || "—"} />
      </Card>
    </div>
  );
}

function EmploymentTab({ e }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Current position">
        <Row label="Position" value={e.position} />
        <Row label="Grade" value={e.grade || "—"} />
        <Row label="Department" value={e.department?.name || "—"} />
        <Row label="Branch" value={e.branch?.name || "—"} />
        <Row
          label="Reporting manager"
          value={
            e.reportingManager
              ? `${e.reportingManager.firstName} ${e.reportingManager.lastName}`
              : "—"
          }
        />
        <Row label="Employment type" value={e.employmentType} />
        <Row label="Employment status" value={<Badge status={e.employmentStatus} />} />
        <Row label="Date joined" value={dateShort(e.dateJoined)} />
        <Row label="Confirmation date" value={e.confirmationDate ? dateShort(e.confirmationDate) : "—"} />
        <Row label="Contract end date" value={e.contractEndDate ? dateShort(e.contractEndDate) : "—"} />
        {e.exitDate && <Row label="Exit date" value={dateShort(e.exitDate)} />}
      </Card>

      <Card title="Position history">
        <HistoryList entries={e.positionHistory} render={(h) => h.title || "—"} />
      </Card>
      <Card title="Department history">
        <HistoryList entries={e.departmentHistory} render={(h) => h.department?.name || h.department || "—"} />
      </Card>
      <Card title="Branch history">
        <HistoryList entries={e.branchHistory} render={(h) => h.branch?.name || h.branch || "—"} />
      </Card>
    </div>
  );
}

function HistoryList({ entries = [], render }) {
  if (!entries.length) return <p className="text-sm text-ink-500">No history recorded.</p>;
  return (
    <ul className="space-y-2">
      {[...entries]
        .sort((a, b) => new Date(b.from) - new Date(a.from))
        .map((h, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink-800">{render(h)}</span>
            <span className="shrink-0 text-xs text-ink-500">
              {dateShort(h.from)} – {h.to ? dateShort(h.to) : "present"}
            </span>
          </li>
        ))}
    </ul>
  );
}

function Card({ title, children }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink-900">{title}</h3>
      <dl className="space-y-2">{children}</dl>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="shrink-0 text-ink-500">{label}</dt>
      <dd className="min-w-0 truncate text-right text-ink-900">{value}</dd>
    </div>
  );
}

function StatusModal({ employee, onClose, onDone }) {
  const activating = employee.status === "inactive";
  const [reason, setReason] = useState("");
  const { mutate, loading } = useMutation((client) =>
    client.patch(`/hrm/employees/${employee.id}/status`, {
      status: activating ? "active" : "inactive",
      reason: reason || undefined,
    }),
  );

  async function submit() {
    try {
      await mutate();
      toast.success(activating ? "Employee reactivated" : "Employee deactivated");
      onDone();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={activating ? "Reactivate employee" : "Deactivate employee"}
      description={`${employee.firstName} ${employee.lastName} · ${employee.employeeId}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant={activating ? "primary" : "danger"} loading={loading} onClick={submit}>
            {activating ? "Reactivate" : "Deactivate"}
          </Button>
        </>
      }
    >
      {activating ? (
        <p className="text-sm text-ink-600">
          This restores directory access and sets the employee back to active.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            The employee record is retained but marked inactive and excluded from active lists,
            attendance and payroll runs.
          </p>
          <Textarea
            label="Reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Resignation effective 30 Sept"
          />
        </div>
      )}
    </Modal>
  );
}
