import type { Job, Resume, TemplateId } from "./types";
import { uid } from "./utils";

export const ACCENTS = [
  { name: "Ink", value: "#14151a" },
  { name: "Cobalt", value: "#2f5bff" },
  { name: "Forest", value: "#166534" },
  { name: "Ember", value: "#ea580c" },
  { name: "Mulberry", value: "#7e22ce" },
  { name: "Teal", value: "#0f766e" },
];

export const TEMPLATES: { id: TemplateId; name: string; blurb: string }[] = [
  { id: "classic", name: "Classic", blurb: "Serif headings, single column. Safest for ATS." },
  { id: "modern", name: "Modern", blurb: "Sans-serif with a colour accent rail." },
  { id: "compact", name: "Compact", blurb: "Tighter spacing for long careers." },
];

export function emptyResume(): Resume {
  return {
    fullName: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    links: [],
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    template: "classic",
    accent: "#14151a",
    fontScale: 1,
  };
}

export function newExperience() {
  return {
    id: uid("exp"),
    role: "",
    company: "",
    location: "",
    start: "",
    end: "",
    current: false,
    bullets: [""],
  };
}

export function newEducation() {
  return { id: uid("edu"), school: "", degree: "", field: "", start: "", end: "", detail: "" };
}

export function newProject() {
  return { id: uid("prj"), name: "", link: "", description: "", tech: "" };
}

export function newCertification() {
  return { id: uid("cert"), name: "", issuer: "", year: "" };
}

export function exampleResume(): Resume {
  return {
    fullName: "Aarav Mehta",
    headline: "Frontend Engineer · React & TypeScript",
    email: "aarav.mehta@example.com",
    phone: "+91 98200 11223",
    location: "Mumbai, India",
    website: "aaravmehta.dev",
    links: [
      { label: "GitHub", url: "github.com/aaravmehta" },
      { label: "LinkedIn", url: "linkedin.com/in/aaravmehta" },
    ],
    summary:
      "Frontend engineer with 4 years of experience building accessible, fast product interfaces in React and TypeScript. Led the rebuild of a scheduling flow used by 60,000 people a week, cutting task completion time by 38%. Comfortable owning work from design handoff to production monitoring.",
    experience: [
      {
        id: uid("exp"),
        role: "Frontend Engineer",
        company: "Meridian Health",
        location: "Bengaluru (hybrid)",
        start: "2022-06",
        end: "",
        current: true,
        bullets: [
          "Rebuilt the appointment scheduling flow in React and Next.js, reducing completion time by 38% for 60,000 weekly users.",
          "Cut initial JavaScript bundle by 41% through route-level code splitting and dependency pruning.",
          "Introduced Playwright regression tests for 14 critical flows, lowering release defects by half.",
          "Mentored two interns through their first production launches.",
        ],
      },
      {
        id: uid("exp"),
        role: "Junior Web Developer",
        company: "Beam Collective",
        location: "Mumbai",
        start: "2020-08",
        end: "2022-05",
        current: false,
        bullets: [
          "Shipped 18 client websites with a focus on responsive layout and WCAG AA accessibility.",
          "Built a reusable component library that reduced new project setup from 5 days to 1.",
        ],
      },
    ],
    education: [
      {
        id: uid("edu"),
        school: "University of Mumbai",
        degree: "B.E.",
        field: "Computer Engineering",
        start: "2016",
        end: "2020",
        detail: "First class with distinction · 8.4 CGPA",
      },
    ],
    projects: [
      {
        id: uid("prj"),
        name: "Readme Studio",
        link: "github.com/aaravmehta/readme-studio",
        description:
          "An open-source markdown editor with live preview and GitHub sync. 1.2k stars and used by 4,000 developers monthly.",
        tech: "React, TypeScript, Vite",
      },
    ],
    skills: [
      "React", "TypeScript", "Next.js", "CSS", "Accessibility",
      "Testing", "GraphQL", "Performance", "Figma",
    ],
    certifications: [
      { id: uid("cert"), name: "Meta Front-End Developer", issuer: "Coursera", year: "2023" },
    ],
    template: "modern",
    accent: "#2f5bff",
    fontScale: 1,
  };
}

