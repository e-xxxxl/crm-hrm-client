import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import Select from "../../components/ui/Select.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { useAuth } from "../../store/auth.js";
import CustomerForm from "../../components/crm/CustomerForm.jsx";
import { fromNow } from "../../utils/format.js";

export default function CustomerList() {
  const navigate = useNavigate();
  const canWrite = useAuth((s) => s.can("customer:write"));
  const [filters, setFilters] = useState({ search: "", status: "", type: "", segment: "" });
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const search = useDebouncedValue(filters.search);

  const params = useMemo(
    () => ({
      page,
      limit: 25,
      search: search || undefined,
      status: filters.status || undefined,
      type: filters.type || undefined,
      segment: filters.segment || undefined,
    }),
    [page, search, filters.status, filters.type, filters.segment],
  );
  const list = useApiQuery("/crm/customers", { params });
  const segments = useApiQuery("/crm/customers/segments");

  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Customers"
        actions={canWrite && <Button onClick={() => setCreating(true)}>New customer</Button>}
      />

      <FilterBar
        active={filters.search || filters.status || filters.type || filters.segment}
        onClear={() => update({ search: "", status: "", type: "", segment: "" })}
      >
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Name, phone, email, ID" />
        <Select
          className="lg:w-40"
          placeholder="Any type"
          options={[
            { value: "individual", label: "Individual" },
            { value: "business", label: "Business" },
          ]}
          value={filters.type}
          onChange={(e) => update({ type: e.target.value })}
        />
        {segments.data?.length > 0 && (
          <Select
            className="lg:w-44"
            placeholder="Any segment"
            options={segments.data}
            value={filters.segment}
            onChange={(e) => update({ segment: e.target.value })}
          />
        )}
        <Select
          className="lg:w-40"
          placeholder="Any status"
          options={["active", "inactive", "blocked"]}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
        />
      </FilterBar>

      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No customers", description: "Add a customer or adjust your filters." }}
        onRowClick={(c) => navigate(`/crm/customers/${c.id}`)}
        columns={[
          {
            key: "name",
            header: "Customer",
            primary: true,
            render: (c) => (
              <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">{c.displayName}</p>
                <p className="truncate text-xs text-ink-500">{c.customerId}</p>
              </div>
            ),
          },
          { key: "type", header: "Type", render: (c) => (c.type === "business" ? "Business" : "Individual") },
          {
            key: "segment",
            header: "Segment",
            secondary: true,
            render: (c) => (c.segment ? <Badge tone={c.segment === "Service Provider" ? "blue" : "slate"}>{c.segment}</Badge> : "—"),
          },
          { key: "phone", header: "Phone", render: (c) => c.primaryPhone || "—" },
          { key: "email", header: "Email", secondary: true, render: (c) => c.primaryEmail || "—" },
          {
            key: "orders",
            header: "Orders",
            align: "right",
            hideOnMobile: true,
            render: (c) => c.stats?.orders ?? 0,
          },
          { key: "added", header: "Added", render: (c) => fromNow(c.createdAt) },
          { key: "status", header: "Status", render: (c) => <Badge status={c.status} /> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />

      {creating && (
        <CustomerForm
          onClose={() => setCreating(false)}
          onSaved={(c) => {
            setCreating(false);
            navigate(`/crm/customers/${c.id}`);
          }}
        />
      )}
    </>
  );
}
