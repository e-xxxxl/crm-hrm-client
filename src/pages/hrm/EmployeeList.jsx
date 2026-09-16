import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import Select from "../../components/ui/Select.jsx";
import EmployeeForm from "../../components/hrm/EmployeeForm.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuth } from "../../store/auth.js";
import { EMPLOYMENT_TYPES, EMPLOYMENT_STATUSES } from "../../utils/constants.js";
import { dateShort, initials } from "../../utils/format.js";

const INITIAL_FILTERS = {
  search: "",
  department: "",
  branch: "",
  employmentType: "",
  employmentStatus: "",
  status: "active",
};

export default function EmployeeList() {
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const canWrite = can("employee:write");

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebouncedValue(filters.search);

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      sort: "lastName",
      search: search || undefined,
      department: filters.department || undefined,
      branch: filters.branch || undefined,
      employmentType: filters.employmentType || undefined,
      employmentStatus: filters.employmentStatus || undefined,
      status: filters.status || undefined,
    }),
    [page, search, filters],
  );

  const list = useApiQuery("/hrm/employees", { params });
  const departments = useApiQuery("/hrm/departments", { params: { limit: 100, status: "active" } });
  const branches = useApiQuery("/hrm/branches", { params: { limit: 100, status: "active" } });

  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(INITIAL_FILTERS);

  return (
    <>
      <PageHeader
        title="Employees"
        description="Everyone employed by this organization."
        actions={canWrite && <Button onClick={() => setCreating(true)}>Add employee</Button>}
      />

      <FilterBar active={filtersActive} onClear={() => update(INITIAL_FILTERS)}>
        <SearchInput
          value={filters.search}
          onChange={(v) => update({ search: v })}
          placeholder="Name, ID, email, phone"
        />
        <Select
          className="lg:w-44"
          placeholder="All departments"
          options={(departments.data || []).map((d) => ({ value: d.id, label: d.name }))}
          value={filters.department}
          onChange={(e) => update({ department: e.target.value })}
        />
        <Select
          className="lg:w-40"
          placeholder="All branches"
          options={(branches.data || []).map((b) => ({ value: b.id, label: b.name }))}
          value={filters.branch}
          onChange={(e) => update({ branch: e.target.value })}
        />
        <Select
          className="lg:w-40"
          placeholder="Any type"
          options={EMPLOYMENT_TYPES}
          value={filters.employmentType}
          onChange={(e) => update({ employmentType: e.target.value })}
        />
        <Select
          className="lg:w-40"
          placeholder="Any HR status"
          options={EMPLOYMENT_STATUSES}
          value={filters.employmentStatus}
          onChange={(e) => update({ employmentStatus: e.target.value })}
        />
        <Select
          className="lg:w-36"
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Deactivated" },
            { value: "", label: "All records" },
          ]}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        empty={{
          title: "No employees found",
          description: filtersActive
            ? "No employees match the current filters."
            : "Add your first employee to get started.",
        }}
        onRowClick={(row) => navigate(`/hrm/employees/${row.id}`)}
        columns={[
          {
            key: "name",
            header: "Employee",
            primary: true,
            render: (r) => (
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-200 text-2xs font-semibold text-ink-700">
                  {initials(`${r.firstName} ${r.lastName}`)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink-900">
                    {r.firstName} {r.lastName}
                  </p>
                  <p className="truncate text-xs text-ink-500">{r.email}</p>
                </div>
              </div>
            ),
          },
          { key: "employeeId", header: "ID", render: (r) => r.employeeId },
          { key: "department", header: "Department", render: (r) => r.department?.name || "—" },
          { key: "position", header: "Position", secondary: true, render: (r) => r.position },
          { key: "branch", header: "Branch", render: (r) => r.branch?.name || "—" },
          { key: "employmentType", header: "Type", render: (r) => r.employmentType },
          {
            key: "employmentStatus",
            header: "Status",
            render: (r) =>
              r.status === "inactive" ? (
                <Badge status="inactive">Deactivated</Badge>
              ) : (
                <Badge status={r.employmentStatus} />
              ),
          },
          { key: "dateJoined", header: "Joined", render: (r) => dateShort(r.dateJoined) },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <EmployeeForm
          onClose={() => setCreating(false)}
          onSaved={(saved) => {
            setCreating(false);
            if (saved?.id) navigate(`/hrm/employees/${saved.id}`);
            else list.refetch();
          }}
        />
      )}
    </>
  );
}