export function starterResume(input: {
  name: string;
  role: string;
  email?: string;
  location?: string;
  level: "student" | "early" | "mid" | "senior";
}): Resume {
  const base = emptyResume();
  const role = input.role.trim();
  const summaryByLevel: Record<typeof input.level, string> = {
    student: `Final-year student building a foundation in ${role || "software development"} through coursework and hands-on projects. Looking for an internship or first role where I can learn from experienced engineers and ship real work.`,
    early: `${role || "Software professional"} with 1–3 years of experience delivering production work. Focused on clean implementation, clear communication, and measurable improvements to the product.`,
    mid: `${role || "Product professional"} with 4–6 years of experience owning features end to end. Known for turning ambiguous problems into shipped, measurable outcomes and for raising the quality bar of the team.`,
    senior: `${role || "Senior professional"} with 8+ years of experience leading complex delivery across teams. Combines deep technical judgement with mentoring, clear written communication, and pragmatic decisions under constraint.`,
  };
  return {
    ...base,
    fullName: input.name,
    headline: role ? `${role}` : "",
    email: input.email ?? "",
    location: input.location ?? "",
    summary: summaryByLevel[input.level],
    experience: input.level === "student" ? [] : [newExperience()],
    education: [newEducation()],
    skills: [],
    template: "classic",
    accent: "#14151a",
  };
}

/* ------------------------------------------------------------------ *
 * Text extraction & matching
 * ------------------------------------------------------------------ */

const STOPWORDS = new Set(
  `a an the and or but if while of to in on at for with from by as is are was were be been being this that these those
   you your we our they their it its he she his her them us i me my mine will would can could should may might must
   have has had do does did not no yes about into over under more most less least very just also than then there here
   who whom which what when where why how all any each few other some such only own same so too s t don now
   work works working role roles team teams job jobs company companies candidate candidates experience experienced
   strong good great excellent ability able across within using use used plus etc via per new
   years year month months day days time times including include includes`
    .split(/\s+/)
    .filter(Boolean)
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[./-]+|[./-]+$/g, ""))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export function resumeText(resume: Resume): string {
  const parts: string[] = [
    resume.fullName, resume.headline, resume.summary,
    resume.skills.join(" "),
  ];
  resume.experience.forEach((e) => {
    parts.push(e.role, e.company, e.location, ...e.bullets);
  });
  resume.education.forEach((e) => {
    parts.push(e.school, e.degree, e.field, e.detail);
  });
  resume.projects.forEach((p) => {
    parts.push(p.name, p.description, p.tech);
  });
  resume.certifications.forEach((c) => {
    parts.push(c.name, c.issuer, c.year);
  });
  return parts.join(" \n ");
}

export function jobText(job: Job): string {
  return [
    job.title,
    job.company,
    job.category,
    job.skills.join(" "),
    job.description,
    ...job.responsibilities,
    ...job.requirements,
    ...job.perks,
  ].join(" \n ");
}

export type MatchResult = {
  score: number;
  matched: string[];
  missing: string[];
  titleMatch: boolean;
};

export function matchJob(resume: Resume, job: Job): MatchResult {
  const resumeLower = resumeText(resume).toLowerCase();
  const resumeTokens = new Set(tokenize(resumeText(resume)));

  const requiredSkills = job.skills;
  const matchedSkills = requiredSkills.filter((s) => {
    const probe = s.toLowerCase();
    return resumeLower.includes(probe);
  });
  const missingSkills = requiredSkills.filter((s) => !matchedSkills.includes(s));

  const jobTokens = Array.from(new Set(tokenize(jobText(job)))).filter((t) => t.length > 2);
  const covered = jobTokens.filter((t) => resumeTokens.has(t));

  const skillScore = requiredSkills.length ? matchedSkills.length / requiredSkills.length : 0;
  const keywordScore = jobTokens.length ? covered.length / jobTokens.length : 0;

  const titleTokens = tokenize(job.title).filter((t) => t.length > 2);
  const titleMatch = titleTokens.length
    ? titleTokens.filter((t) => resumeLower.includes(t)).length / titleTokens.length > 0.5
    : false;
  const titleScore = titleMatch ? 1 : titleTokens.length
    ? titleTokens.filter((t) => resumeLower.includes(t)).length / titleTokens.length
    : 0;

  const score = Math.round(
    Math.min(100, (skillScore * 0.55 + keywordScore * 0.3 + titleScore * 0.15) * 100)
  );

  return {
    score: resumeHasContent(resume) ? score : 0,
    matched: matchedSkills,
    missing: missingSkills,
    titleMatch,
  };
}

export function resumeHasContent(resume: Resume): boolean {
  return Boolean(
    resume.fullName || resume.summary || resume.skills.length || resume.experience.length
  );
}

