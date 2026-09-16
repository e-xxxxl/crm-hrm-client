import { useMemo, useState } from "react";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { fromNow, dateShort } from "../../utils/format.js";

const STATUS_TONE = { pending: "amber", published: "green", rejected: "red", flagged: "red" };

export default function ReviewQueue() {
  const canModerate = useAuth((s) => s.can("review:moderate"));
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);

  const params = useMemo(() => ({ page, limit: 20, status: tab === "all" ? undefined : tab }), [page, tab]);
  const list = useApiQuery("/crm/marketplace/reviews", { params });

  const moderate = useMutation((c, { id, decision, reason }) =>
    c.post(`/crm/marketplace/reviews/${id}/moderate`, { decision, reason }),
  );

  async function act(id, decision) {
    let reason;
    if (decision === "reject") {
      reason = window.prompt("Reason for rejecting this review?") || undefined;
      if (reason === undefined) return;
    }
    try {
      await moderate.mutate({ id, decision, reason });
      toast.success(`Review ${decision === "publish" ? "published" : decision === "reject" ? "rejected" : "flagged"}`);
      list.refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader title="Reviews" />

      <div className="mb-4 flex gap-1 border-b border-ink-200">
        {[
          ["pending", "Pending"],
          ["flagged", "Flagged"],
          ["published", "Published"],
          ["rejected", "Rejected"],
          ["all", "All"],
        ].map(([key, lbl]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {list.loading ? (
        <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>
      ) : !list.data || list.data.length === 0 ? (
        <EmptyState title="No reviews" description="Nothing in this queue." />
      ) : (
        <div className="space-y-3">
          {list.data.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-ink-900">
                    {"★".repeat(r.rating)}<span className="text-ink-300">{"★".repeat(5 - r.rating)}</span>
                    {r.title ? ` · ${r.title}` : ""}
                  </p>
                  <p className="text-xs text-ink-500">
                    {r.businessName} · {r.reviewerName} · {fromNow(r.createdAt)}
                    {r.jobDate ? ` · job ${dateShort(r.jobDate)}` : ""}
                  </p>
                </div>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-700">{r.body}</p>
              {r.moderation?.reason && <p className="mt-1 text-xs text-ink-500">Moderation note: {r.moderation.reason}</p>}
              {r.businessResponse?.body && (
                <p className="mt-2 rounded-md bg-ink-50 p-2 text-sm text-ink-700">
                  <span className="text-2xs uppercase tracking-wide text-ink-400">Business response</span>
                  <br />
                  {r.businessResponse.body}
                </p>
              )}
              {canModerate && r.status !== "published" && (
                <div className="mt-3 flex gap-2">
                  <Button onClick={() => act(r.id, "publish")}>Publish</Button>
                  <Button variant="secondary" onClick={() => act(r.id, "reject")}>Reject</Button>
                  {r.status !== "flagged" && <Button variant="secondary" onClick={() => act(r.id, "flag")}>Flag</Button>}
                </div>
              )}
              {canModerate && r.status === "published" && (
                <div className="mt-3">
                  <Button variant="secondary" onClick={() => act(r.id, "reject")}>Unpublish</Button>
                </div>
              )}
            </div>
          ))}
          <Pagination meta={list.meta} onPage={setPage} />
        </div>
      )}
    </>
  );
}
