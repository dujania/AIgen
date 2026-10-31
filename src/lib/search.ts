import type { Filters, Job, Resume } from "./types";
import { matchJob } from "./resume";
import { annualINR } from "./utils";

export const DEFAULT_FILTERS: Filters = {
  query: "",
  modes: [],
  types: [],
  levels: [],
  categories: [],
  minSalary: 0,
  maxAge: 0,
  sort: "match",
};

function haystack(job: Job): string {
  return [
    job.title,
    job.company,
    job.location,
    job.category,
    ...job.skills,
    job.description,
  ]
    .join(" ")
    .toLowerCase();
}

export function filterJobs(jobs: Job[], filters: Filters, resume: Resume): Job[] {
  const terms = filters.query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const filtered = jobs.filter((job) => {
    if (terms.length) {
      const hay = haystack(job);
      if (!terms.every((term) => hay.includes(term))) return false;
    }
    if (filters.modes.length && !filters.modes.includes(job.mode)) return false;
    if (filters.types.length && !filters.types.includes(job.type)) return false;
    if (filters.levels.length && !filters.levels.includes(job.level)) return false;
    if (filters.categories.length && !filters.categories.includes(job.category)) return false;
    if (filters.minSalary > 0 && annualINR(job) < filters.minSalary) return false;
    if (filters.maxAge > 0 && job.postedDaysAgo > filters.maxAge) return false;
    return true;
  });

  if (filters.sort === "newest") {
    return filtered.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  }
  if (filters.sort === "salary") {
    return filtered.sort((a, b) => annualINR(b) - annualINR(a));
  }

  return filtered
    .map((job) => ({ job, score: matchJob(resume, job).score }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.job.postedDaysAgo - b.job.postedDaysAgo;
    })
    .map((entry) => entry.job);
}

export function activeFilterCount(filters: Filters): number {
  return (
    filters.modes.length +
    filters.types.length +
    filters.levels.length +
    filters.categories.length +
    (filters.minSalary > 0 ? 1 : 0) +
    (filters.maxAge > 0 ? 1 : 0) +
    (filters.query.trim() ? 1 : 0)
  );
}

export const LEVEL_LABEL: Record<Job["level"], string> = {
  intern: "Internship",
  junior: "Junior / fresher",
  mid: "Mid-level",
  senior: "Senior",
  lead: "Lead / manager",
};

export const TYPE_LABEL: Record<Job["type"], string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
};

export const MODE_LABEL: Record<Job["mode"], string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};