export function keywordGaps(resume: Resume, job: Job): string[] {
  const resumeLower = resumeText(resume).toLowerCase();
  const ignore = new Set([
    ...tokenize(`${job.company} ${job.location} ${job.perks.join(" ")}`),
    "team", "role", "apply", "looking", "join", "help", "would", "could", "well",
  ]);

  const source = [
    job.title,
    job.skills.join(" "),
    ...job.requirements,
    ...job.responsibilities,
  ].join(" ");

  const counts = new Map<string, number>();
  tokenize(source).forEach((word) => {
    if (word.length < 4 || ignore.has(word) || resumeLower.includes(word)) return;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 12)
    .map(([word]) => word);
}

/* ------------------------------------------------------------------ *
 * ATS checks
 * ------------------------------------------------------------------ */

export type AtsCheck = {
  id: string;
  label: string;
  ok: boolean;
  hint: string;
  weight: number;
  points: number;
};

const ACTION_VERBS = /^(led|built|shipped|designed|launched|reduced|increased|improved|created|developed|managed|owned|drove|grew|cut|automated|migrated|mentored|scaled|delivered|implemented|introduced|optimised|optimized|streamlined|negotiated|coordinated|trained|wrote|established|rebuilt|refactored|tested|analysed|analyzed)/i;

export function atsChecks(resume: Resume): AtsCheck[] {
  const filledExperience = resume.experience.filter((e) => e.role || e.company);
  const bullets = filledExperience.flatMap((e) => e.bullets.filter((b) => b.trim()));
  const quantified = bullets.filter((b) => /\d/.test(b));
  const strongOpeners = bullets.filter((b) => ACTION_VERBS.test(b.trim()));
  const summaryWords = resume.summary.trim().split(/\s+/).filter(Boolean).length;
  const allText = resumeText(resume);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resume.email);
  const placeholder = /(lorem ipsum|your name|xxx|sample text|company name)/i.test(allText);

  const checks: Omit<AtsCheck, "points">[] = [
    {
      id: "contact",
      label: "Contact details are complete",
      ok: Boolean(resume.fullName.trim() && emailOk),
      hint: "Add your full name and a valid email — recruiters and parsers both need these.",
      weight: 12,
    },
    {
      id: "headline",
      label: "Target job title appears in your headline",
      ok: resume.headline.trim().split(/\s+/).length >= 2,
      hint: "Match your headline to the role you want, e.g. “Frontend Engineer · React & TypeScript”.",
      weight: 8,
    },
    {
      id: "summary",
      label: "Summary is 35–110 words",
      ok: summaryWords >= 35 && summaryWords <= 110,
      hint:
        summaryWords === 0
          ? "Write a 3–4 sentence summary: who you are, what you do well, and one result you're proud of."
          : summaryWords < 35
            ? "Your summary is short — add a concrete achievement to give it weight."
            : "Your summary is long. Tighten it to 110 words so the top third of the page stays scannable.",
      weight: 10,
    },
    {
      id: "experience",
      label: "At least one role with 3+ bullets",
      ok: filledExperience.some((e) => e.bullets.filter((b) => b.trim()).length >= 3),
      hint: "Give your most recent role at least three bullets describing what you did and the outcome.",
      weight: 14,
    },
    {
      id: "quantified",
      label: "Bullets include numbers",
      ok: bullets.length > 0 && quantified.length / Math.max(1, bullets.length) >= 0.4,
      hint: "Add figures to at least 40% of your bullets: %, ₹, users, hours saved, team size.",
      weight: 14,
    },
    {
      id: "verbs",
      label: "Bullets start with action verbs",
      ok: bullets.length > 0 && strongOpeners.length / Math.max(1, bullets.length) >= 0.5,
      hint: "Start bullets with verbs like Led, Built, Reduced — not “Responsible for”.",
      weight: 10,
    },
    {
      id: "skills",
      label: "8+ relevant skills listed",
      ok: resume.skills.length >= 8,
      hint: "List the tools and technologies named in job posts you're targeting. Eight or more helps keyword matches.",
      weight: 10,
    },
    {
      id: "education",
      label: "Education or certification included",
      ok:
        resume.education.some((e) => e.school || e.degree) ||
        resume.certifications.length > 0,
      hint: "Add your degree, diploma, or a relevant certification with the year.",
      weight: 6,
    },
    {
      id: "links",
      label: "A portfolio or profile link is present",
      ok: Boolean(resume.website.trim()) || resume.links.some((l) => l.url.trim()),
      hint: "Add a GitHub, portfolio, or LinkedIn URL — parsers pick these up reliably.",
      weight: 8,
    },
    {
      id: "clean",
      label: "No placeholder text left",
      ok: !placeholder,
      hint: "Remove filler like “Lorem ipsum” or “Company Name” before sending.",
      weight: 8,
    },
  ];

  return checks.map((c) => ({
    ...c,
    points: c.ok ? c.weight : Math.round(c.weight * 0.35),
  }));
}

