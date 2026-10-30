import { Link } from "react-router-dom";
import { Bookmark, Building2, Clock, MapPin, Wallet } from "lucide-react";
import type { Job, Resume } from "../lib/types";
import { matchJob, resumeHasContent } from "../lib/resume";
import { MODE_LABEL, TYPE_LABEL } from "../lib/search";
import { cn, postedLabel, salaryLabel } from "../lib/utils";
import { useWorkspace } from "../lib/store";
import { Ring } from "./ui";

export default function JobCard({
  job,
  resume,
  compact = false,
}: {
  job: Job;
  resume: Resume;
  compact?: boolean;
}) {
  const { isSaved, toggleSave } = useWorkspace();
  const saved = isSaved(job.id);
  const match = matchJob(resume, job);
  const hasResume = resumeHasContent(resume);

  return (
    <article className="job-card" data-featured={job.featured || undefined}>
      <div className="flex gap-3.5">
        <div
          className="company-tile"
          style={{ background: job.color }}
          aria-hidden
        >
          {job.logo}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[15.5px] font-semibold leading-snug tracking-[-0.01em]">
                <Link
                  to={`/jobs/${job.id}`}
                  className="stretch-link transition-colors hover:text-[var(--color-blue)]"
                >
                  {job.title}
                </Link>
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[var(--color-muted)]">
                <span className="inline-flex items-center gap-1">
                  <Building2 size={12.5} />
                  {job.company}
                </span>
                <span className="text-[var(--color-line-strong)]">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12.5} />
                  {job.location}
                </span>
              </div>
            </div>

            <div className="card-action flex flex-none items-center gap-1.5">
              {hasResume && match.score > 0 && (
                <span title={`${match.score}% match with your résumé`}>
                  <Ring value={match.score} size={compact ? 40 : 46} />
                </span>
              )}
              <button
                type="button"
                onClick={() => toggleSave(job)}
                aria-label={saved ? `Remove ${job.title} from saved` : `Save ${job.title}`}
                aria-pressed={saved}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full border transition-colors",
                  saved
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-lime)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)]"
                )}
              >
                <Bookmark size={15} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="badge badge-neutral">{MODE_LABEL[job.mode]}</span>
            <span className="badge badge-neutral">{TYPE_LABEL[job.type]}</span>
            {job.source === "live" && <span className="badge badge-lime">Live</span>}
            {job.featured && !compact && <span className="badge badge-amber">Featured</span>}
            <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-muted)]">
              <Wallet size={12} />
              {salaryLabel(job)}
            </span>
          </div>

          {!compact && job.skills.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {job.skills.slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px]",
                    match.matched.includes(skill)
                      ? "bg-[#eef7d4] text-[#4d5f06]"
                      : "bg-[var(--color-paper-2)] text-[var(--color-ink-soft)]"
                  )}
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="rounded-md px-1.5 py-0.5 text-[11px] text-[var(--color-muted)]">
                  +{job.skills.length - 5}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-dashed border-[var(--color-line)] pt-2.5 text-[11.5px] text-[var(--color-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock size={12} />
          {postedLabel(job.postedDaysAgo)}
        </span>
        <span className="mono text-[10.5px] uppercase tracking-wider text-[var(--color-ink-soft)]">
          {hasResume && match.matched.length > 0
            ? `${match.matched.length}/${job.skills.length} skills matched`
            : job.category}
        </span>
      </div>
    </article>
  );
}
