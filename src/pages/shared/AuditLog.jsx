import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import FilterBar, { SearchInput } from "../../components/ui/FilterBar.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useDebouncedValue } from "../../hooks/useDebouncedValue.js";
import { dateTime } from "../../utils/format.js";

export default function AuditLog() {
  const facets = useApiQuery("/audit/facets");
  const [filters, setFilters] = useState({ search: "", action: "", entityType: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const search = useDebouncedValue(filters.search);

  const params = useMemo(
    () => ({
      page,
      limit: 40,
      search: search || undefined,
      action: filters.action || undefined,
      entityType: filters.entityType || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }),
    [page, search, filters.action, filters.entityType, filters.from, filters.to],
  );
  const list = useApiQuery("/audit", { params });
  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <>
      <PageHeader title="Audit Log" description="Immutable record of significant actions. Read-only." />

      <FilterBar
        active={filters.search || filters.action || filters.entityType || filters.from || filters.to}
        onClear={() => update({ search: "", action: "", entityType: "", from: "", to: "" })}
      >
        <SearchInput value={filters.search} onChange={(v) => update({ search: v })} placeholder="Summary, actor, action" />
        <Select
          className="lg:w-40"
          placeholder="All modules"
          options={(facets.data?.modules || []).map((m) => ({ value: m, label: m }))}
          value={filters.action}
          onChange={(e) => update({ action: e.target.value })}
        />
        <Select
          className="lg:w-40"
          placeholder="All entities"
          options={(facets.data?.entityTypes || []).map((e) => ({ value: e, label: e }))}
          value={filters.entityType}
          onChange={(e) => update({ entityType: e.target.value })}
        />
        <TextField type="date" className="lg:w-40" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
        <TextField type="date" className="lg:w-40" value={filters.to} onChange={(e) => update({ to: e.target.value })} />
      </FilterBar>

      {list.loading && !list.data ? (
        <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState title="No entries" description="No audit entries match these filters." />
      ) : (
        <div className="card divide-y divide-ink-100">
          {list.data.map((e) => (
            <div key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-ink-900">
                  <span className="font-medium">{e.actorName || "System"}</span>
                  {e.actorRole ? <span className="text-ink-400"> · {e.actorRole}</span> : null}
                </p>
                <p className="text-sm text-ink-700">{e.summary || e.action}</p>
                <p className="mt-0.5 text-2xs uppercase tracking-wide text-ink-400">
                  {e.action}
                  {e.entityLabel ? ` · ${e.entityLabel}` : ""}
                  {e.ip ? ` · ${e.ip}` : ""}
                </p>
                {e.changes && (
                  <ul className="mt-1 space-y-0.5 text-2xs text-ink-500">
                    {Object.entries(e.changes).map(([k, v]) => (
                      <li key={k}>
                        {k}: <span className="text-ink-400">{JSON.stringify(v.from)}</span> → {JSON.stringify(v.to)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <span className="shrink-0 text-xs text-ink-400">{dateTime(e.createdAt)}</span>
            </div>
          ))}
          <div className="px-4 py-2.5">
            <Pagination meta={list.meta} onPage={setPage} />
          </div>
        </div>
      )}
    </>
  );
}