export function atsScore(checks: AtsCheck[]): number {
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks.reduce((sum, c) => sum + c.points, 0);
  return Math.round((earned / total) * 100);
}

/* ------------------------------------------------------------------ *
 * Cover letter
 * ------------------------------------------------------------------ */

export function buildCoverLetter(resume: Resume, job: Job): string {
  const name = resume.fullName.trim() || "Your name";
  const matched = job.skills.filter((s) =>
    resumeText(resume).toLowerCase().includes(s.toLowerCase())
  );
  const topSkills = (matched.length ? matched : resume.skills).slice(0, 3);
  const skillPhrase =
    topSkills.length > 1
      ? `${topSkills.slice(0, -1).join(", ")} and ${topSkills[topSkills.length - 1]}`
      : topSkills[0] ?? "the tools this role calls for";

  const recent = resume.experience.find((e) => e.role.trim());
  const bestBullet = recent?.bullets
    .filter((b) => b.trim())
    .sort((_a, b) => (/(\d|%)/.test(b) ? -1 : 1))[0];
  const proof = bestBullet ? bestBullet.replace(/\.$/, "") : null;
  const sameCompany =
    recent?.company &&
    recent.company.trim().toLowerCase() === job.company.trim().toLowerCase();

  const brief = job.responsibilities[0]?.replace(/\.$/, "");

  const lines = [
    `Hi ${job.company} team,`,
    ``,
    `I'm applying for the ${job.title} role. My background is in ${skillPhrase}, and the brief you've described${brief ? ` — “${brief}” —` : ""} is the kind of work I want more of.`,
    proof
      ? sameCompany
        ? `\nIn my current role at ${recent?.company}, I ${proof.charAt(0).toLowerCase()}${proof.slice(1)}. That's the standard I'd bring to this position too.`
        : `\nMost recently, at ${recent?.company || "my current company"}, I ${proof.charAt(0).toLowerCase()}${proof.slice(1)}. That's the standard I'd bring to this position.`
      : `\nI care about work that holds up after launch, and I'm comfortable owning a problem from the first sketch through to the numbers afterwards.`,
    job.companyBlurb
      ? `\nWhat draws me to ${job.company} is the focus: ${job.companyBlurb.split(".")[0].trim()}. I'd rather do a few things properly, and that seems to be how you work.`
      : `\nWhat draws me to ${job.company} is the clarity of the problem. I'd rather do a few things properly than many things approximately.`,
    `\nI'd be glad to talk through how I could help. Thank you for reading.`,
    ``,
    `Best regards,`,
    name,
    resume.email || "",
    resume.phone || "",
  ];

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ------------------------------------------------------------------ *
 * Sharing: compress state into a URL-safe payload (no server)
 * ------------------------------------------------------------------ */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 ? "=".repeat(4 - (padded.length % 4)) : "";
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deflate(text: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(text);
  if (typeof CompressionStream === "undefined") return data;
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function inflate(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream === "undefined") return new TextDecoder().decode(bytes);
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const buf = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buf);
}

export async function encodePayload(value: unknown): Promise<string> {
  const json = JSON.stringify(value);
  const hasCompression =
    typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
  if (!hasCompression) return `j${bytesToBase64Url(new TextEncoder().encode(json))}`;
  try {
    const compressed = await deflate(json);
    return `z${bytesToBase64Url(compressed)}`;
  } catch {
    return `j${bytesToBase64Url(new TextEncoder().encode(json))}`;
  }
}

export async function decodePayload<T>(payload: string): Promise<T> {
  const flag = payload[0];
  const body = payload.slice(1);
  const bytes = base64UrlToBytes(body);
  const json = flag === "z" ? await inflate(bytes) : new TextDecoder().decode(bytes);
  return JSON.parse(json) as T;
}

export function publicResumeShape(resume: Resume): Resume {
  // strip nothing today — everything here is meant to be seen — but keep a
  // single choke point in case fields are added later.
  return resume;
}
