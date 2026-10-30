import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Briefcase,
  CalendarClock,
  Check,
  CircleDashed,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { SAMPLE_JOBS, similarJobs } from "../data/jobs";
import { getCachedLiveJob } from "../lib/liveJobs";
import { keywordGaps, matchJob, resumeHasContent } from "../lib/resume";
import { LEVEL_LABEL, MODE_LABEL, TYPE_LABEL } from "../lib/search";
import { useWorkspace } from "../lib/store";
import { cn, postedLabel, salaryLabel } from "../lib/utils";
import ApplyDialog from "../components/ApplyDialog";
import JobCard from "../components/JobCard";
import { Badge, EmptyState, Ring } from "../components/ui";

export default function JobDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { resume, isSaved, toggleSave, getApplication, track, toast } = useWorkspace();
  const [applyOpen, setApplyOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const job = useMemo(
    () => SAMPLE_JOBS.find((entry) => entry.id === id) ?? getCachedLiveJob(id),
    [id]
  );

  useEffect(() => {
    if (job) track("job_view", { jobId: job.id, title: job.title, company: job.company });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

  if (!job) {
    return (
      <EmptyState
        icon={<Briefcase size={20} />}
        title="That role isn't here"
        description="It may have been a live listing that has since expired. Head back to search to keep looking."
        action={
          <Link to="/jobs" className="btn btn-primary">
            Back to jobs
          </Link>
        }
      />
    );
  }

  const match = matchJob(resume, job);
  const gaps = keywordGaps(resume, job);
  const application = getApplication(job.id);
  const saved = isSaved(job.id);
  const similar = similarJobs(job, 3);

  const shareJob = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/jobs/${job.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast("Link copied — send it to a friend", "success");
    } catch {
      toast("Couldn't copy the link", "error");
    }
  };

  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between gap-3">
        <button className="btn btn-ghost btn-sm -ml-2" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={shareJob}>
            {copied ? <Check size={14} /> : <ArrowUpRight size={14} />}
            {copied ? "Copied" : "Share"}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => toggleSave(job)}>
            <Bookmark size={14} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_330px]">
        <div className="min-w-0">
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 sm:p-7">
            <div className="flex flex-wrap items-start gap-4">
              <div className="company-tile h-14 w-14 text-[24px]" style={{ background: job.color }}>
                {job.logo}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[23px] font-semibold leading-tight tracking-[-0.02em] sm:text-[27px]">
                    {job.title}
                  </h1>
                  {job.source === "live" && <Badge tone="lime">Live</Badge>}
                </div>
                <p className="mt-1 text-[14px] text-[var(--color-ink-soft)]">
                  {job.company}
                  <span className="mx-1.5 text-[var(--color-line-strong)]">·</span>
                  <span className="text-[var(--color-muted)]">{job.location}</span>
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone="neutral">{MODE_LABEL[job.mode]}</Badge>
                  <Badge tone="neutral">{TYPE_LABEL[job.type]}</Badge>
                  <Badge tone="neutral">{LEVEL_LABEL[job.level]}</Badge>
                  <span className="badge badge-neutral">
                    <Wallet size={11} /> {salaryLabel(job)}
                  </span>
                  <span className="badge badge-neutral">
                    <CalendarClock size={11} /> {postedLabel(job.postedDaysAgo)}
                  </span>
                </div>
              </div>
              <div className="flex w-full gap-2 sm:w-auto sm:flex-col">
                <button className="btn btn-primary flex-1" onClick={() => setApplyOpen(true)}>
                  <Send size={15} />
                  Apply
                </button>
                {job.applyUrl && (
                  <a
                    className="btn btn-outline"
                    href={job.applyUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Employer site <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
            </div>

            {application && (
              <div className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#c5e9d5] bg-[#eef9f2] px-3.5 py-2.5 text-[12.5px] text-[#14663c]">
                <Check size={14} />
                You've tracked this application — status{" "}
                <strong className="capitalize">{application.status}</strong>.
                <Link to="/applications" className="ml-auto link-underline">
                  Open tracker
                </Link>
              </div>
            )}

            <div className="mt-6 space-y-6">
              <section>
                <h2 className="eyebrow mb-2">The role</h2>
                <p className="text-[14px] leading-[1.7] text-[var(--color-ink-soft)]">{job.description}</p>
              </section>

              {job.responsibilities.length > 0 && (
                <section>
                  <h2 className="eyebrow mb-2.5">What you'll do</h2>
                  <ul className="space-y-2">
                    {job.responsibilities.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">
                        <CircleDashed size={15} className="mt-0.5 flex-none text-[var(--color-line-strong)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {job.requirements.length > 0 && (
                <section>
                  <h2 className="eyebrow mb-2.5">What they're looking for</h2>
                  <ul className="space-y-2">
                    {job.requirements.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--color-ink-soft)]">
                        <Check size={15} className="mt-0.5 flex-none text-[var(--color-green)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {job.perks.length > 0 && (
                <section>
                  <h2 className="eyebrow mb-2.5">Details</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {job.perks.map((perk) => (
                      <span key={perk} className="badge badge-neutral">
                        {perk}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {job.skills.length > 0 && (
                <section>
                  <h2 className="eyebrow mb-2.5">Skills mentioned</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills.map((skill) => (
                      <span
                        key={skill}
                        className={cn(
                          "chip cursor-default",
                          match.matched.includes(skill) && "border-[#d8ef9c] bg-[#f0ffc0] text-[#4d5f06]"
                        )}
                      >
                        {match.matched.includes(skill) && <Check size={11} />}
                        {skill}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {job.companyBlurb && (
                <section className="rounded-xl bg-[var(--color-paper)] p-4">
                  <h2 className="eyebrow mb-1.5">About {job.company}</h2>
                  <p className="text-[13px] leading-relaxed text-[var(--color-ink-soft)]">{job.companyBlurb}</p>
                  {job.teamSize && (
                    <p className="mt-2 text-[11.5px] text-[var(--color-muted)]">Team size · {job.teamSize}</p>
                  )}
                </section>
              )}
            </div>
          </div>

          {similar.length > 0 && (
            <section className="mt-8">
              <div className="mb-3 flex items-end justify-between">
                <h2 className="text-[17px] font-semibold tracking-tight">Similar roles</h2>
                <Link to="/jobs" className="text-[12.5px] link-underline">
                  See all
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {similar.map((entry) => (
                  <JobCard key={entry.id} job={entry} resume={resume} compact />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between">
              <p className="eyebrow flex items-center gap-1.5">
                <Target size={12} /> Résumé match
              </p>
              {resumeHasContent(resume) ? (
                <Ring value={match.score} size={52} />
              ) : (
                <Badge tone="amber">No résumé yet</Badge>
              )}
            </div>

            {!resumeHasContent(resume) ? (
              <>
                <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--color-muted)]">
                  Build a résumé and we'll show how well it fits this role — and which skills to add.
                </p>
                <Link to={`/resume?job=${job.id}`} className="btn btn-accent btn-sm mt-3 w-full">
                  <Sparkles size={13} /> Build résumé
                </Link>
              </>
            ) : (
              <>
                <div className="mt-3">
                  <p className="mb-1.5 text-[11.5px] font-medium text-[var(--color-green)]">
                    On your résumé ({match.matched.length}/{job.skills.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {match.matched.slice(0, 8).map((skill) => (
                      <span key={skill} className="badge badge-green">
                        {skill}
                      </span>
                    ))}
                    {match.matched.length === 0 && (
                      <span className="text-[12px] text-[var(--color-muted)]">
                        None of the listed skills appear yet.
                      </span>
                    )}
                  </div>
                </div>
                {match.missing.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-[11.5px] font-medium text-[#92500a]">
                      Add these if you legitimately have them
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {match.missing.slice(0, 8).map((skill) => (
                        <span key={skill} className="badge badge-amber">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <Link to={`/resume?job=${job.id}`} className="btn btn-outline btn-sm mt-3 w-full">
                  Tailor my résumé
                </Link>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <p className="eyebrow mb-2.5">Role facts</p>
            <dl className="space-y-2.5 text-[12.5px]">
              {[
                ["Location", job.location, <MapPin size={13} key="i" />],
                ["Work mode", MODE_LABEL[job.mode], null],
                ["Salary", salaryLabel(job), <Wallet size={13} key="w" />],
                ["Experience", LEVEL_LABEL[job.level], null],
                ["Category", job.category, null],
                ["Posted", postedLabel(job.postedDaysAgo), null],
                ["Source", job.source === "live" ? "Remotive (live)" : "Curated by openrole", null],
              ].map(([label, value, icon]) => (
                <div key={label as string} className="flex items-start justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-[var(--color-muted)]">
                    {icon}
                    {label as string}
                  </dt>
                  <dd className="text-right font-medium">{value as string}</dd>
                </div>
              ))}
            </dl>
          </div>

          {resumeHasContent(resume) && gaps.length > 0 && (
            <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper-2)] p-4">
              <p className="eyebrow mb-1.5">Keywords this post uses</p>
              <p className="text-[11.5px] leading-relaxed text-[var(--color-muted)]">
                These words appear in the posting but not in your résumé. Use the ones that are true
                of you.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {gaps.map((word) => (
                  <span key={word} className="mono rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10.5px] text-[var(--color-ink-soft)]">
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 text-[11.5px] text-[var(--color-muted)]">
            <ShieldCheck size={16} className="mt-0.5 flex-none text-[var(--color-green)]" />
            <p>
              Applications stay on this device. No account, no email, nothing sent to us.{" "}
              <Link to="/insights" className="link-underline">
                How this works
              </Link>
            </p>
          </div>
        </aside>
      </div>

      <ApplyDialog job={job} open={applyOpen} onClose={() => setApplyOpen(false)} />
    </div>
  );
}
