import { useState } from "react";
import Drawer from "../ui/Drawer.jsx";
import Button from "../ui/Button.jsx";
import Badge from "../ui/Badge.jsx";
import Alert from "../ui/Alert.jsx";
import Textarea from "../ui/Textarea.jsx";
import Spinner from "../ui/Spinner.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { dateShort, dateTime, days as fmtDays } from "../../utils/format.js";

export default function LeaveRequestDetail({ id, onClose, onChanged }) {
  const { data, loading, error, refetch } = useApiQuery(`/hrm/leave/requests/${id}`);
  const can = useAuth((s) => s.can);
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");
  const [override, setOverride] = useState(false);

  const managerAct = useMutation((client, body) =>
    client.post(`/hrm/leave/requests/${id}/manager-decision`, body),
  );
  const hrAct = useMutation((client, body) => client.post(`/hrm/leave/requests/${id}/hr-decision`, body));
  const noteAct = useMutation((client, body) => client.post(`/hrm/leave/requests/${id}/note`, body));
  const cancelAct = useMutation((client) => client.post(`/hrm/leave/requests/${id}/cancel`));

  const r = data;
  const coverageError =
    hrAct.error?.code === "COVERAGE_FLOOR" ? hrAct.error.details : null;

  async function decide(kind, action) {
    const body = { action, comment: comment || undefined };
    if (kind === "hr" && action === "approve" && override) body.coverageOverride = true;
    try {
      await (kind === "manager" ? managerAct : hrAct).mutate(body);
      toast.success(`Request ${action === "approve" ? "approved" : action === "reject" ? "rejected" : "sent back"}`);
      setComment("");
      setOverride(false);
      refetch();
      onChanged?.();
    } catch (e) {
      if (e.code !== "COVERAGE_FLOOR") toast.error(e.message);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    try {
      await noteAct.mutate({ note });
      setNote("");
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function cancel() {
    try {
      await cancelAct.mutate();
      toast.success("Request cancelled");
      refetch();
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const canManager = r && r.status === "Pending" && can("leave:approve_manager");
  const canHr = r && r.status === "Manager Approved" && can("leave:approve_hr");
  const canCancel = r && ["Pending", "Manager Approved", "Clarification Requested", "Approved"].includes(r.status);

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      title={r ? `${r.reference} · ${r.leaveType?.name}` : "Leave request"}
      description={r ? `${r.employee?.firstName} ${r.employee?.lastName} · ${r.employee?.employeeId}` : ""}
    >
      {loading && (
        <div className="flex justify-center py-10 text-ink-400">
          <Spinner size={22} />
        </div>
      )}
      {error && <Alert tone="error">{error.message}</Alert>}

      {r && (
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge status={r.status}>{r.status}</Badge>
            {!r.leaveType?.paid && <Badge tone="slate">Unpaid</Badge>}
            {r.coverageOverride && <Badge tone="amber">Coverage override</Badge>}
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Dates" value={`${dateShort(r.startDate)} – ${dateShort(r.endDate)}`} />
            <Detail label="Chargeable" value={fmtDays(r.days)} />
            <Detail label="Branch" value={r.branch?.name || "—"} />
            <Detail label="Department" value={r.department?.name || "—"} />
            <Detail label="Line manager" value={r.lineManager ? `${r.lineManager.firstName} ${r.lineManager.lastName}` : "—"} />
            <Detail label="Submitted" value={dateTime(r.submittedAt)} />
            {r.contactWhileAway && <Detail label="Contact while away" value={r.contactWhileAway} />}
            {r.supportingDocumentUrl && (
              <Detail
                label="Document"
                value={
                  <a href={r.supportingDocumentUrl} target="_blank" rel="noreferrer" className="link">
                    View
                  </a>
                }
              />
            )}
          </dl>

          <div>
            <p className="label">Reason</p>
            <p className="text-sm text-ink-700">{r.reason}</p>
          </div>

          {r.balanceSnapshot && (
            <div className="rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-sm">
              <p className="font-medium text-ink-900">{r.leaveType?.name} balance ({r.year})</p>
              <p className="mt-0.5 text-ink-600">
                {r.balanceSnapshot.availableDays} available · {r.balanceSnapshot.usedDays} used ·{" "}
                {r.balanceSnapshot.pendingDays} pending
              </p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="mb-2 text-sm font-medium text-ink-900">Timeline</p>
            <ol className="space-y-2 border-l border-ink-200 pl-4">
              <li className="text-sm">
                <span className="text-ink-800">Submitted</span>
                <span className="ml-2 text-xs text-ink-400">{dateTime(r.submittedAt)}</span>
              </li>
              {r.decisions?.map((d, i) => (
                <li key={i} className="text-sm">
                  <span className="text-ink-800">
                    {d.stage === "manager" ? "Line manager" : "HR"} — {d.action}
                  </span>
                  {d.byName && <span className="ml-2 text-xs text-ink-500">{d.byName}</span>}
                  <span className="ml-2 text-xs text-ink-400">{dateTime(d.at)}</span>
                  {d.comment && <p className="text-xs text-ink-600">“{d.comment}”</p>}
                </li>
              ))}
            </ol>
          </div>

          {/* Internal notes */}
          {(r.notes?.length > 0 || can("leave:approve_manager") || can("leave:approve_hr")) && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink-900">Internal notes</p>
              <ul className="space-y-1.5">
                {r.notes?.map((n) => (
                  <li key={n._id || n.at} className="rounded-md bg-ink-50 px-2.5 py-1.5 text-sm">
                    <span className="text-ink-700">{n.note}</span>
                    <span className="ml-2 text-2xs text-ink-400">
                      {n.byName} · {dateTime(n.at)}
                    </span>
                  </li>
                ))}
              </ul>
              {(can("leave:approve_manager") || can("leave:approve_hr")) && (
                <div className="mt-2 flex gap-2">
                  <input
                    className="input"
                    placeholder="Add an internal note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button variant="secondary" loading={noteAct.loading} onClick={addNote}>
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Decision panel */}
          {(canManager || canHr) && (
            <div className="rounded-md border border-ink-200 p-3">
              <p className="mb-2 text-sm font-medium text-ink-900">
                {canManager ? "Line manager decision" : "HR confirmation"}
              </p>

              {coverageError && (
                <Alert tone="warning" className="mb-2">
                  {coverageError.message} Tick “override” to approve anyway.
                </Alert>
              )}
              {canHr && (
                <label className="mb-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                  Override branch-coverage floor
                </label>
              )}

              <Textarea
                rows={2}
                placeholder="Comment (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mb-2"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  loading={managerAct.loading || hrAct.loading}
                  onClick={() => decide(canManager ? "manager" : "hr", "approve")}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => decide(canManager ? "manager" : "hr", "clarification")}
                >
                  Request clarification
                </Button>
                <Button
                  variant="danger"
                  onClick={() => decide(canManager ? "manager" : "hr", "reject")}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}

          {canCancel && (
            <div className="border-t border-ink-200 pt-3">
              <Button variant="secondary" loading={cancelAct.loading} onClick={cancel}>
                Cancel request
              </Button>
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value}</dd>
    </div>
  );
}
