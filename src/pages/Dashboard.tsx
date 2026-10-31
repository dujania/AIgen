import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Briefcase,
  Check,
  ClipboardCopy,
  FileText,
  Fingerprint,
  Search,
  Sparkles,
  SquareKanban,
  Wand2,
} from "lucide-react";
import { SAMPLE_JOBS } from "../data/jobs";
import { atsChecks, atsScore, matchJob, resumeHasContent, starterResume } from "../lib/resume";
import { accountAgeDays, telemetryEnabled } from "../lib/track";
import { useWorkspace } from "../lib/store";
import { cn, copyText, formatRelative, pluralize } from "../lib/utils";
import type { TrackEvent } from "../lib/types";
import JobCard from "../components/JobCard";
import { Field, Modal, Ring } from "../components/ui";

const ONBOARDED_KEY = "openrole.onboarded.v1";

export default function Dashboard() {
  const navigate = useNavigate();
  const { resume, applications, savedJobs, events, identity, updateResume, loadExample, toast } = useWorkspace();
  const [query, setQuery] = useState("");
  const [onboardOpen, setOnboardOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [level, setLevel] = useState<"student" | "early" | "mid" | "senior">("early");

  const score = useMemo(() => atsScore(atsChecks(resume)), [resume]);
  const hasResume = resumeHasContent(resume);
  const interviewing = applications.filter((a) => a.status === "interview");
  const offers = applications.filter((a) => a.status === "offer");
  const followUps = applications.filter(
    (a) => a.followUpAt && new Date(a.followUpAt).getTime() < Date.now() + 3 * 86400000 && a.status !== "rejected"
  );

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDED_KEY);
    if (!seen && !hasResume) setOnboardOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recommended = useMemo(
    () =>
      SAMPLE_JOBS.filter((job) => !applications.some((a) => a.job.id === job.id))
        .map((job) => ({ job, match: matchJob(resume, job).score }))
        .sort((a, b) => b.match - a.match || a.job.postedDaysAgo - b.job.postedDaysAgo)
        .slice(0, 3),
    [applications, resume]
  );

  const recent = [...events]
    .filter((e) => e.name !== "page_view")
    .slice(-6)
    .reverse();

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate(`/jobs?q=${encodeURIComponent(query.trim())}`);
  };

  const finishOnboarding = (mode: "start" | "example" | "browse") => {
    localStorage.setItem(ONBOARDED_KEY, new Date().toISOString());
    if (mode === "example") loadExample();
    if (mode === "start") {
      updateResume(starterResume({ name: name.trim(), role: role.trim(), level }));
      toast("Workspace ready — your résumé is started", "success");
    }
    setOnboardOpen(false);
  };

  const copyId = async () => {
    const ok = await copyText(identity.visitorId);
    toast(ok ? "Anonymous workspace ID copied" : "Couldn't copy", ok ? "success" : "error");
  };

  return (
    <div className="animate-rise">
      {/* hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="rule-grid absolute inset-0 opacity-70" aria-hidden />
        <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.15fr_0.85fr] lg:p-11">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-lime">Free, always</span>
              <span className="badge badge-neutral">No signup</span>
              <span className="badge badge-neutral">No login</span>
            </div>

            <h1 className="display mt-5 text-[42px] leading-[0.96] sm:text-[58px] lg:text-[64px]">
              The job hunt,
              <br />
              <span className="serif-italic">minus the homework.</span>
            </h1>

            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
              Search curated roles, build an ATS-friendly résumé, and track every application.
              It all lives in your browser — no account, no email drip, no “upgrade to apply”.
            </p>

            <form onSubmit={submitSearch} className="mt-6 max-w-lg">
              <div className="search-shell">
                <Search size={18} className="flex-none text-[var(--color-muted)]" />
                <input
                  className="search-input"
                  placeholder="Role, skill or company…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search roles"
                />
                <button className="btn btn-primary btn-sm flex-none" type="submit">
                  Search
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-[var(--color-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-[var(--color-green)]" /> {SAMPLE_JOBS.length} curated roles
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-[var(--color-green)]" /> Live remote feed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-[var(--color-green)]" /> PDF export
              </span>
            </div>
          </div>

          {/* workspace card */}
          <div className="relative">
            <div className="rounded-2xl bg-[var(--color-ink)] p-5 text-[var(--color-paper)] shadow-xl">
              <div className="flex items-center justify-between">
                <p className="mono text-[10px] uppercase tracking-[0.18em] text-[#a9a8a1]">
                  Your workspace
                </p>
                <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[10px]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-lime)]" />
                  local only
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Ring value={hasResume ? score : 0} size={62} color="#d8fb4f" />
                <div>
                  <p className="text-[14px] font-medium">
                    {hasResume ? resume.fullName || "Unnamed résumé" : "No résumé yet"}
                  </p>
                  <p className="text-[11.5px] text-[#a9a8a1]">
                    {hasResume
                      ? `ATS readiness ${score}% · ${resume.skills.length} skills`
                      : "Two minutes to a first draft"}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: "Saved", value: savedJobs.length, icon: Bookmark },
                  { label: "Applied", value: applications.filter((a) => a.status !== "saved").length, icon: Briefcase },
                  { label: "Interviews", value: interviewing.length, icon: SquareKanban },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-white/[0.06] px-3 py-2.5">
                    <stat.icon size={13} className="text-[#a9a8a1]" />
                    <p className="mt-1.5 text-[20px] leading-none">{stat.value}</p>
                    <p className="mt-1 text-[10px] text-[#a9a8a1]">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-white/10 pt-3.5">
                <p className="flex items-center gap-1.5 text-[11px] text-[#a9a8a1]">
                  <Fingerprint size={12} /> Anonymous ID
                  <button
                    onClick={copyId}
                    className="ml-auto inline-flex items-center gap-1 rounded border border-white/15 px-1.5 py-0.5 text-[10px] hover:bg-white/10"
                  >
                    <ClipboardCopy size={10} /> copy
                  </button>
                </p>
                <p className="mono mt-1.5 truncate text-[10.5px] text-[#d9d7cf]">{identity.visitorId}</p>
                <p className="mt-2 text-[10.5px] leading-relaxed text-[#8f8e88]">
                  {identity.visits > 1
                    ? `${identity.visits} visits over ${accountAgeDays(identity) + 1} days · ${identity.device} · ${identity.timezone}`
                    : `First visit · ${identity.device} · ${identity.timezone}`}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5 text-[11px] leading-relaxed text-[var(--color-muted)]">
              <Sparkles size={13} className="mt-0.5 flex-none text-[var(--color-ink)]" />
              <p>
                No cookies, no third-party scripts.{" "}
                <Link to="/insights" className="link-underline">
                  See exactly what's stored
                </Link>
                {telemetryEnabled() && " · optional first-party analytics is on"}.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* steps */}
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            to: "/jobs",
            icon: Search,
            index: "01",
            title: "Search",
            body: "Filter by mode, salary, seniority and skills. Your résumé drives the match score.",
            cta: "Browse roles",
          },
          {
            to: "/resume",
            icon: FileText,
            index: "02",
            title: "Craft",
            body: "A live A4 preview, three templates, and a checklist of what applicant systems look for.",
            cta: hasResume ? "Open builder" : "Start résumé",
          },
          {
            to: "/applications",
            icon: SquareKanban,
            index: "03",
            title: "Track",
            body: "Drag applications through your pipeline, keep notes, and set follow-up reminders.",
            cta: applications.length ? "Open tracker" : "See the board",
          },
        ].map((step) => (
          <Link
            key={step.title}
            to={step.to}
            className="group card card-hover flex flex-col p-5 no-underline"
          >
            <div className="flex items-center justify-between">
              <span className="mono text-[10.5px] tracking-wider text-[var(--color-muted)]">
                {step.index}
              </span>
              <step.icon size={16} className="text-[var(--color-line-strong)] transition-colors group-hover:text-[var(--color-ink)]" />
            </div>
            <h3 className="mt-3 text-[16px] font-semibold">{step.title}</h3>
            <p className="mt-1 flex-1 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              {step.body}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium">
              {step.cta}
              <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>

      {/* resume nudge */}
      {!hasResume && (
        <section className="mt-4 flex flex-col items-start gap-4 rounded-2xl border border-[var(--color-ink)] bg-[var(--color-ink)] p-5 text-[var(--color-paper)] sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-[15px] font-medium">Your résumé is the only thing standing between you and a match score.</p>
            <p className="mt-1 text-[12.5px] text-[#b9b7af]">
              Start blank, or load a filled example and edit the parts that are true for you.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-accent" onClick={() => setOnboardOpen(true)}>
              <Wand2 size={14} /> Set it up
            </button>
            <Link to="/resume" className="btn btn-outline !border-white/25 !text-[var(--color-paper)] hover:!bg-white/10">
              Open builder
            </Link>
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        {/* recommended */}
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-[19px] font-semibold tracking-tight">
                {hasResume ? "Picked for your résumé" : "Worth a look"}
              </h2>
              <p className="text-[12.5px] text-[var(--color-muted)]">
                {hasResume
                  ? "Ranked by skill overlap with what you've written."
                  : "Add a résumé to see personalised match scores."}
              </p>
            </div>
            <Link to="/jobs" className="inline-flex items-center gap-1 text-[12.5px] link-underline">
              All roles <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {recommended.map(({ job }) => (
              <JobCard key={job.id} job={job} resume={resume} compact />
            ))}
          </div>
        </section>

        <div className="space-y-4">
          {/* pipeline */}
          <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Pipeline</h2>
              <Link to="/applications" className="text-[11.5px] link-underline">
                Open tracker
              </Link>
            </div>
            {applications.length === 0 ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                Nothing tracked yet. Save a role, then apply — we'll keep the record for you.
              </p>
            ) : (
              <>
                <div className="mt-3 space-y-2.5">
                  {[
                    ["Applied", applications.filter((a) => a.status === "applied").length, "#2b4bf2"],
                    ["Interviewing", interviewing.length, "#b45309"],
                    ["Offers", offers.length, "#157f4a"],
                    ["Closed", applications.filter((a) => a.status === "rejected").length, "#b3351a"],
                  ].map(([label, count, color]) => (
                    <div key={label as string} className="flex items-center gap-2.5">
                      <span className="w-20 text-[11.5px] text-[var(--color-muted)]">{label as string}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-paper-3)]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, ((count as number) / Math.max(1, applications.length)) * 100)}%`,
                            background: color as string,
                          }}
                        />
                      </div>
                      <span className="mono w-4 text-right text-[11px]">{count as number}</span>
                    </div>
                  ))}
                </div>
                {followUps.length > 0 && (
                  <Link
                    to="/applications"
                    className="mt-3 flex items-center gap-2 rounded-xl bg-[#fdf3e2] px-3 py-2 text-[11.5px] text-[#92500a]"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-[#f3dfba]">
                      <BellDot />
                    </span>
                    {pluralize(followUps.length, "follow-up")} due soon
                    <ArrowRight size={12} className="ml-auto" />
                  </Link>
                )}
              </>
            )}
          </section>

          {/* activity */}
          <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[15px] font-semibold">Recent activity</h2>
              <Link to="/insights" className="text-[11.5px] link-underline">
                Details
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-2 text-[12.5px] text-[var(--color-muted)]">
                Your actions appear here. Nothing is sent to a server.
              </p>
            ) : (
              <ol className="mt-3 space-y-2.5">
                {recent.map((event) => (
                  <li key={event.id} className="flex gap-2.5">
                    <span className="timeline-dot" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px]">{describeEvent(event)}</p>
                      <p className="text-[10.5px] text-[var(--color-muted)]">{formatRelative(event.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      {/* onboarding */}
      <Modal
        open={onboardOpen}
        onClose={() => finishOnboarding("browse")}
        title="Welcome — no account needed"
        description="Tell us enough to start a résumé. This stays in your browser and you can clear it any time."
        footer={
          <>
            <button className="btn btn-ghost mr-auto" onClick={() => finishOnboarding("browse")}>
              Just browse jobs
            </button>
            <button className="btn btn-outline" onClick={() => finishOnboarding("example")}>
              Use example
            </button>
            <button className="btn btn-primary" onClick={() => finishOnboarding("start")}>
              Start my workspace
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Your name">
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Mehta"
              autoFocus
            />
          </Field>
          <Field label="Target role">
            <input
              className="field"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="Frontend Engineer"
            />
          </Field>
        </div>
        <div className="mt-4">
          <p className="field-label">Where are you now?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { id: "student", label: "Student / final year", note: "Looking for a first internship" },
              { id: "early", label: "1–3 years", note: "Early career, building depth" },
              { id: "mid", label: "4–6 years", note: "Owning features end to end" },
              { id: "senior", label: "7+ years", note: "Leading teams and systems" },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setLevel(option.id as typeof level)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  level === option.id
                    ? "border-[var(--color-ink)] bg-[var(--color-paper-2)]"
                    : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                )}
              >
                <span className="block text-[12.5px] font-medium">{option.label}</span>
                <span className="mt-0.5 block text-[11px] text-[var(--color-muted)]">{option.note}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-[var(--color-muted)]">
          <Fingerprint size={13} className="mt-0.5 flex-none" />
          A random anonymous ID is created so this workspace can be recognised on your next visit.
          No email, no password, no name required.
        </p>
      </Modal>
    </div>
  );
}

function BellDot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-[#92500a]" />;
}

export function describeEvent(event: TrackEvent): string {
  const props = event.props ?? {};
  switch (event.name) {
    case "search":
      return props.query ? `Searched “${props.query}”` : "Searched open roles";
    case "job_view":
      return `Viewed ${props.title ?? "a role"}${props.company ? ` at ${props.company}` : ""}`;
    case "job_save":
      return props.saved ? `Saved ${props.jobTitle ?? "a role"}` : "Removed a saved role";
    case "apply_start":
      return `Started an application${props.title ? ` for ${props.title}` : ""}`;
    case "apply_submit":
      return props.role ? `Applied to ${props.role}` : "Recorded an application";
    case "status_change":
      return `Moved an application to ${props.status ?? "a new stage"}`;
    case "resume_edit":
      return "Updated the résumé";
    case "resume_export":
      return `Exported the résumé (${props.format ?? "file"})`;
    case "resume_share":
      return "Created a share link";
    case "cover_letter":
      return "Edited a cover letter";
    case "workspace_export":
      return "Exported a workspace backup code";
    case "workspace_import":
      return "Restored a workspace from a code";
    case "page_view":
      return `Visited ${props.path ?? "a page"}`;
    default:
      return event.name;
  }
}
