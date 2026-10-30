import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Filter,
  Info,
  Radio,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { SAMPLE_JOBS, CATEGORIES } from "../data/jobs";
import { DEFAULT_FILTERS, LEVEL_LABEL, MODE_LABEL, TYPE_LABEL, activeFilterCount, filterJobs } from "../lib/search";
import { fetchLiveJobs, getCachedLiveJobs } from "../lib/liveJobs";
import { useWorkspace } from "../lib/store";
import type { Filters, Job, JobType, Level, WorkMode } from "../lib/types";
import { cn, pluralize } from "../lib/utils";
import JobCard from "../components/JobCard";
import { Badge, EmptyState, Modal, PageHeader, Segmented } from "../components/ui";

const QUICK: { label: string; apply: (f: Filters) => Filters }[] = [
  { label: "Remote", apply: (f) => ({ ...f, modes: ["remote"] }) },
  { label: "Fresher friendly", apply: (f) => ({ ...f, levels: ["intern", "junior"] }) },
  { label: "₹15L+", apply: (f) => ({ ...f, minSalary: 1500000 }) },
  { label: "Engineering", apply: (f) => ({ ...f, categories: ["Engineering"] }) },
  { label: "Design", apply: (f) => ({ ...f, categories: ["Design"] }) },
  { label: "Data", apply: (f) => ({ ...f, categories: ["Data"] }) },
  { label: "Internships", apply: (f) => ({ ...f, types: ["internship"] }) },
  { label: "Posted this week", apply: (f) => ({ ...f, maxAge: 7 }) },
];

