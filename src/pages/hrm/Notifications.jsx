import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import Button from "../../components/ui/Button.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { notifications as api } from "../../services/hrm.js";
import { toast } from "../../store/toast.js";
import { fromNow } from "../../utils/format.js";

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all"); // all | unread
  const [page, setPage] = useState(1);

  const params = useMemo(
    () => ({ page, limit: 25, unread: filter === "unread" ? "true" : undefined }),
    [page, filter],
  );
  const list = useApiQuery("/hrm/notifications", { params });

  async function open(n) {
    if (!n.read) {
      try {
        await api.markRead(n.id);
      } catch {
        /* ignore */
      }
    }
    if (n.link) navigate(n.link);
    else list.refetch();
  }

  async function markAll() {
    try {
      await api.markAllRead();
      toast.success("All notifications marked as read");
      list.refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          (list.unread ?? 0) > 0 && (
            <Button variant="secondary" onClick={markAll}>
              Mark all read
            </Button>
          )
        }
      />

      <div className="mb-4 flex gap-1 border-b border-ink-200">
        {[
          ["all", "All"],
          ["unread", `Unread${list.unread ? ` (${list.unread})` : ""}`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              setPage(1);
            }}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              filter === key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {list.loading ? (
        <div className="flex justify-center py-16 text-ink-400">
          <Spinner size={22} />
        </div>
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState
          title={filter === "unread" ? "Nothing unread" : "No notifications"}
          description="Notifications about leave, contracts, payroll and reviews will appear here."
        />
      ) : (
        <div className="card divide-y divide-ink-100">
          {list.data.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => open(n)}
              className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink-50 ${
                n.read ? "" : "bg-brand-600/[0.04]"
              }`}
            >
              <span
                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  n.read ? "bg-transparent" : "bg-brand-600"
                }`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink-900">{n.title}</span>
                {n.body && <span className="mt-0.5 block text-sm text-ink-600">{n.body}</span>}
                <span className="mt-0.5 block text-2xs uppercase tracking-wide text-ink-400">
                  {n.type} · {fromNow(n.createdAt)}
                </span>
              </span>
            </button>
          ))}
          <div className="px-4 py-2.5">
            <Pagination meta={list.meta} onPage={setPage} />
          </div>
        </div>
      )}
    </>
  );
}
