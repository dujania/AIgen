import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import { ArrowUpRight, Check, ClipboardCopy, FileText, RefreshCw, Send, Sparkles } from "lucide-react";
import type { Job } from "../lib/types";
import { buildCoverLetter, resumeHasContent } from "../lib/resume";
import { useWorkspace } from "../lib/store";
import { copyText } from "../lib/utils";
import { Badge, Modal } from "./ui";

export default function ApplyDialog({
  job,
  open,
  onClose,
}: {
  job: Job;
  open: boolean;
  onClose: () => void;
}) {
  const { resume, applyToJob, getApplication, toast, track } = useWorkspace();
  const existing = getApplication(job.id);
  const [letter, setLetter] = useState("");
  const [done, setDone] = useState(false);
  const ready = resumeHasContent(resume) && Boolean(resume.fullName.trim() && resume.email.trim());

  useEffect(() => {
    if (!open) return;
    setDone(false);
    setLetter(existing?.coverLetter || buildCoverLetter(resume, job));
    track("apply_start", { jobId: job.id, title: job.title });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job.id]);

  const submit = () => {
    applyToJob(job, letter);
    setDone(true);
    confetti({
      particleCount: 70,
      spread: 62,
      origin: { y: 0.72 },
      colors: ["#d8fb4f", "#121317", "#f4522d", "#2b4bf2"],
      disableForReducedMotion: true,
    });
    toast(`Application added to your tracker`, "success");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? "Application tracked" : `Apply — ${job.title}`}
      description={
        done
          ? "Nothing was sent anywhere. Your application is recorded on this device so you can follow up."
          : `${job.company} · ${job.location}. Write a letter, then keep a record of it.`
      }
      size="lg"
      footer={
        done ? (
          <>
            <button className="btn btn-outline" onClick={onClose}>
              Keep browsing
            </button>
            <Link to="/applications" className="btn btn-primary" onClick={onClose}>
              Open tracker <ArrowUpRight size={14} />
            </Link>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            {job.applyUrl && (
              <a
                className="btn btn-outline"
                href={job.applyUrl}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => track("apply_submit", { jobId: job.id, external: true })}
              >
                Employer site <ArrowUpRight size={14} />
              </a>
            )}
            <button className="btn btn-primary" onClick={submit} disabled={!letter.trim()}>
              <Send size={14} />
              {existing ? "Update application" : "Add to tracker"}
            </button>
          </>
        )
      }
    >
      {done ? (
        <div className="py-2">
          <div className="flex items-center gap-3 rounded-xl border border-[#c5e9d5] bg-[#eef9f2] px-4 py-3">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[#157f4a] text-white">
              <Check size={17} />
            </span>
            <div>
              <p className="text-[13.5px] font-medium">Saved as “Applied” in your tracker</p>
              <p className="text-[12px] text-[var(--color-muted)]">
                {job.applyUrl
                  ? "Remember to submit on the employer's site too — we can't do that part for you."
                  : "This demo listing has no external form, so your tracker entry is the record."}
              </p>
            </div>
          </div>
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-3 flex items-center justify-between rounded-xl border border-[var(--color-line)] px-4 py-3 text-[13px] hover:border-[var(--color-line-strong)]"
            >
              <span>Open the original posting</span>
              <ArrowUpRight size={15} />
            </a>
          )}
          <p className="mt-4 text-[12px] leading-relaxed text-[var(--color-muted)]">
            Next: set a follow-up reminder in the tracker so this doesn't go quiet for three weeks.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {!ready && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[#f3dfba] bg-[#fdf8ee] px-3.5 py-3 text-[12.5px]">
              <FileText size={15} className="mt-0.5 flex-none text-[#92500a]" />
              <div>
                <p className="font-medium text-[#7a4508]">Your résumé is missing a name or email</p>
                <p className="mt-0.5 text-[#8a6a3a]">
                  Recruiters need both.{" "}
                  <Link to="/resume" className="link-underline" onClick={onClose}>
                    Finish your résumé
                  </Link>{" "}
                  first — you can still save this application now.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12.5px]">
              <Sparkles size={14} className="text-[var(--color-blue)]" />
              <span className="font-medium">Cover letter</span>
              <Badge tone="neutral">Generated from your résumé</Badge>
            </div>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setLetter(buildCoverLetter(resume, job))}
              >
                <RefreshCw size={13} />
                Regenerate
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  const ok = await copyText(letter);
                  toast(ok ? "Cover letter copied" : "Couldn't copy — select the text manually", ok ? "success" : "error");
                }}
              >
                <ClipboardCopy size={13} />
                Copy
              </button>
            </div>
          </div>

          <textarea
            className="field scroll-thin"
            rows={14}
            value={letter}
            onChange={(event) => {
              setLetter(event.target.value);
              if (!existing) track("cover_letter", { jobId: job.id });
            }}
            aria-label="Cover letter"
          />

          <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-xl bg-[var(--color-paper)] px-3.5 py-3 text-[11.5px] text-[var(--color-muted)]">
            <span>
              <strong className="text-[var(--color-ink)]">{(letter.trim().split(/\s+/).filter(Boolean)).length}</strong> words
            </span>
            <span>Edit freely — it's only stored here</span>
            <span className="ml-auto">Tip: mention something specific about the team</span>
          </div>
        </div>
      )}
    </Modal>
  );
}
