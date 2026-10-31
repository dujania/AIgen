import { useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Briefcase,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  SquareKanban,
} from "lucide-react";
import { useWorkspace } from "../lib/store";
import { cn, initials } from "../lib/utils";
import { Toasts } from "./ui";

const NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/resume", label: "Résumé", icon: FileText },
  { to: "/applications", label: "Applications", icon: SquareKanban },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { resume, applications, track } = useWorkspace();
  const activeCount = applications.filter((a) => a.status !== "rejected").length;

  useEffect(() => {
    track("page_view", { path: pathname });
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="relative min-h-screen">
      <div className="paper-grain" aria-hidden />

      <header className="site-header">
        <div className="relative z-10 mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 pr-1" aria-label="Openrole home">
            <span className="logo-mark" aria-hidden />
            <span className="text-[17px] font-semibold tracking-[-0.03em]">
              openrole<span className="text-[var(--color-coral)]">.</span>
            </span>
          </Link>

          <nav className="ml-3 hidden items-center gap-0.5 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="nav-link"
                data-active={item.end ? pathname === item.to : pathname.startsWith(item.to)}
              >
                <item.icon size={15} strokeWidth={1.9} />
                {item.label}
                {item.to === "/applications" && activeCount > 0 && (
                  <span className="mono ml-0.5 rounded bg-[var(--color-paper-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-ink-soft)]">
                    {activeCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)]/70 px-3 py-1.5 text-[11.5px] text-[var(--color-ink-soft)] lg:inline-flex">
              <ShieldCheck size={13} className="text-[var(--color-green)]" />
              No signup. Saved on this device.
            </span>
            <Link
              to="/insights"
              className={cn(
                "flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] py-1 pl-1 pr-3 transition-colors hover:border-[var(--color-line-strong)]",
                pathname === "/insights" && "ring-1 ring-[var(--color-ink)]"
              )}
              title="Your workspace & privacy"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-ink)] text-[11px] font-semibold text-[var(--color-paper)]">
                {resume.fullName ? initials(resume.fullName) : <Sparkles size={13} />}
              </span>
              <span className="mono hidden text-[10.5px] uppercase tracking-wider text-[var(--color-muted)] sm:inline">
                My data
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-24 pt-7 sm:px-6 lg:pb-16">
        {children}
      </main>

      <footer className="relative z-10 border-t border-[var(--color-line)] bg-[var(--color-paper-2)]/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-[12.5px] text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="logo-mark scale-90" aria-hidden />
            <span>
              <span className="font-medium text-[var(--color-ink)]">openrole</span> — free job
              search, résumé builder & application tracker.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>No accounts. No tracking pixels.</span>
            <Link to="/insights" className="link-underline">
              Your data
            </Link>
            <span className="mono text-[10.5px] uppercase tracking-wider">v1.0</span>
          </div>
        </div>
      </footer>

      <nav className="mobile-tabs md:hidden" aria-label="Mobile">
        <div className="flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="mobile-tab"
              data-active={item.end ? pathname === item.to : pathname.startsWith(item.to)}
            >
              <item.icon size={19} strokeWidth={1.8} />
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/insights"
            className="mobile-tab"
            data-active={pathname === "/insights"}
          >
            <ShieldCheck size={19} strokeWidth={1.8} />
            My data
          </NavLink>
        </div>
      </nav>

      <Toasts />
    </div>
  );
}
