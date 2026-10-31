import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BrainCircuit,
  Check,
  ClipboardCopy,
  Clock,
  Download,
  Eye,
  Fingerprint,
  Globe2,
  History,
  Laptop,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { useWorkspace } from "../lib/store";
import { accountAgeDays, resetIdentity, telemetryEnabled } from "../lib/track";
import { formatDate, formatRelative, download, copyText } from "../lib/utils";
import { describeEvent } from "./Dashboard";
import { Badge, EmptyState, Modal, PageHeader } from "../components/ui";

export default function InsightsPage() {
  const {
    identity,
    events,
    resume,
    applications,
    savedJobs,
    exportWorkspace,
    importWorkspace,
    clearEvents,
    resetWorkspace,
    toast,
  } = useWorkspace();

  const [code, setCode] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const counts = useMemo(() => {
    const count = (name: string) => events.filter((e) => e.name === name).length;
    return {
      pageViews: count("page_view"),
      searches: count("search"),
      jobViews: count("job_view"),
      saves: events.filter((e) => e.name === "job_save" && e.props?.saved).length,
      applyStarts: count("apply_start"),
      applies: count("apply_submit"),
      interviews: applications.filter((a) => a.status === "interview").length,
      offers: applications.filter((a) => a.status === "offer").length,
    };
  }, [events, applications]);

  const funnel = [
    { label: "Page views", value: counts.pageViews, color: "#121317" },
    { label: "Searches", value: counts.searches, color: "#2b4bf2" },
    { label: "Roles opened", value: counts.jobViews, color: "#0f766e" },
    { label: "Saved", value: counts.saves, color: "#b45309" },
    { label: "Applications", value: counts.applies, color: "#157f4a" },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  const copy = async (value: string, label: string) => {
    const ok = await copyText(value);
    toast(ok ? `${label} copied` : "Couldn't copy — select it manually", ok ? "success" : "error");
  };

  const makeCode = async () => {
    setBusy(true);
    try {
      const value = await exportWorkspace();
      setCode(value);
      setCodeOpen(true);
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    const result = await importWorkspace(importText);
    setBusy(false);
    if (result.ok) {
      setImportOpen(false);
      setImportText("");
    } else {
      toast(result.error ?? "Couldn't import that code", "error");
    }
  };

  const exportCsv = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [
      ["timestamp", "event", "details"],
      ...events.map((event) => [
        event.at,
        event.name,
        JSON.stringify(event.props ?? {}),
      ]),
    ];
    download(
      "openrole-activity.csv",
      rows.map((row) => row.map(escape).join(",")).join("\n"),
      "text/csv"
    );
    toast("Activity CSV downloaded", "success");
  };

  const eventRows = [...events].slice(-25).reverse();

  return (
    <div className="animate-rise">
      <PageHeader
        index="04"
        eyebrow="Your data"
        title={
          <>
            Tracked without <span className="serif-italic">an account.</span>
          </>
        }
        description="Most job boards make you sign up so they can follow you. We do the useful part — remembering your work — with a random device ID and a workspace that never leaves your browser. Here is all of it, in the open."
      />

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        {/* identity */}
        <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <Fingerprint size={12} /> Anonymous identity
              </p>
              <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
                Generated on your first visit. Not linked to a name, email or IP.
              </p>
            </div>
            <Badge tone="green">
              <ShieldCheck size={11} /> local
            </Badge>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--color-paper)] px-3 py-2.5">
            <code className="mono flex-1 truncate text-[12px]">{identity.visitorId}</code>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => copy(identity.visitorId, "Workspace ID")}
            >
              <ClipboardCopy size={12} /> Copy
            </button>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[12px]">
            {[
              ["First seen", formatDate(identity.firstSeen)],
              ["Last active", formatRelative(identity.lastSeen)],
              ["Visits", `${identity.visits}`],
              ["Days known", `${accountAgeDays(identity) + 1}`],
              ["First touch", identity.utm.utm_source ?? identity.referrer],
              ["Landing page", identity.landingPath],
              ["Device", `${identity.device} · ${identity.viewport}`],
              ["Timezone", `${identity.timezone} · ${identity.language}`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10.5px] uppercase tracking-wider text-[var(--color-muted)]">
                  {label}
                </dt>
                <dd className="mt-0.5 truncate font-medium" title={String(value)}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-[var(--color-line)] pt-4">
            {[
              { label: "Saved jobs", value: savedJobs.length },
              { label: "Applications", value: applications.length },
              { label: "Résumé fields", value: resume.skills.length + resume.experience.length },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="stat-value !text-[26px]">{stat.value}</p>
                <p className="text-[10.5px] text-[var(--color-muted)]">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* funnel */}
        <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <Activity size={12} /> Your funnel
              </p>
              <p className="mt-1.5 text-[12px] text-[var(--color-muted)]">
                Recorded on this device as you use the app.
              </p>
            </div>
            <Badge tone="neutral">{events.length} events</Badge>
          </div>

          <div className="mt-4 space-y-2.5">
            {funnel.map((stage) => (
              <div key={stage.label} className="flex items-center gap-2.5">
                <span className="w-24 text-[11.5px] text-[var(--color-muted)]">{stage.label}</span>
                <div className="h-5 flex-1 overflow-hidden rounded-md bg-[var(--color-paper-2)]">
                  <div
                    className="flex h-full items-center justify-end rounded-md px-1.5"
                    style={{
                      width: `${Math.max(6, (stage.value / funnelMax) * 100)}%`,
                      background: stage.color,
                    }}
                  >
                    <span className="mono text-[9.5px] text-white">{stage.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-[var(--color-paper)] p-3">
            <p className="text-[11.5px] leading-relaxed text-[var(--color-muted)]">
              <strong className="text-[var(--color-ink)]">Read on your own numbers:</strong>{" "}
              {counts.jobViews > 0 && counts.applies === 0
                ? "you're browsing but haven't applied yet. Tailor your résumé to one role and send one application today."
                : counts.applies > 0 && counts.interviews === 0
                  ? "applications are going out — set follow-up reminders at 7 and 14 days; most replies arrive after a nudge."
                  : counts.interviews > 0
                    ? "interviews are happening. Add notes after each one while the details are fresh."
                    : "once you view a few roles, this panel turns into a personal funnel."}
            </p>
          </div>
        </section>
      </div>

      {/* how tracking works */}
      <section className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
        <p className="eyebrow flex items-center gap-1.5">
          <BrainCircuit size={12} /> How this replaces signup
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Fingerprint,
              title: "One random ID",
              body: "A UUID in localStorage stands in for an account. It identifies a browser, not a person — clearing site data resets it.",
            },
            {
              icon: Clock,
              title: "Sessions & return visits",
              body: "A new session starts after 30 quiet minutes. That gives you visit counts and return-rate without cookies or fingerprints.",
            },
            {
              icon: Globe2,
              title: "First-touch source",
              body: "If you arrive with utm_* parameters or a referrer we keep that once, so you can see where your search started.",
            },
            {
              icon: History,
              title: "Your own funnel",
              body: "Search, saves and applications are logged locally to show what's working — not to build an ad profile.",
            },
            {
              icon: ArrowUpFromLine,
              title: "Portable workspace code",
              body: "Need another device? Export a compressed code and paste it there. Same data, no password, no email.",
            },
            {
              icon: Lock,
              title: "Zero third parties",
              body: "No analytics SDKs, no pixels, no CDN tracking. The only network call is optional live job data from Remotive.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-3">
              <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[var(--color-paper-2)]">
                <item.icon size={15} />
              </span>
              <div>
                <p className="text-[13px] font-medium">{item.title}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-3 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
          <Eye size={14} className="mt-0.5 flex-none" />
          <p>
            Optional first-party analytics is{" "}
            <strong className="text-[var(--color-ink)]">
              {telemetryEnabled() ? "enabled for this build" : "off in this build"}
            </strong>
            . It only ever receives the anonymous ID and the event names below, and only when{" "}
            <code className="mono rounded bg-[var(--color-surface)] px-1">VITE_TELEMETRY_URL</code>{" "}
            is configured.
          </p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        {/* event log */}
        <section className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-line)] px-5 py-3.5">
            <div>
              <p className="text-[14px] font-semibold">Activity log</p>
              <p className="text-[11px] text-[var(--color-muted)]">
                Last 25 of {events.length} events. Nothing here leaves this browser.
              </p>
            </div>
            <div className="flex gap-1.5">
              <button className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!events.length}>
                <Download size={12} /> CSV
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (confirm("Clear the activity log? Your résumé and applications stay.")) {
                    clearEvents();
                    toast("Activity log cleared", "info");
                  }
                }}
                disabled={!events.length}
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>
          </div>

          {eventRows.length === 0 ? (
            <div className="px-5 py-10">
              <EmptyState
                icon={<Activity size={18} />}
                title="No activity recorded yet"
                description="Browse a role or update your résumé and the log fills in."
              />
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {eventRows.map((event) => (
                <li key={event.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="mono w-[86px] flex-none text-[10.5px] text-[var(--color-muted)]">
                    {new Date(event.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="flex-1 truncate text-[12px]">{describeEvent(event)}</span>
                  <span className="mono flex-none text-[9.5px] uppercase tracking-wider text-[var(--color-line-strong)]">
                    {event.name}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* backup + destructive */}
        <div className="space-y-4">
          <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <p className="eyebrow flex items-center gap-1.5">
              <ArrowDownToLine size={12} /> Workspace backup
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-muted)]">
              Move your résumé, saved roles and applications to another browser or device with a
              single code. Compressed, offline, no account.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-primary btn-sm" onClick={makeCode} disabled={busy}>
                <ArrowDownToLine size={13} /> Create code
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => setImportOpen(true)}>
                <ArrowUpFromLine size={13} /> Restore
              </button>
            </div>
            <p className="mt-2.5 text-[10.5px] text-[var(--color-muted)]">
              The code contains your résumé and notes in plain text — treat it like a document.
            </p>
          </section>

          <section className="rounded-2xl border border-[#f7c8bf] bg-[#fff6f3] p-5">
            <p className="eyebrow !text-[#b3351a] flex items-center gap-1.5">
              <Trash2 size={12} /> Danger zone
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-[#8a4a3b]">
              Clearing removes your résumé, applications, saved roles and activity from this
              browser. It cannot be undone unless you made a backup code.
            </p>
            {confirmWipe ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    resetWorkspace();
                    resetIdentity();
                    setConfirmWipe(false);
                    setCode("");
                    window.setTimeout(() => {
                      window.location.hash = "#/";
                      window.location.reload();
                    }, 500);
                  }}
                >
                  Yes, erase everything
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmWipe(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button className="btn btn-danger btn-sm mt-3" onClick={() => setConfirmWipe(true)}>
                <Trash2 size={13} /> Clear this device
              </button>
            )}
          </section>

          <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <p className="eyebrow flex items-center gap-1.5">
              <Laptop size={12} /> What we never do
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {[
                "Sell or share your data",
                "Send marketing email",
                "Require a password or phone number",
                "Load third-party trackers",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[12px] text-[var(--color-ink-soft)]">
                  <Check size={12} className="text-[var(--color-green)]" /> {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <Modal
        open={codeOpen}
        onClose={() => setCodeOpen(false)}
        title="Your workspace code"
        description="Paste this into the Restore box on another device. It includes your résumé, applications and notes."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCodeOpen(false)}>
              Close
            </button>
            <button
              className="btn btn-outline"
              onClick={() =>
                download(
                  `openrole-workspace-${new Date().toISOString().slice(0, 10)}.txt`,
                  code,
                  "text/plain"
                )
              }
            >
              <Download size={14} /> Download
            </button>
            <button className="btn btn-primary" onClick={() => copy(code, "Workspace code")}>
              <ClipboardCopy size={14} /> Copy code
            </button>
          </>
        }
      >
        <textarea
          readOnly
          className="field h-36 font-mono text-[10.5px]"
          value={code}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
          {code.length.toLocaleString()} characters · created {formatRelative(new Date().toISOString())}
        </p>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Restore a workspace"
        description="Paste a code created by this app. It replaces what's currently in this browser."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={restore} disabled={!importText.trim() || busy}>
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Restore
            </button>
          </>
        }
      >
        <textarea
          className="field h-40 font-mono text-[10.5px]"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="z3J1ZXN1bWU…"
        />
        <p className="mt-2 flex items-start gap-2 text-[11px] text-[var(--color-muted)]">
          <X size={12} className="mt-0.5 flex-none text-[var(--color-coral)]" />
          This will replace your current résumé and applications. Create a backup first if you're unsure.
        </p>
      </Modal>
    </div>
  );
}
