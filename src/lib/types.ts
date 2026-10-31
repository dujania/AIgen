export type WorkMode = "remote" | "hybrid" | "onsite";
export type JobType = "full-time" | "part-time" | "contract" | "internship";
export type Level = "intern" | "junior" | "mid" | "senior" | "lead";

export type Job = {
  id: string;
  title: string;
  company: string;
  companyBlurb?: string;
  logo: string;
  color: string;
  location: string;
  mode: WorkMode;
  type: JobType;
  level: Level;
  /** annual salary, in the smallest sensible unit (whole rupees / dollars) */
  salaryMin?: number;
  salaryMax?: number;
  currency: "INR" | "USD" | "EUR";
  postedDaysAgo: number;
  skills: string[];
  category: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  perks: string[];
  source: "sample" | "live";
  applyUrl?: string;
  teamSize?: string;
  featured?: boolean;
};

export type ResumeLink = { label: string; url: string };

export type Experience = {
  id: string;
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string[];
};

export type Education = {
  id: string;
  school: string;
  degree: string;
  field: string;
  start: string;
  end: string;
  detail: string;
};

export type Project = {
  id: string;
  name: string;
  link: string;
  description: string;
  tech: string;
};

export type Certification = {
  id: string;
  name: string;
  issuer: string;
  year: string;
};

export type TemplateId = "classic" | "modern" | "compact";

export type Resume = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  links: ResumeLink[];
  summary: string;
  experience: Experience[];
  education: Education[];
  projects: Project[];
  skills: string[];
  certifications: Certification[];
  template: TemplateId;
  accent: string;
  fontScale: number;
};

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export type JobSnapshot = Pick<
  Job,
  "id" | "title" | "company" | "location" | "mode" | "type" | "logo" | "color" | "applyUrl" | "source"
>;

export type ApplicationEvent = {
  id: string;
  at: string;
  label: string;
};

export type Application = {
  id: string;
  job: JobSnapshot;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  appliedAt?: string;
  coverLetter: string;
  notes: string;
  followUpAt?: string;
  timeline: ApplicationEvent[];
};

export type TrackEventName =
  | "page_view"
  | "search"
  | "job_view"
  | "job_save"
  | "apply_start"
  | "apply_submit"
  | "status_change"
  | "resume_edit"
  | "resume_export"
  | "resume_share"
  | "cover_letter"
  | "workspace_import"
  | "workspace_export";

export type TrackEvent = {
  id: string;
  at: string;
  name: TrackEventName;
  props?: Record<string, string | number | boolean>;
};

export type WorkspaceState = {
  version: 2;
  resume: Resume;
  applications: Application[];
  savedJobs: string[];
  events: TrackEvent[];
  prefs: {
    showSampleJobs: boolean;
    lastVisited: string;
  };
};

export type Filters = {
  query: string;
  modes: WorkMode[];
  types: JobType[];
  levels: Level[];
  categories: string[];
  minSalary: number;
  maxAge: number;
  sort: "match" | "newest" | "salary";
};
