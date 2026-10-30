import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BellRing,
  Bookmark,
  CalendarPlus,
  Check,
  ClipboardCopy,
  Clock,
  FileText,
  GripVertical,
  Send,
  SquareKanban,
  Table2,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { SAMPLE_JOBS } from "../data/jobs";
import { getCachedLiveJob } from "../lib/liveJobs";
import { useWorkspace } from "../lib/store";
import type { Application, ApplicationStatus } from "../lib/types";
import {
  cn,
  copyText,
  formatDate,
  formatRelative,
  initials,
  relativeFuture,
} from "../lib/utils";
import { Badge, EmptyState, Modal, PageHeader, Segmented } from "../components/ui";

const COLUMNS: { id: ApplicationStatus; label: string; tone: "neutral" | "blue" | "amber" | "green" | "coral" }[] = [
  { id: "saved", label: "Shortlisted", tone: "neutral" },
  { id: "applied", label: "Applied", tone: "blue" },
  { id: "interview", label: "Interviewing", tone: "amber" },
  { id: "offer", label: "Offer", tone: "green" },
  { id: "rejected", label: "Closed", tone: "coral" },
];

export default function ApplicationsPage() {
  const { applications, savedJobs, resume, moveApplication, updateApplication, removeApplication, toast, track } = useWorkspace();
  const [view, setView] = useState<"board" | "list">("board");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ApplicationStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = applications.find((a) => a.id === selectedId) ?? null;

  const stats = useMemo(() => {
    const applied = applications.filter((a) => a.status !== "saved");
    const interviews = applications.filter((a) => a.status === "interview").length;
    const offers = applications.filter((a) => a.status === "offer").length;
    const closed = applications.filter((a) => a.status === "rejected").length;
    const responded = interviews + offers + closed;
    return {
      total: applications.length,
      applied: applied.length,
      interviews,
      offers,
      responseRate: applied.length ? Math.round((responded / applied.length) * 100) : 0,
    };
  }, [applications]);

  const followUps = applications
    .filter((a) => a.followUpAt && a.status !== "rejected" && a.status !== "offer")
    .sort((a, b) => new Date(a.followUpAt!).getTime() - new Date(b.followUpAt!).getTime())
    .slice(0, 4);

  const shortlist = useMemo(
    () =>
      savedJobs
        .filter((id) => !applications.some((a) => a.job.id === id))
        .map((id) => SAMPLE_JOBS.find((j) => j.id === id) ?? getCachedLiveJob(id))
        .filter(Boolean)
        .slice(0, 8),
    [savedJobs, applications]
  );

  const handleDrop = (status: ApplicationStatus) => {
    if (!dragId) return;
    const application = applications.find((a) => a.id === dragId);
    if (application && application.status !== status) {
      moveApplication(dragId, status);
      track("status_change", { status });
      toast(`Moved to ${COLUMNS.find((c) => c.id === status)?.label}`, "success");
    }
    setDragId(null);
    setOverColumn(null);
  };

  return (
    <div className="animate-rise">
      <PageHeader
        index="03"
        eyebrow="Track"
        title={
          <>
            Every application, <span className="serif-italic">remembered.</span>
          </>
        }
        description="A quiet pipeline for your job hunt: drag a card as things move, set a follow-up so nothing goes silent, keep notes in one place."
        actions={
          <>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                {
                  value: "board",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <SquareKanban size={13} /> Board
                    </span>
                  ),
                },
                {
                  value: "list",
                  label: (
                    <span className="inline-flex items-center gap-1.5">
                      <Table2 size={13} /> List
                    </span>
                  ),
                },
              ]}
            />
            <Link to="/jobs" className="btn btn-primary">
              <Send size={14} /> Find roles
            </Link>
          </>
        }
      />

      {/* stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Tracked", value: stats.total, icon: <SquareKanban size={14} />, note: `${stats.applied} submitted` },
          { label: "Interviewing", value: stats.interviews, icon: <TrendingUp size={14} />, note: "active conversations" },
          { label: "Offers", value: stats.offers, icon: <Trophy size={14} />, note: stats.offers ? "congratulations" : "still working" },
          { label: "Response rate", value: `${stats.responseRate}%`, icon: <Check size={14} />, note: "heard back at all" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between text-[var(--color-muted)]">
              <span className="mono text-[10px] uppercase tracking-wider">{stat.label}</span>
              {stat.icon}
            </div>
            <p className="stat-value mt-2">{stat.value}</p>
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">{stat.note}</p>
          </div>
        ))}
      </div>

      {/* follow ups */}
      {followUps.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
          <div className="flex items-center justify-between">
            <p className="eyebrow flex items-center gap-1.5">
              <BellRing size={12} /> Follow-ups
            </p>
            <span className="text-[11px] text-[var(--color-muted)]">{followUps.length} scheduled</span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {followUps.map((application) => {
              const overdue = new Date(application.followUpAt!).getTime() < Date.now();
              return (
                <button
                  key={application.id}
                  onClick={() => setSelectedId(application.id)}
                  className="flex items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]/60 px-3 py-2 text-left transition-colors hover:border-[var(--color-line-strong)]"
                >
                  <span
                    className="grid h-8 w-8 flex-none place-items-center rounded-lg text-[12px] font-semibold text-white"
                    style={{ background: application.job.color }}
                  >
                    {application.job.logo}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium">{application.job.company}</span>
                    <span
                      className={cn(
                        "mono block text-[10.5px]",
                        overdue ? "text-[var(--color-coral)]" : "text-[var(--color-muted)]"
                      )}
                    >
                      {relativeFuture(application.followUpAt!)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {applications.length === 0 && shortlist.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<SquareKanban size={20} />}
            title="No applications yet"
            description="Save a role to shortlist it, then apply. Your board fills up as you go — and it stays on this device."
            action={
              <Link to="/jobs" className="btn btn-primary">
                Browse open roles
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {shortlist.length > 0 && (
            <section className="mt-6">
              <div className="mb-2.5 flex items-end justify-between">
                <div>
                  <h2 className="text-[16px] font-semibold tracking-tight">Shortlist</h2>
                  <p className="text-[12px] text-[var(--color-muted)]">
                    Saved roles without an application yet.
                  </p>
                </div>
                <Link to="/jobs?saved=1" className="text-[12px] link-underline">
                  Manage saved
                </Link>
              </div>
              <div className="flex gap-2.5 overflow-x-auto pb-2 scroll-thin">
                {shortlist.map((job) =>
                  job ? (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}`}
                      className="flex w-[260px] flex-none items-center gap-2.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 transition-colors hover:border-[var(--color-line-strong)]"
                    >
                      <span
                        className="grid h-9 w-9 flex-none place-items-center rounded-lg text-[13px] font-semibold text-white"
                        style={{ background: job.color }}
                      >
                        {job.logo}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">{job.title}</span>
                        <span className="block truncate text-[11px] text-[var(--color-muted)]">{job.company}</span>
                      </span>
                      <Bookmark size={13} className="flex-none text-[var(--color-muted)]" />
                    </Link>
                  ) : null
                )}
              </div>
            </section>
          )}

          {applications.length === 0 ? null : view === "board" ? (
            <div className="mt-6">
              <div className="kanban">
                {COLUMNS.filter(
                  (column) => column.id !== "saved" || applications.some((a) => a.status === "saved")
                ).map((column) => {
                  const items = applications.filter((a) => a.status === column.id);
                  return (
                    <div
                      key={column.id}
                      className="kcol"
                      data-over={overColumn === column.id || undefined}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setOverColumn(column.id);
                      }}
                      onDragLeave={() => setOverColumn((prev) => (prev === column.id ? null : prev))}
                      onDrop={() => handleDrop(column.id)}
                    >
                      <div className="mb-2.5 flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12.5px] font-medium">{column.label}</span>
                          <Badge tone={column.tone}>{items.length}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {items.map((application) => (
                          <ApplicationCard
                            key={application.id}
                            application={application}
                            dragging={dragId === application.id}
                            onDragStart={() => setDragId(application.id)}
                            onDragEnd={() => {
                              setDragId(null);
                              setOverColumn(null);
                            }}
                            onOpen={() => setSelectedId(application.id)}
                          />
                        ))}
                        {items.length === 0 && (
                          <div className="rounded-lg border border-dashed border-[var(--color-line-strong)] px-3 py-6 text-center text-[11px] text-[var(--color-muted)]">
                            Drop a card here
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                Drag cards between columns, or open one to change its status.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--color-line)] bg-[var(--color-paper)]/60">
                    {["Role", "Company", "Status", "Applied", "Follow-up", ""].map((heading) => (
                      <th
                        key={heading}
                        className="mono px-3 py-2.5 text-[10px] font-normal uppercase tracking-wider text-[var(--color-muted)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr
                      key={application.id}
                      className="cursor-pointer border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-paper)]/50"
                      onClick={() => setSelectedId(application.id)}
                    >
                      <td className="px-3 py-2.5 text-[12.5px] font-medium">{application.job.title}</td>
                      <td className="px-3 py-2.5 text-[12.5px] text-[var(--color-ink-soft)]">{application.job.company}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={COLUMNS.find((c) => c.id === application.status)?.tone ?? "neutral"}>
                          {COLUMNS.find((c) => c.id === application.status)?.label}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-[var(--color-muted)]">
                        {application.appliedAt ? formatDate(application.appliedAt) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-[var(--color-muted)]">
                        {application.followUpAt ? relativeFuture(application.followUpAt) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <ArrowUpRight size={13} className="inline text-[var(--color-muted)]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <ApplicationDialog
        key={selectedId ?? "none"}
        application={selected}
        resumeName={resume.fullName}
        onClose={() => setSelectedId(null)}
        onUpdate={updateApplication}
        onStatus={moveApplication}
        onDelete={(id) => {
          removeApplication(id);
          setSelectedId(null);
          toast("Application removed", "info");
        }}
        onToast={toast}
      />
    </div>
  );
}

function ApplicationCard({
  application,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  application: Application;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  const overdue =
    application.followUpAt && new Date(application.followUpAt).getTime() < Date.now();
  return (
    <div
      className="kcard"
      draggable
      data-dragging={dragging || undefined}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${application.job.title} at ${application.job.company}`}
    >
      <div className="flex items-start gap-2">
        <span
          className="grid h-7 w-7 flex-none place-items-center rounded-md text-[11px] font-semibold text-white"
          style={{ background: application.job.color }}
        >
          {application.job.logo || initials(application.job.company)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium leading-tight">{application.job.title}</p>
          <p className="truncate text-[11px] text-[var(--color-muted)]">{application.job.company}</p>
        </div>
        <GripVertical size={13} className="flex-none text-[var(--color-line-strong)]" />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10.5px]">
        {application.appliedAt && (
          <span className="inline-flex items-center gap-1 text-[var(--color-muted)]">
            <Send size={9} /> {formatDate(application.appliedAt)}
          </span>
        )}
        {application.followUpAt && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
              overdue ? "bg-[#ffeee9] text-[#b3351a]" : "bg-[var(--color-paper-2)] text-[var(--color-ink-soft)]"
            )}
          >
            <Clock size={9} /> {relativeFuture(application.followUpAt)}
          </span>
        )}
        {application.notes.trim() && <FileText size={10} className="text-[var(--color-muted)]" />}
      </div>
    </div>
  );
}

function ApplicationDialog({
  application,
  resumeName,
  onClose,
  onUpdate,
  onStatus,
  onDelete,
  onToast,
}: {
  application: Application | null;
  resumeName: string;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Application>) => void;
  onStatus: (id: string, status: ApplicationStatus) => void;
  onDelete: (id: string) => void;
  onToast: (message: string, tone?: "success" | "info" | "error") => void;
}) {
  const [notes, setNotes] = useState(application?.notes ?? "");
  const [followUp, setFollowUp] = useState(
    application?.followUpAt ? application.followUpAt.slice(0, 10) : ""
  );

  if (!application) return null;
  const status = COLUMNS.find((c) => c.id === application.status);

  return (
    <Modal
      open={Boolean(application)}
      onClose={onClose}
      size="lg"
      title={application.job.title}
      description={`${application.job.company} · ${application.job.location}`}
      footer={
        <>
          <button
            className="btn btn-danger mr-auto"
            onClick={() => {
              if (confirm("Remove this application? This can't be undone.")) onDelete(application.id);
            }}
          >
            <Trash2 size={14} /> Remove
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onUpdate(application.id, {
                notes,
                followUpAt: followUp ? new Date(`${followUp}T09:00:00`).toISOString() : undefined,
              });
              onToast("Application updated", "success");
              onClose();
            }}
          >
            Save changes
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={status?.tone ?? "neutral"}>{status?.label}</Badge>
          <span className="text-[11.5px] text-[var(--color-muted)]">
            Added {formatRelative(application.createdAt)}
            {application.appliedAt ? ` · applied ${formatDate(application.appliedAt)}` : ""}
          </span>
          <Link
            to={`/jobs/${application.job.id}`}
            className="ml-auto inline-flex items-center gap-1 text-[12px] link-underline"
            onClick={onClose}
          >
            View role <ArrowUpRight size={12} />
          </Link>
        </div>

        <div>
          <p className="field-label">Move to</p>
          <div className="flex flex-wrap gap-1.5">
            {COLUMNS.map((column) => (
              <button
                key={column.id}
                className="chip"
                data-active={application.status === column.id}
                onClick={() => {
                  if (application.status !== column.id) {
                    onStatus(application.id, column.id);
                  }
                }}
              >
                {column.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="follow-up">
              <span className="inline-flex items-center gap-1.5">
                <CalendarPlus size={12} /> Follow-up date
              </span>
            </label>
            <input
              id="follow-up"
              type="date"
              className="field"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">
              Surfaces at the top of this page when it's due.
            </p>
          </div>
          <div>
            <p className="field-label">Résumé used</p>
            <div className="flex h-[38px] items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-[12.5px]">
              <FileText size={13} /> {resumeName || "Your résumé"}
            </div>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="field"
            rows={4}
            value={notes}
            placeholder="Recruiter name, interview format, salary discussed, next step…"
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {application.coverLetter.trim() && (
          <details className="rounded-xl border border-[var(--color-line)]">
            <summary className="flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-[12.5px] font-medium">
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} /> Cover letter
              </span>
              <span
                className="inline-flex items-center gap-1 text-[11px] text-[var(--color-muted)]"
                onClick={async (event) => {
                  event.preventDefault();
                  const ok = await copyText(application.coverLetter);
                  onToast(ok ? "Cover letter copied" : "Couldn't copy", ok ? "success" : "error");
                }}
                role="button"
                tabIndex={0}
              >
                <ClipboardCopy size={11} /> Copy
              </span>
            </summary>
            <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap px-3.5 pb-3.5 font-sans text-[12px] leading-relaxed text-[var(--color-ink-soft)] scroll-thin">
              {application.coverLetter}
            </pre>
          </details>
        )}

        <div>
          <p className="field-label">Timeline</p>
          <ol className="space-y-2">
            {[...application.timeline].reverse().map((event) => (
              <li key={event.id} className="flex gap-2.5">
                <span className="timeline-dot" />
                <span className="text-[12px]">
                  {event.label}
                  <span className="ml-2 text-[11px] text-[var(--color-muted)]">{formatDate(event.at)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Modal>
  );
}
