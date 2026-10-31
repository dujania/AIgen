import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileWarning, ShieldCheck } from "lucide-react";
import type { Resume } from "../lib/types";
import { decodePayload } from "../lib/resume";
import { ResumePreview, PrintSheet } from "../components/ResumePreview";
import { EmptyState } from "../components/ui";

export default function Shared() {
  const { payload = "" } = useParams();
  const [resume, setResume] = useState<Resume | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    decodePayload<Resume>(payload)
      .then((data) => {
        if (cancelled) return;
        if (!data || typeof data !== "object") throw new Error("invalid");
        setResume(data);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  useEffect(() => {
    if (resume?.fullName) document.title = `${resume.fullName} — Résumé`;
    return () => {
      document.title = "openrole — free job search, résumé builder & application tracker";
    };
  }, [resume]);

  if (status === "error") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          icon={<FileWarning size={20} />}
          title="This résumé link is broken"
          description="The link may have been cut short by a chat app. Ask the sender to share the whole URL, or build your own résumé in about two minutes."
          action={
            <Link to="/resume" className="btn btn-primary">
              Build a résumé
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-paper-2)]">
      <header className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="logo-mark scale-90" aria-hidden />
            <span className="text-[15px] font-semibold tracking-[-0.03em]">
              openrole<span className="text-[var(--color-coral)]">.</span>
            </span>
          </Link>
          <span className="badge badge-neutral ml-1">Shared résumé</span>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-outline btn-sm" onClick={() => window.print()}>
              <Download size={13} /> PDF
            </button>
            <Link to="/resume" className="btn btn-primary btn-sm">
              Build yours
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-3 py-6 sm:px-6 sm:py-10">
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2.5 text-[11.5px] text-[var(--color-muted)]">
          <ShieldCheck size={14} className="mt-0.5 flex-none text-[var(--color-green)]" />
          <p>
            This page is <strong className="text-[var(--color-ink)]">read-only</strong> and
            rendered entirely from the link itself. Nothing is stored on a server, and the sender
            controls who has the URL.
          </p>
          <Link to="/" className="ml-auto hidden flex-none items-center gap-1 link-underline sm:inline-flex">
            <ArrowLeft size={11} /> Home
          </Link>
        </div>

        {status === "loading" ? (
          <div className="skeleton h-[640px] w-full rounded-xl" />
        ) : resume ? (
          <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 sm:p-6">
            <ResumePreview resume={resume} />
          </div>
        ) : null}

        <div className="mt-6 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 text-center">
          <p className="text-[14px] font-medium">Need a résumé like this?</p>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] leading-relaxed text-[var(--color-muted)]">
            openrole is free, has no signup, and keeps your details in your own browser. Build,
            check and export in one sitting.
          </p>
          <Link to="/resume" className="btn btn-accent mt-3">
            Start building — no account
          </Link>
        </div>
      </div>

      {resume && <PrintSheet resume={resume} />}
    </div>
  );
}
