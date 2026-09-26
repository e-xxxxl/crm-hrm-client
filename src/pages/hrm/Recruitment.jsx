import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader.jsx";
import Tabs from "../../components/ui/Tabs.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Pagination from "../../components/ui/Pagination.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Button from "../../components/ui/Button.jsx";
import Modal from "../../components/ui/Modal.jsx";
import Drawer from "../../components/ui/Drawer.jsx";
import Select from "../../components/ui/Select.jsx";
import TextField from "../../components/ui/TextField.jsx";
import Textarea from "../../components/ui/Textarea.jsx";
import Alert from "../../components/ui/Alert.jsx";
import Spinner from "../../components/ui/Spinner.jsx";
import EmptyState from "../../components/ui/EmptyState.jsx";
import { useApiQuery } from "../../hooks/useApiQuery.js";
import { useMutation, fieldErrors } from "../../hooks/useMutation.js";
import { useAuth } from "../../store/auth.js";
import { toast } from "../../store/toast.js";
import { recruitment as api } from "../../services/hrm.js";
import { EMPLOYMENT_TYPES } from "../../utils/constants.js";
import { dateShort, fromNow, money } from "../../utils/format.js";

const STAGES = ["Applied", "Screening", "Interview", "Assessment", "Offer", "Accepted", "Rejected"];

export default function Recruitment() {
  const [tab, setTab] = useState("jobs");
  return (
    <>
      <PageHeader title="Recruitment" />
      <Tabs tabs={[{ key: "jobs", label: "Job openings" }, { key: "applicants", label: "All applicants" }]} active={tab} onChange={setTab} />
      {tab === "jobs" && <Jobs />}
      {tab === "applicants" && <AllApplicants />}
    </>
  );
}