export default function JobsPage() {
  const { resume, savedJobs, track, updatePrefs, toast } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => ({
    ...DEFAULT_FILTERS,
    query: params.get("q") ?? "",
  }));
  const [savedOnly, setSavedOnly] = useState(params.get("saved") === "1");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [liveJobs, setLiveJobs] = useState<Job[]>(() => getCachedLiveJobs());
  const [liveStatus, setLiveStatus] = useState<"idle" | "loading" | "ready" | "error">(() =>
    getCachedLiveJobs().length ? "ready" : "idle"
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const includeSample = true;

  const allJobs = useMemo(
    () => (includeSample ? [...SAMPLE_JOBS, ...liveJobs] : liveJobs),
    [liveJobs, includeSample]
  );

  const pool = savedOnly ? allJobs.filter((job) => savedJobs.includes(job.id)) : allJobs;
  const results = useMemo(() => filterJobs(pool, filters, resume), [pool, filters, resume]);
  const activeCount = activeFilterCount(filters);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params);
      if (filters.query) next.set("q", filters.query);
      else next.delete("q");
      if (savedOnly) next.set("saved", "1");
      else next.delete("saved");
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
      if (filters.query.trim().length > 1) {
        track("search", { query: filters.query, results: results.length });
      }
    }, 700);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query, savedOnly]);

  const update = (patch: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...patch }));

  const toggleIn = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const loadLive = async () => {
    setLiveStatus("loading");
    try {
      const jobs = await fetchLiveJobs();
      setLiveJobs(jobs);
      setLiveStatus("ready");
      updatePrefs({ lastVisited: new Date().toISOString() });
      toast(`${pluralize(jobs.length, "live role")} pulled from Remotive`, "success");
      track("search", { source: "live", count: jobs.length });
    } catch {
      setLiveStatus("error");
      toast("Live source unavailable — the curated list still works offline", "error");
    }
  };

  const clearAll = () => {
    setFilters({ ...DEFAULT_FILTERS });
    setSavedOnly(false);
  };

  return (
    <div className="animate-rise">
      <PageHeader
        index="01"
        eyebrow="Search"
        title={
          <>
            Find work <span className="serif-italic">worth doing.</span>
          </>
        }
        description="A hand-checked list of roles plus an optional live feed of remote jobs. Save what interests you and apply without ever making an account."
        actions={
          <>
            <button
              className={savedOnly ? "btn btn-primary" : "btn btn-outline"}
              onClick={() => setSavedOnly((v) => !v)}
            >
              <Bookmark size={15} fill={savedOnly ? "currentColor" : "none"} />
              Saved {savedJobs.length > 0 && `· ${savedJobs.length}`}
            </button>
            <Link to="/resume" className="btn btn-primary">
              <Sparkles size={15} />
              {resume.fullName ? "Polish résumé" : "Build your résumé"}
            </Link>
          </>
        }
      />

      <p className="mt-3 flex items-start gap-2 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
        <Info size={13} className="mt-0.5 flex-none" />
        Curated roles are illustrative sample listings written for this demo — confirm details on
        the employer's site. Live roles come from Remotive and always link to the original post.
      </p>

      {/* search */}
      <div className="mt-6">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="search-shell flex-1">
            <Search size={18} className="flex-none text-[var(--color-muted)]" />
            <input
              ref={searchRef}
              className="search-input"
              value={filters.query}
              onChange={(event) => update({ query: event.target.value })}
              placeholder="Search roles, companies or skills — try “React remote”"
              aria-label="Search jobs"
              type="search"
            />
            {filters.query ? (
              <button
                className="grid h-8 w-8 flex-none place-items-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-paper-2)]"
                onClick={() => update({ query: "" })}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            ) : (
              <span className="mono mr-1 hidden flex-none rounded border border-[var(--color-line)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)] sm:block">
                /
              </span>
            )}
            <button
              type="button"
              className="btn btn-primary btn-sm flex-none"
              onClick={() => {
                searchRef.current?.blur();
                document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Search
            </button>
          </div>
          <button
            className="btn btn-outline lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={15} />
            Filters{activeCount > 0 && ` · ${activeCount}`}
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 scroll-thin">
          {QUICK.map((quick) => {
            const preview = quick.apply({ ...DEFAULT_FILTERS });
            const isActive =
              (preview.modes.length > 0 && preview.modes.every((m) => filters.modes.includes(m)) && filters.modes.length === preview.modes.length) ||
              (preview.levels.length > 0 && preview.levels.every((l) => filters.levels.includes(l)) && filters.levels.length === preview.levels.length) ||
              (preview.types.length > 0 && preview.types.every((t) => filters.types.includes(t)) && filters.types.length === preview.types.length) ||
              (preview.categories.length > 0 && preview.categories.every((c) => filters.categories.includes(c)) && filters.categories.length === preview.categories.length) ||
              (preview.minSalary > 0 && filters.minSalary === preview.minSalary) ||
              (preview.maxAge > 0 && filters.maxAge === preview.maxAge);
            return (
              <button
                key={quick.label}
                className="chip"
                data-active={isActive}
                onClick={() => {
                  if (isActive) clearAll();
                  else setFilters(quick.apply({ ...DEFAULT_FILTERS }));
                }}
              >
                {quick.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[248px_1fr]">
        <aside className="filter-rail hidden lg:block">
          <FilterPanel
            filters={filters}
            update={update}
            toggleIn={toggleIn}
            clearAll={clearAll}
            activeCount={activeCount}
          />
          <LiveSource
            status={liveStatus}
            count={liveJobs.length}
            onLoad={loadLive}
            onClear={() => {
              setLiveJobs([]);
              setLiveStatus("idle");
            }}
          />
        </aside>

        <div id="results" className="scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-semibold">
                {savedOnly ? "Saved roles" : "Open roles"}
              </h2>
              <span className="mono text-[11px] text-[var(--color-muted)]">
                {results.length} {results.length === 1 ? "match" : "matches"}
              </span>
            </div>
            <Segmented
              size="sm"
              value={filters.sort}
              onChange={(value) => update({ sort: value })}
              options={[
                { value: "match", label: "Best match" },
                { value: "newest", label: "Newest" },
                { value: "salary", label: "Salary" },
              ]}
            />
          </div>

          {savedOnly && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[12.5px]">
              <Bookmark size={14} className="text-[var(--color-ink)]" />
              Showing only saved roles.
              <button className="ml-auto link-underline" onClick={() => setSavedOnly(false)}>
                Show all
              </button>
            </div>
          )}

          {results.length === 0 ? (
            <EmptyState
              icon={<Search size={20} />}
              title={savedOnly ? "No saved roles yet" : "Nothing matches those filters"}
              description={
                savedOnly
                  ? "Tap the bookmark on any role to shortlist it here. Saved roles live only on this device."
                  : "Try removing a filter, widening the salary range, or searching a broader skill."
              }
              action={
                <button className="btn btn-outline" onClick={clearAll}>
                  <RefreshCw size={14} />
                  Reset filters
                </button>
              }
            />
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((job) => (
                <JobCard key={job.id} job={job} resume={resume} />
              ))}
              <div className="mt-2 flex flex-col items-center justify-between gap-3 rounded-2xl border border-dashed border-[var(--color-line-strong)] px-4 py-5 text-center sm:flex-row sm:text-left">
                <div>
                  <p className="text-[13.5px] font-medium">
                    End of the curated list{liveJobs.length > 0 ? " and live feed" : ""}.
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                    {liveJobs.length > 0
                      ? "Live listings come from Remotive and link out to the original post."
                      : "Load 40 live remote roles, or keep browsing the curated set."}
                  </p>
                </div>
                {liveJobs.length === 0 ? (
                  <button className="btn btn-outline btn-sm" onClick={loadLive} disabled={liveStatus === "loading"}>
                    <Radio size={14} />
                    {liveStatus === "loading" ? "Fetching…" : "Load live jobs"}
                  </button>
                ) : (
                  <Badge tone="lime">{liveJobs.length} live roles loaded</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        description="Narrow the list. Everything applies instantly."
        footer={
          <>
            <button className="btn btn-ghost" onClick={clearAll}>
              Clear all
            </button>
            <button className="btn btn-primary" onClick={() => setFiltersOpen(false)}>
              Show {results.length} roles
            </button>
          </>
        }
      >
        <FilterPanel
          filters={filters}
          update={update}
          toggleIn={toggleIn}
          clearAll={clearAll}
          activeCount={activeCount}
        />
        <div className="mt-6">
          <LiveSource status={liveStatus} count={liveJobs.length} onLoad={loadLive} onClear={() => setLiveJobs([])} />
        </div>
      </Modal>
    </div>
  );
}

function FilterPanel({
  filters,
  update,
  toggleIn,
  clearAll,
  activeCount,
}: {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  toggleIn: <T extends string>(list: T[], value: T) => T[];
  clearAll: () => void;
  activeCount: number;
}) {
  const modes: WorkMode[] = ["remote", "hybrid", "onsite"];
  const types: JobType[] = ["full-time", "part-time", "contract", "internship"];
  const levels: Level[] = ["intern", "junior", "mid", "senior", "lead"];

  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <div className="flex items-center justify-between">
        <span className="eyebrow flex items-center gap-1.5">
          <Filter size={12} /> Filters {activeCount > 0 && `(${activeCount})`}
        </span>
        {activeCount > 0 && (
          <button className="text-[11.5px] text-[var(--color-muted)] underline underline-offset-2 hover:text-[var(--color-ink)]" onClick={clearAll}>
            Clear
          </button>
        )}
      </div>

      <div className="filter-group mt-3">
        <p className="field-label">Work mode</p>
        <div className="flex flex-wrap gap-1.5">
          {modes.map((mode) => (
            <button
              key={mode}
              className="chip"
              data-active={filters.modes.includes(mode)}
              onClick={() => update({ modes: toggleIn(filters.modes, mode) })}
            >
              {MODE_LABEL[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <p className="field-label">Job type</p>
        <div className="flex flex-wrap gap-1.5">
          {types.map((type) => (
            <button
              key={type}
              className="chip"
              data-active={filters.types.includes(type)}
              onClick={() => update({ types: toggleIn(filters.types, type) })}
            >
              {TYPE_LABEL[type]}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <p className="field-label">Experience</p>
        <div className="flex flex-col gap-1">
          {levels.map((level) => (
            <label key={level} className="flex cursor-pointer items-center gap-2 py-0.5 text-[13px]">
              <input
                type="checkbox"
                className="check"
                checked={filters.levels.includes(level)}
                onChange={() => update({ levels: toggleIn(filters.levels, level) })}
              />
              {LEVEL_LABEL[level]}
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <p className="field-label">Category</p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              className="chip"
              data-active={filters.categories.includes(category)}
              onClick={() => update({ categories: toggleIn(filters.categories, category) })}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <div className="flex items-baseline justify-between">
          <p className="field-label">Minimum salary</p>
          <span className="mono text-[11px]">
            {filters.minSalary === 0 ? "Any" : `₹${(filters.minSalary / 100000).toFixed(0)}L+`}
          </span>
        </div>
        <input
          type="range"
          className="range mt-1"
          min={0}
          max={5000000}
          step={250000}
          value={filters.minSalary}
          onChange={(event) => update({ minSalary: Number(event.target.value) })}
          aria-label="Minimum annual salary"
        />
      </div>

      <div className="filter-group">
        <p className="field-label">Posted within</p>
        <select
          className="field"
          value={filters.maxAge}
          onChange={(event) => update({ maxAge: Number(event.target.value) })}
        >
          <option value={0}>Any time</option>
          <option value={3}>Last 3 days</option>
          <option value={7}>Last week</option>
          <option value={14}>Last 2 weeks</option>
          <option value={30}>Last month</option>
        </select>
      </div>

      <div className="mt-4 rounded-xl bg-[var(--color-paper)] p-3">
        <p className="flex items-center gap-1.5 text-[11.5px] font-medium">
          <Sparkles size={12} /> Matched against your résumé
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
          Green skill chips already appear in your résumé. The ring shows overall fit.
        </p>
        <Link to="/resume" className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium link-underline">
          Edit résumé <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  );
}

function LiveSource({
  status,
  count,
  onLoad,
  onClear,
}: {
  status: "idle" | "loading" | "ready" | "error";
  count: number;
  onLoad: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-ink)] p-4 text-[var(--color-paper)]">
      <p className="flex items-center gap-1.5 text-[12px] font-medium">
        <Radio size={13} className="text-[var(--color-lime)]" />
        Live remote jobs
      </p>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-[#c9c8c1]">
        Pull 40 current roles from Remotive's public API. Fetched by your browser — no middleman,
        no account.
      </p>
      {status === "ready" && count > 0 ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="badge badge-lime">{count} loaded</span>
          <button className="text-[11px] underline underline-offset-2" onClick={onClear}>
            Remove
          </button>
        </div>
      ) : (
        <button
          className={cn("btn btn-sm mt-3 w-full", status === "error" ? "btn-outline" : "btn-accent")}
          onClick={onLoad}
          disabled={status === "loading"}
        >
          <RefreshCw size={13} className={status === "loading" ? "animate-spin" : ""} />
          {status === "loading" ? "Fetching…" : status === "error" ? "Retry" : "Load live jobs"}
        </button>
      )}
      {status === "error" && (
        <p className="mt-2 text-[11px] text-[#ffb4a2]">
          Couldn't reach the live feed. Curated roles still work.
        </p>
      )}
    </div>
  );
}
