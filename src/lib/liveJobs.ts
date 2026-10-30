import type { Job, JobType, Level } from "./types";

/**
 * Optional live listings from Remotive's public API (CORS-friendly, no key).
 * Jobs are clearly labelled as live and always link back to the original post.
 */
type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
};

const COLORS = ["#2f5bff", "#ea580c", "#0f766e", "#7e22ce", "#b91c1c", "#0369a1", "#4d7c0f", "#a16207"];

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}

function mapType(raw?: string): JobType {
  const value = (raw || "").toLowerCase();
  if (value.includes("part")) return "part-time";
  if (value.includes("contract")) return "contract";
  if (value.includes("intern")) return "internship";
  return "full-time";
}

function mapLevel(title: string): Level {
  const t = title.toLowerCase();
  if (/(intern|trainee|graduate)/.test(t)) return "intern";
  if (/(junior|jr\.?|entry|associate)/.test(t)) return "junior";
  if (/(staff|principal|head of|manager|director|lead)/.test(t)) return "lead";
  if (/(senior|sr\.?|staff)/.test(t)) return "senior";
  return "mid";
}

const CACHE_KEY = "openrole.livejobs.v1";

export function getCachedLiveJobs(): Job[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const jobs = JSON.parse(raw) as Job[];
    return Array.isArray(jobs) ? jobs : [];
  } catch {
    return [];
  }
}

export function getCachedLiveJob(id: string): Job | undefined {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const jobs = JSON.parse(raw) as Job[];
    return jobs.find((job) => job.id === id);
  } catch {
    return undefined;
  }
}

export async function fetchLiveJobs(): Promise<Job[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch("https://remotive.com/api/remote-jobs?limit=40", {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Live source responded ${response.status}`);
    const data = (await response.json()) as { jobs?: RemotiveJob[] };
    const jobs = data.jobs ?? [];

    const mapped: Job[] = jobs.map((item, index) => {
      const description = item.description ? stripHtml(item.description) : "";
      const published = item.publication_date ? new Date(item.publication_date) : new Date();
      const postedDaysAgo = Math.max(
        0,
        Math.round((Date.now() - published.getTime()) / 86400000)
      );
      const salaryNumbers = (item.salary || "").match(/\d[\d,]*/g)?.map((n) => Number(n.replace(/,/g, ""))) ?? [];
      const currency = /₹|inr/i.test(item.salary || "") ? "INR" : /€|eur/i.test(item.salary || "") ? "EUR" : "USD";
      const sentences = description.split(/(?<=[.!?])\s+/).filter(Boolean);

      return {
        id: `live-${item.id}`,
        title: item.title,
        company: item.company_name,
        companyBlurb: sentences.slice(0, 2).join(" ").slice(0, 260),
        logo: (item.company_name || "?").trim().charAt(0).toUpperCase(),
        color: COLORS[index % COLORS.length],
        location: item.candidate_required_location || "Remote — Global",
        mode: "remote",
        type: mapType(item.job_type),
        level: mapLevel(item.title),
        salaryMin: salaryNumbers.length ? salaryNumbers[0] : undefined,
        salaryMax: salaryNumbers.length > 1 ? salaryNumbers[1] : salaryNumbers[0],
        currency: currency as Job["currency"],
        postedDaysAgo,
        skills: (item.tags || []).slice(0, 8),
        category: item.category || "Engineering",
        description: description.slice(0, 900) || "No description provided by the source.",
        responsibilities: sentences.slice(0, 4),
        requirements: sentences.slice(4, 8),
        perks: ["Remote role", "Source: Remotive"],
        source: "live",
        applyUrl: item.url,
        featured: false,
      } satisfies Job;
    });

    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
    } catch {
      /* cache is best-effort */
    }
    return mapped;
  } finally {
    clearTimeout(timeout);
  }
}
