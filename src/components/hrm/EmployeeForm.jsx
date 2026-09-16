import { useState } from "react";
import Drawer from "../ui/Drawer.jsx";
import Button from "../ui/Button.jsx";
import TextField from "../ui/TextField.jsx";
import Select from "../ui/Select.jsx";
import Textarea from "../ui/Textarea.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { fieldErrors } from "../../hooks/useMutation.js";
import { normaliseError } from "../../services/api.js";
import { toast } from "../../store/toast.js";
import { employees as employeesApi } from "../../services/hrm.js";
import { useAuth } from "../../store/auth.js";
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_STATUSES,
  GENDERS,
  NIGERIAN_STATES,
  ROLES,
} from "../../utils/constants.js";

const MARITAL = ["Single", "Married", "Divorced", "Widowed"];

function toDateInput(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * Create / edit an employee. Grouped sections, single-column on mobile and
 * two-column from `sm` upward. Used from the directory and the profile page.
 */
export default function EmployeeForm({ value = {}, onClose, onSaved }) {
  const isNew = !value.id;
  const isSuperAdmin = useAuth((s) => s.session?.role === "Super Admin");
  // Super Admin is only offered to someone who already holds it — granting it
  // is still rejected server-side either way, this just keeps the picker honest.
  const assignableRoles = isSuperAdmin ? ROLES : ROLES.filter((r) => r !== "Super Admin");

  const departments = useApiQuery("/hrm/departments", { params: { limit: 100, status: "active" } });
  const branches = useApiQuery("/hrm/branches", { params: { limit: 100, status: "active" } });
  const managers = useApiQuery("/hrm/employees", { params: { limit: 100, status: "active", sort: "lastName" } });

  const [form, setForm] = useState(() => ({
    firstName: value.firstName || "",
    middleName: value.middleName || "",
    lastName: value.lastName || "",
    email: value.email || "",
    phone: value.phone || "",
    altPhone: value.altPhone || "",
    dateOfBirth: toDateInput(value.dateOfBirth),
    gender: value.gender || "",
    maritalStatus: value.maritalStatus || "",
    stateOfOrigin: value.stateOfOrigin || "",
    lga: value.lga || "",
    residentialAddress: value.residentialAddress || "",
    residentialState: value.residentialState || "",
    emergencyName: value.emergencyContact?.name || "",
    emergencyRelationship: value.emergencyContact?.relationship || "",
    emergencyPhone: value.emergencyContact?.phone || "",
    position: value.position || "",
    grade: value.grade || "",
    department: value.department?.id || value.department || "",
    branch: value.branch?.id || value.branch || "",
    reportingManager: value.reportingManager?.id || value.reportingManager || "",
    employmentType: value.employmentType || "Full-time",
    employmentStatus: value.employmentStatus || "Probation",
    dateJoined: toDateInput(value.dateJoined) || toDateInput(new Date()),
    confirmationDate: toDateInput(value.confirmationDate),
    contractEndDate: toDateInput(value.contractEndDate),
    bankName: value.bank?.bankName || "",
    accountNumber: value.bank?.accountNumber || "",
    accountName: value.bank?.accountName || "",
    taxId: value.taxId || "",
    taxState: value.taxState || "Lagos",
    createLogin: false,
    loginRole: "Staff",
    loginPassword: "",
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const errs = fieldErrors(error);
  const hasLogin = !isNew && Boolean(value.user);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function buildBody() {
    const b = {
      firstName: form.firstName,
      middleName: form.middleName || undefined,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      altPhone: form.altPhone || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      gender: form.gender || undefined,
      maritalStatus: form.maritalStatus || undefined,
      stateOfOrigin: form.stateOfOrigin || undefined,
      lga: form.lga || undefined,
      residentialAddress: form.residentialAddress || undefined,
      residentialState: form.residentialState || undefined,
      position: form.position,
      grade: form.grade || undefined,
      department: form.department || undefined,
      branch: form.branch || undefined,
      reportingManager: form.reportingManager || undefined,
      employmentType: form.employmentType,
      employmentStatus: form.employmentStatus,
      dateJoined: form.dateJoined,
      confirmationDate: form.confirmationDate || undefined,
      contractEndDate: form.contractEndDate || undefined,
      taxId: form.taxId || undefined,
      taxState: form.taxState || undefined,
    };
    const contact = {
      name: form.emergencyName,
      relationship: form.emergencyRelationship,
      phone: form.emergencyPhone,
    };
    if (contact.name || contact.phone) b.emergencyContact = contact;
    const bank = { bankName: form.bankName, accountNumber: form.accountNumber, accountName: form.accountName };
    if (bank.bankName || bank.accountNumber) b.bank = bank;
    return b;
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isNew) {
        const body = buildBody();
        if (form.createLogin) {
          body.provisionLogin = { role: form.loginRole, password: form.loginPassword || undefined };
        }
        const { employee, tempPassword } = await employeesApi.create(body);
        toast.success(
          tempPassword
            ? `Employee added. Login: ${employee.email} — temporary password: ${tempPassword}`
            : "Employee added",
        );
        onSaved(employee);
      } else {
        const saved = await employeesApi.update(value.id, buildBody());
        toast.success("Employee updated");
        onSaved(saved);
      }
    } catch (err) {
      setError(normaliseError(err));
    } finally {
      setLoading(false);
    }
  }

  const deptOptions = (departments.data || []).map((d) => ({ value: d.id, label: d.name }));
  const branchOptions = (branches.data || []).map((b) => ({ value: b.id, label: b.name }));
  const managerOptions = (managers.data || [])
    .filter((m) => m.id !== value.id)
    .map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName} — ${m.position}` }));

  return (
    <Drawer
      open
      onClose={onClose}
      size="xl"
      title={isNew ? "Add employee" : `Edit ${value.firstName} ${value.lastName}`}
      description={value.employeeId}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button form="emp-form" type="submit" loading={loading}>
            {isNew ? "Add employee" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="emp-form" onSubmit={submit} className="space-y-6">
        {error && !error.details && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error.message}
          </p>
        )}

        <Section title="Personal">
          <TextField label="First name" required value={form.firstName} error={errs.firstName} onChange={set("firstName")} />
          <TextField label="Middle name" value={form.middleName} onChange={set("middleName")} />
          <TextField label="Last name" required value={form.lastName} error={errs.lastName} onChange={set("lastName")} />
          <TextField label="Email" type="email" required value={form.email} error={errs.email} onChange={set("email")} />
          <TextField label="Phone" required value={form.phone} error={errs.phone} onChange={set("phone")} placeholder="+234…" />
          <TextField label="Alternate phone" value={form.altPhone} onChange={set("altPhone")} />
          <TextField label="Date of birth" type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          <Select label="Gender" placeholder="—" options={GENDERS} value={form.gender} onChange={set("gender")} />
          <Select label="Marital status" placeholder="—" options={MARITAL} value={form.maritalStatus} onChange={set("maritalStatus")} />
          <Select label="State of origin" placeholder="—" options={NIGERIAN_STATES} value={form.stateOfOrigin} onChange={set("stateOfOrigin")} />
          <TextField label="LGA" value={form.lga} onChange={set("lga")} />
          <Select label="State of residence" placeholder="—" options={NIGERIAN_STATES} value={form.residentialState} onChange={set("residentialState")} />
          <Textarea className="sm:col-span-2" label="Residential address" rows={2} value={form.residentialAddress} onChange={set("residentialAddress")} />
        </Section>

        <Section title="Emergency contact">
          <TextField label="Name" value={form.emergencyName} onChange={set("emergencyName")} />
          <TextField label="Relationship" value={form.emergencyRelationship} onChange={set("emergencyRelationship")} />
          <TextField label="Phone" value={form.emergencyPhone} onChange={set("emergencyPhone")} />
        </Section>

        <Section title="Employment">
          <TextField label="Position / job title" required value={form.position} error={errs.position} onChange={set("position")} />
          <TextField label="Grade / level" value={form.grade} onChange={set("grade")} />
          <Select label="Department" placeholder="Unassigned" options={deptOptions} value={form.department} onChange={set("department")} />
          <Select label="Branch" placeholder="Unassigned" options={branchOptions} value={form.branch} onChange={set("branch")} />
          <Select label="Reporting manager" placeholder="None" options={managerOptions} value={form.reportingManager} onChange={set("reportingManager")} />
          <Select label="Employment type" options={EMPLOYMENT_TYPES} value={form.employmentType} onChange={set("employmentType")} />
          <Select label="Employment status" options={EMPLOYMENT_STATUSES} value={form.employmentStatus} onChange={set("employmentStatus")} />
          <TextField label="Date joined" type="date" required value={form.dateJoined} error={errs.dateJoined} onChange={set("dateJoined")} />
          <TextField label="Confirmation date" type="date" value={form.confirmationDate} onChange={set("confirmationDate")} />
          <TextField label="Contract end date" type="date" value={form.contractEndDate} onChange={set("contractEndDate")} />
        </Section>

        {isNew && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-ink-900">Platform access</legend>
            <label className="flex items-center gap-2 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={form.createLogin}
                onChange={(e) => setForm((f) => ({ ...f, createLogin: e.target.checked }))}
              />
              Create a login so this employee can sign in
            </label>
            {form.createLogin && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Select
                  label="Role"
                  options={assignableRoles}
                  value={form.loginRole}
                  onChange={set("loginRole")}
                />
                <TextField
                  label="Temporary password"
                  value={form.loginPassword}
                  onChange={set("loginPassword")}
                  hint="Leave blank to auto-generate — shown once after saving. Either way the employee must change it on first sign-in."
                />
              </div>
            )}
          </fieldset>
        )}

        {!isNew && (
          <fieldset>
            <legend className="mb-3 text-sm font-semibold text-ink-900">Platform access</legend>
            <p className="text-sm text-ink-600">
              {hasLogin ? (
                <>This employee already has a login ({value.user?.email || value.email}).</>
              ) : (
                <>No login yet — provision one from the employee's profile page.</>
              )}
            </p>
          </fieldset>
        )}

        <Section title="Payroll details">
          <TextField label="Bank name" value={form.bankName} onChange={set("bankName")} />
          <TextField label="Account number" value={form.accountNumber} error={errs["bank.accountNumber"]} onChange={set("accountNumber")} maxLength={10} />
          <TextField label="Account name" value={form.accountName} onChange={set("accountName")} />
          <TextField label="Tax ID (TIN)" value={form.taxId} onChange={set("taxId")} />
          <Select label="Tax state" options={NIGERIAN_STATES} value={form.taxState} onChange={set("taxState")} />
        </Section>
      </form>
    </Drawer>
  );
}

function Section({ title, children }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm font-semibold text-ink-900">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