function Jobs() {
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const list = useApiQuery("/hrm/recruitment/jobs", { params: { page, limit: 20 } });

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-900">Job openings</h2>
        {can("recruitment:write") && <Button onClick={() => setCreating(true)}>New job</Button>}
      </div>
      <DataTable
        loading={list.loading}
        error={list.error}
        onRetry={list.refetch}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No job openings", description: "Post a role to start receiving applicants." }}
        onRowClick={(j) => navigate(`/hrm/recruitment/jobs/${j.id}`)}
        columns={[
          { key: "title", header: "Title", primary: true, render: (j) => j.title },
          { key: "ref", header: "Ref", render: (j) => j.reference },
          { key: "department", header: "Department", render: (j) => j.department?.name || "—" },
          { key: "type", header: "Type", secondary: true, render: (j) => j.employmentType },
          { key: "openings", header: "Openings", align: "right", render: (j) => j.openings },
          { key: "applicants", header: "Applicants", align: "right", render: (j) => `${j.activeApplicants}/${j.applicantCount}` },
          { key: "status", header: "Status", render: (j) => <Badge status={j.status}>{j.status}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />
      {creating && <JobForm onClose={() => setCreating(false)} onSaved={(j) => { setCreating(false); navigate(`/hrm/recruitment/jobs/${j.id}`); }} />}
    </>
  );
}

function JobForm({ value, onClose, onSaved }) {
  const isNew = !value;
  const departments = useApiQuery("/hrm/departments", { params: { limit: 100, status: "active" } });
  const branches = useApiQuery("/hrm/branches", { params: { limit: 100, status: "active" } });
  const [form, setForm] = useState({
    title: value?.title || "",
    department: value?.department?.id || value?.department || "",
    branch: value?.branch?.id || value?.branch || "",
    employmentType: value?.employmentType || "Full-time",
    description: value?.description || "",
    responsibilities: value?.responsibilities || "",
    requirements: value?.requirements || "",
    salaryMin: value?.salaryMin || "",
    salaryMax: value?.salaryMax || "",
    openings: value?.openings || 1,
    closingDate: value?.closingDate ? value.closingDate.slice(0, 10) : "",
    status: value?.status || "draft",
  });
  const { mutate, loading, error } = useMutation((client, body) =>
    isNew ? client.post("/hrm/recruitment/jobs", body) : client.patch(`/hrm/recruitment/jobs/${value.id}`, body),
  );
  const errs = fieldErrors(error);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const body = { ...form };
    ["department", "branch", "closingDate"].forEach((k) => !body[k] && delete body[k]);
    body.salaryMin = body.salaryMin ? Number(body.salaryMin) : undefined;
    body.salaryMax = body.salaryMax ? Number(body.salaryMax) : undefined;
    body.openings = Number(body.openings) || 1;
    try {
      const job = await mutate(body);
      toast.success(isNew ? "Job posting created" : "Job posting updated");
      onSaved(job);
    } catch {
      /* inline */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isNew ? "New job posting" : `Edit ${value.title}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button form="job-form" type="submit" loading={loading}>{isNew ? "Create" : "Save"}</Button>
        </>
      }
    >
      <form id="job-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Title" required value={form.title} error={errs.title} onChange={set("title")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Department" placeholder="—" options={(departments.data || []).map((d) => ({ value: d.id, label: d.name }))} value={form.department} onChange={set("department")} />
          <Select label="Branch" placeholder="—" options={(branches.data || []).map((b) => ({ value: b.id, label: b.name }))} value={form.branch} onChange={set("branch")} />
          <Select label="Employment type" options={EMPLOYMENT_TYPES} value={form.employmentType} onChange={set("employmentType")} />
          <TextField label="Openings" type="number" min="1" value={form.openings} onChange={set("openings")} />
          <TextField label="Salary min" type="number" value={form.salaryMin} onChange={set("salaryMin")} />
          <TextField label="Salary max" type="number" value={form.salaryMax} onChange={set("salaryMax")} />
          <TextField label="Closing date" type="date" value={form.closingDate} onChange={set("closingDate")} />
          <Select label="Status" options={["draft", "open", "closed", "filled", "cancelled"]} value={form.status} onChange={set("status")} />
        </div>
        <Textarea label="Description" rows={3} value={form.description} onChange={set("description")} />
        <Textarea label="Responsibilities" rows={3} value={form.responsibilities} onChange={set("responsibilities")} />
        <Textarea label="Requirements" rows={3} value={form.requirements} onChange={set("requirements")} />
      </form>
    </Modal>
  );
}

function AllApplicants() {
  const [page, setPage] = useState(1);
  const [stage, setStage] = useState("");
  const [detailId, setDetailId] = useState(null);
  const list = useApiQuery("/hrm/recruitment/applicants", { params: { page, limit: 25, stage: stage || undefined } });

  return (
    <>
      <div className="mb-4">
        <Select className="lg:w-48" placeholder="Any stage" options={STAGES} value={stage} onChange={(e) => { setStage(e.target.value); setPage(1); }} />
      </div>
      <DataTable
        loading={list.loading}
        error={list.error}
        rows={list.data || []}
        keyField="id"
        empty={{ title: "No applicants", description: "Applicants appear here as they apply to open roles." }}
        onRowClick={(a) => setDetailId(a.id)}
        columns={[
          { key: "name", header: "Applicant", primary: true, render: (a) => a.name },
          { key: "job", header: "Role", secondary: true, render: (a) => a.jobPosting?.title || "—" },
          { key: "email", header: "Email", render: (a) => a.email },
          { key: "applied", header: "Applied", render: (a) => fromNow(a.appliedAt) },
          { key: "stage", header: "Stage", render: (a) => <Badge status={a.stage}>{a.stage}</Badge> },
        ]}
        footer={<Pagination meta={list.meta} onPage={setPage} />}
      />
      {detailId && <ApplicantDetail id={detailId} onClose={() => setDetailId(null)} onChanged={() => list.refetch()} />}
    </>
  );
}

export function JobPipelinePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const can = useAuth((s) => s.can);
  const session = useAuth((s) => s.session);
  const canDelete = ["Super Admin", "Group Admin", "HR Manager"].includes(session?.role);
  const { data, loading, error, refetch } = useApiQuery(`/hrm/recruitment/jobs/${id}/pipeline`);
  const [detailId, setDetailId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);

  const move = useMutation((client, { applicantId, toStage }) =>
    client.post(`/hrm/recruitment/applicants/${applicantId}/stage`, { stage: toStage }),
  );
  const removeM = useMutation((client) => client.delete(`/hrm/recruitment/jobs/${id}`));

  async function handleDeleteJob() {
    if (!confirm(`Delete job posting "${job.title}"? This only works if it has no applicants.`)) return;
    try {
      await removeM.mutate();
      toast.success("Job posting deleted");
      navigate("/hrm/recruitment");
    } catch (e) {
      toast.error(e.message);
    }
  }

  if (loading) return <div className="flex justify-center py-16 text-ink-400"><Spinner size={22} /></div>;
  if (error) return <EmptyState title="Job not found" description={error.message} action={<Button variant="secondary" onClick={() => navigate("/hrm/recruitment")}>Back</Button>} />;

  const { job, columns } = data;

  async function moveTo(applicantId, toStage) {
    try {
      await move.mutate({ applicantId, toStage });
      refetch();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-3">{job.title}<Badge status={job.status}>{job.status}</Badge></span>}
        description={`${job.reference} · ${job.employmentType}${job.department?.name ? ` · ${job.department.name}` : ""} · ${job.openings} opening(s)`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/hrm/recruitment")}>Back</Button>
            {can("recruitment:write") && <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>}
            {canDelete && <Button variant="danger" loading={removeM.loading} onClick={handleDeleteJob}>Delete</Button>}
            {can("recruitment:write") && <Button onClick={() => setAdding(true)}>Add applicant</Button>}
          </>
        }
      />

      <div className="flex gap-3 overflow-x-auto pb-2">
        {STAGES.map((s) => (
          <div key={s} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-medium uppercase tracking-wide text-ink-500">{s}</span>
              <span className="text-xs text-ink-400">{columns[s]?.length || 0}</span>
            </div>
            <div className="space-y-2">
              {(columns[s] || []).map((a) => (
                <div key={a.id} className="card cursor-pointer p-2.5 hover:border-brand-600" onClick={() => setDetailId(a.id)}>
                  <p className="text-sm font-medium text-ink-900">{a.name}</p>
                  <p className="truncate text-xs text-ink-500">{a.email}</p>
                  {a.rating && <p className="mt-1 text-2xs text-ink-400">Rating {a.rating}/5</p>}
                  {can("recruitment:move_stage") && !["Accepted", "Rejected"].includes(a.stage) && (
                    <div className="mt-1.5 flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                      {nextStages(a.stage).map((ns) => (
                        <button
                          key={ns}
                          type="button"
                          className="rounded border border-ink-200 px-1.5 py-0.5 text-2xs text-ink-600 hover:bg-ink-50"
                          onClick={() => moveTo(a.id, ns)}
                        >
                          → {ns}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(columns[s] || []).length === 0 && <p className="px-1 text-2xs text-ink-300">Empty</p>}
            </div>
          </div>
        ))}
      </div>

      {detailId && <ApplicantDetail id={detailId} onClose={() => setDetailId(null)} onChanged={refetch} />}
      {adding && <AddApplicant jobId={id} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); refetch(); }} />}
      {editing && <JobForm value={job} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); refetch(); }} />}
    </>
  );
}

function nextStages(stage) {
  const flow = { Applied: ["Screening", "Rejected"], Screening: ["Interview", "Rejected"], Interview: ["Assessment", "Offer", "Rejected"], Assessment: ["Offer", "Rejected"], Offer: ["Accepted", "Rejected"] };
  return flow[stage] || [];
}

function AddApplicant({ jobId, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", source: "direct", resumeUrl: "", coverLetter: "" });
  const { mutate, loading, error } = useMutation((client, body) => client.post("/hrm/recruitment/applicants", body));
  const errs = fieldErrors(error);
  async function submit(e) {
    e.preventDefault();
    try {
      await mutate({ jobPosting: jobId, ...form, phone: form.phone || undefined, resumeUrl: form.resumeUrl || undefined, coverLetter: form.coverLetter || undefined });
      toast.success("Applicant added");
      onSaved();
    } catch {
      /* inline */
    }
  }
  return (
    <Modal open onClose={onClose} title="Add applicant" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button form="app-form" type="submit" loading={loading}>Add</Button></>}>
      <form id="app-form" onSubmit={submit} className="space-y-4">
        {error && !error.details && <Alert tone="error">{error.message}</Alert>}
        <TextField label="Full name" required value={form.name} error={errs.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Email" type="email" required value={form.email} error={errs.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <TextField label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </div>
        <TextField label="Resume URL" value={form.resumeUrl} onChange={(e) => setForm((f) => ({ ...f, resumeUrl: e.target.value }))} />
        <Textarea label="Cover letter" rows={3} value={form.coverLetter} onChange={(e) => setForm((f) => ({ ...f, coverLetter: e.target.value }))} />
      </form>
    </Modal>
  );
}

function ApplicantDetail({ id, onClose, onChanged }) {
  const { data: a, loading, error, refetch } = useApiQuery(`/hrm/recruitment/applicants/${id}`);
  const can = useAuth((s) => s.can);
  const session = useAuth((s) => s.session);
  const canDelete = ["Super Admin", "Group Admin", "HR Manager"].includes(session?.role);
  const [note, setNote] = useState("");
  const [interview, setInterview] = useState({ scheduledFor: "", mode: "video", location: "" });
  const noteM = useMutation((client, body) => client.post(`/hrm/recruitment/applicants/${id}/note`, body));
  const stageM = useMutation((client, body) => client.post(`/hrm/recruitment/applicants/${id}/stage`, body));
  const interviewM = useMutation((client, body) => client.post(`/hrm/recruitment/applicants/${id}/interviews`, body));
  const convertM = useMutation((client, body) => client.post(`/hrm/recruitment/applicants/${id}/convert`, body));
  const removeM = useMutation((client) => client.delete(`/hrm/recruitment/applicants/${id}`));

  if (loading) return <Drawer open onClose={onClose} title="Applicant"><div className="flex justify-center py-10 text-ink-400"><Spinner size={22} /></div></Drawer>;
  if (error) return <Drawer open onClose={onClose} title="Applicant"><Alert tone="error">{error.message}</Alert></Drawer>;

  async function handleDeleteApplicant() {
    if (!confirm(`Delete applicant "${a.name}"?`)) return;
    try {
      await removeM.mutate();
      toast.success("Applicant deleted");
      onChanged?.();
      onClose();
    } catch (e) {
      toast.error(e.message);
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      size="lg"
      title={a.name}
      description={a.jobPosting?.title}
      footer={
        canDelete &&
        !a.convertedToEmployee && (
          <Button variant="danger" loading={removeM.loading} onClick={handleDeleteApplicant}>
            Delete applicant
          </Button>
        )
      }
    >
      <div className="space-y-5 text-sm">
        <div className="flex items-center gap-2">
          <Badge status={a.stage}>{a.stage}</Badge>
          {a.convertedToEmployee && <Badge tone="green">Hired</Badge>}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <D label="Email" v={a.email} />
          <D label="Phone" v={a.phone || "—"} />
          <D label="Source" v={a.source} />
          <D label="Applied" v={dateShort(a.appliedAt)} />
          {a.expectedSalary ? <D label="Expected salary" v={money(a.expectedSalary)} /> : null}
          {a.resumeUrl ? <D label="Resume" v={<a href={a.resumeUrl.startsWith("http") ? a.resumeUrl : `/api${a.resumeUrl}`} target="_blank" rel="noreferrer" className="link">Open</a>} /> : null}
        </dl>

        {a.coverLetter && (
          <div>
            <p className="label">Cover letter</p>
            <p className="whitespace-pre-wrap text-ink-700">{a.coverLetter}</p>
          </div>
        )}

        {can("recruitment:move_stage") && !a.convertedToEmployee && (
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => (
              <button
                key={s}
                type="button"
                className={`rounded border px-2 py-1 text-xs ${a.stage === s ? "border-brand-600 bg-brand-600/10 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50"}`}
                onClick={async () => {
                  try {
                    await stageM.mutate({ stage: s });
                    refetch();
                    onChanged?.();
                  } catch (e) {
                    toast.error(e.message);
                  }
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {a.stage === "Accepted" && !a.convertedToEmployee && can("recruitment:write") && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <p className="mb-2 text-sm font-medium text-emerald-800">Convert to employee</p>
            <Button
              loading={convertM.loading}
              onClick={async () => {
                try {
                  const emp = await convertM.mutate({ provisionLogin: { role: "Staff" } });
                  toast.success(`Employee ${emp.employeeId} created`);
                  refetch();
                  onChanged?.();
                } catch (e) {
                  toast.error(e.message);
                }
              }}
            >
              Create employee record
            </Button>
          </div>
        )}

        {/* Interviews */}
        <div>
          <p className="mb-2 text-sm font-medium text-ink-900">Interviews</p>
          {(a.interviews || []).length === 0 && <p className="text-ink-500">None scheduled.</p>}
          <ul className="space-y-1.5">
            {(a.interviews || []).map((iv, i) => (
              <li key={i} className="rounded-md border border-ink-200 px-2.5 py-1.5">
                <div className="flex justify-between">
                  <span className="text-ink-800">{dateShort(iv.scheduledFor)} · {iv.mode}</span>
                  <Badge tone={iv.outcome === "pass" ? "green" : iv.outcome === "fail" ? "red" : "neutral"}>{iv.outcome}</Badge>
                </div>
                {iv.feedback && <p className="mt-0.5 text-xs text-ink-600">{iv.feedback}</p>}
              </li>
            ))}
          </ul>
          {can("recruitment:write") && (
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input type="datetime-local" className="input sm:w-52" value={interview.scheduledFor} onChange={(e) => setInterview((s) => ({ ...s, scheduledFor: e.target.value }))} />
              <select className="input sm:w-28" value={interview.mode} onChange={(e) => setInterview((s) => ({ ...s, mode: e.target.value }))}>
                <option value="video">Video</option>
                <option value="phone">Phone</option>
                <option value="onsite">Onsite</option>
              </select>
              <Button
                variant="secondary"
                loading={interviewM.loading}
                onClick={async () => {
                  if (!interview.scheduledFor) return;
                  try {
                    await interviewM.mutate({ scheduledFor: interview.scheduledFor, mode: interview.mode });
                    setInterview({ scheduledFor: "", mode: "video", location: "" });
                    refetch();
                  } catch (e) {
                    toast.error(e.message);
                  }
                }}
              >
                Schedule
              </Button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <p className="mb-2 text-sm font-medium text-ink-900">Notes</p>
          <ul className="space-y-1.5">
            {(a.notes || []).map((n) => (
              <li key={n._id || n.at} className="rounded-md bg-ink-50 px-2.5 py-1.5">
                <span className="text-ink-700">{n.note}</span>
                <span className="ml-2 text-2xs text-ink-400">{n.byName} · {fromNow(n.at)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <input className="input" placeholder="Add a note" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
              variant="secondary"
              loading={noteM.loading}
              onClick={async () => {
                if (!note.trim()) return;
                await noteM.mutate({ note });
                setNote("");
                refetch();
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function D({ label, v }) {
  return (
    <div>
      <dt className="text-2xs uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{v}</dd>
    </div>
  );
}
