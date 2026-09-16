import clsx from "clsx";
import Spinner from "./Spinner.jsx";
import EmptyState from "./EmptyState.jsx";

/**
 * One table component used across the whole app.
 *
 * columns: [{
 *   key, header,
 *   render?(row) -> node,          // defaults to row[key]
 *   align?: "left" | "right",
 *   primary?: boolean,             // shown as the card title on mobile
 *   secondary?: boolean,           // shown under the title on mobile
 *   hideOnMobile?: boolean,        // omit from the mobile card entirely
 *   width?: string,                // e.g. "min-w-[12rem]"
 * }]
 *
 * Desktop (>= md): a real table inside a horizontal-scroll container so wide
 * tables never break the page. Mobile (< md): a stacked card per row.
 */
export default function DataTable({
  columns,
  rows,
  keyField = "id",
  loading = false,
  error = null,
  onRetry,
  empty = { title: "Nothing to show", description: "No records match the current filters." },
  onRowClick,
  rowActions,
  footer,
}) {
  if (loading && (!rows || rows.length === 0)) {
    return (
      <div className="card flex items-center justify-center py-16 text-ink-400">
        <Spinner size={22} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <EmptyState
          title="Could not load data"
          description={error.message || "Something went wrong. Try again."}
          action={
            onRetry && (
              <button type="button" className="btn-secondary" onClick={onRetry}>
                Retry
              </button>
            )
          }
        />
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="card">
        <EmptyState title={empty.title} description={empty.description} action={empty.action} />
      </div>
    );
  }

  const primary = columns.find((c) => c.primary) || columns[0];
  const secondary = columns.find((c) => c.secondary);
  const rest = columns.filter((c) => c !== primary && c !== secondary && !c.hideOnMobile);

  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50 text-left text-2xs uppercase tracking-wide text-ink-500">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    "whitespace-nowrap px-4 py-2.5 font-medium",
                    col.align === "right" && "text-right",
                    col.width,
                  )}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && <th className="w-0 px-4 py-2.5" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={clsx(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-ink-50",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      "px-4 py-2.5 align-middle text-ink-800",
                      col.align === "right" && "text-right",
                      col.nowrap !== false && "whitespace-nowrap",
                    )}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? "—"}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-ink-100 md:hidden">
        {rows.map((row) => (
          <li key={row[keyField]} className="p-4">
            <div
              className={onRowClick ? "cursor-pointer" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink-900">
                    {primary.render ? primary.render(row) : row[primary.key]}
                  </div>
                  {secondary && (
                    <div className="mt-0.5 truncate text-xs text-ink-500">
                      {secondary.render ? secondary.render(row) : row[secondary.key]}
                    </div>
                  )}
                </div>
                {rowActions && (
                  <div onClick={(e) => e.stopPropagation()}>{rowActions(row)}</div>
                )}
              </div>
              {rest.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {rest.map((col) => (
                    <div key={col.key} className="min-w-0">
                      <dt className="text-2xs uppercase tracking-wide text-ink-400">{col.header}</dt>
                      <dd className="truncate text-xs text-ink-800">
                        {col.render ? col.render(row) : row[col.key] ?? "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>

      {footer && <div className="border-t border-ink-200 px-4 py-2.5">{footer}</div>}
    </div>
  );
}
