import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Download,
  FileJson,
  FileText,
  Link2,
  Plus,
  Printer,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import {
  ACCENTS,
  TEMPLATES,
  atsChecks,
  atsScore,
  encodePayload,
  exampleResume,
  matchJob,
  newCertification,
  newEducation,
  newExperience,
  newProject,
} from "../lib/resume";
import { ALL_SKILLS, SAMPLE_JOBS } from "../data/jobs";
import { getCachedLiveJob } from "../lib/liveJobs";
import { useWorkspace } from "../lib/store";
import type { Resume } from "../lib/types";
import { cn, copyText, download, formatRelative } from "../lib/utils";
import { ResumePreview, PrintSheet } from "../components/ResumePreview";
import { Badge, Field, Modal, PageHeader, Ring, Segmented } from "../components/ui";

type SectionId = "basics" | "summary" | "experience" | "projects" | "education" | "skills" | "extras";

export default function ResumePage() {
  const { resume, updateResume, replaceResume, toast, track, loadExample } = useWorkspace();
  const [openSections, setOpenSections] = useState<SectionId[]>(["basics", "summary", "experience", "skills"]);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>(new Date().toISOString());
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  const [params] = useSearchParams();
  const targetJobId = params.get("job");
  const targetJob = useMemo(
    () => (targetJobId ? SAMPLE_JOBS.find((job) => job.id === targetJobId) ?? getCachedLiveJob(targetJobId) : undefined),
    [targetJobId]
  );
  const targetMatch = useMemo(
    () => (targetJob ? matchJob(resume, targetJob) : null),
    [targetJob, resume]
  );

  const checks = useMemo(() => atsChecks(resume), [resume]);
  const score = useMemo(() => atsScore(checks), [checks]);
  const failed = checks.filter((c) => !c.ok);
  const wordCount = resume.summary.trim().split(/\s+/).filter(Boolean).length;

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setSaving(true);
    setSavedAt(new Date().toISOString());
    if (editTimer.current) clearTimeout(editTimer.current);
    editTimer.current = setTimeout(() => {
      setSaving(false);
      track("resume_edit", { score, sections: resume.experience.length });
    }, 900);
    return () => {
      if (editTimer.current) clearTimeout(editTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resume]);

  const toggleSection = (id: SectionId) =>
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

  const set = (patch: Partial<Resume>) => updateResume(patch);

  const suggestSummary = () => {
    const role = resume.headline.trim() || "product-minded professional";
    const topSkills = resume.skills.slice(0, 4);
    const skillPhrase =
      topSkills.length > 1
        ? `${topSkills.slice(0, -1).join(", ")} and ${topSkills[topSkills.length - 1]}`
        : topSkills[0] || "the tools my role requires";
    const latest = resume.experience.find((e) => e.role || e.company);
    const bullet = latest?.bullets.filter((b) => b.trim())[0];
    const sentence = latest
      ? `Most recently at ${latest.company || "my current company"}, I ${bullet ? bullet.charAt(0).toLowerCase() + bullet.slice(1).replace(/\.$/, "") : "delivered work end to end"}.`
      : "I'm now looking for a role where I can take on real ownership and keep learning.";
    set({
      summary: `${role} focused on ${skillPhrase}. ${sentence} I care about clear communication, measurable outcomes, and leaving codebases and teams easier to work in than I found them.`,
    });
    track("resume_edit", { action: "suggest_summary" });
  };

  const printResume = () => {
    track("resume_export", { format: "pdf" });
    window.print();
  };

  const openShare = async () => {
    const payload = await encodePayload(resume);
    const url = `${window.location.origin}${window.location.pathname}#/r/${payload}`;
    setShareUrl(url);
    setShareOpen(true);
    track("resume_share", { chars: url.length });
  };

  const exportJson = () => {
    download(
      `${(resume.fullName || "resume").toLowerCase().replace(/\s+/g, "-")}.json`,
      JSON.stringify(resume, null, 2)
    );
    track("resume_export", { format: "json" });
    toast("Résumé JSON downloaded", "success");
  };

  const importJson = (text: string) => {
    try {
      const parsed = JSON.parse(text) as Resume;
      if (!parsed || typeof parsed !== "object") throw new Error("bad shape");
      replaceResume({ ...resume, ...parsed });
      setImportOpen(false);
      setImportText("");
      toast("Résumé imported — review the details", "success");
    } catch {
      toast("That doesn't look like a résumé file", "error");
    }
  };

  return (
    <div className="animate-rise">
      <PageHeader
        index="02"
        eyebrow="Craft"
        title={
          <>
            A résumé that <span className="serif-italic">survives the robots.</span>
          </>
        }
        description="Write once, check the ATS signals, export a clean PDF. Everything is stored in this browser — there is no upload, no watermark, and no paywall."
        actions={
          <>
            <button className="btn btn-outline" onClick={openShare}>
              <Share2 size={15} />
              Share link
            </button>
            <button
              className="btn btn-primary"
              onClick={printResume}
              title="Opens your browser's print dialog — choose “Save as PDF”"
            >
              <Download size={15} />
              Export PDF
            </button>
          </>
        }
      />

      {targetJob && (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-[var(--color-ink)] bg-[var(--color-ink)] p-4 text-[var(--color-paper)] sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Ring value={targetMatch?.score ?? 0} size={48} color="#d8fb4f" />
            <div>
              <p className="mono text-[10px] uppercase tracking-[0.16em] text-[#a9a8a1]">Tailoring for</p>
              <p className="text-[14px] font-medium leading-tight">{targetJob.title}</p>
              <p className="text-[11.5px] text-[#a9a8a1]">
                {targetJob.company} · {targetMatch?.matched.length ?? 0}/{targetJob.skills.length} listed skills on your résumé
              </p>
            </div>
          </div>
          <div className="flex-1">
            {targetMatch && targetMatch.missing.length > 0 ? (
              <>
                <p className="text-[11.5px] text-[#c9c8c1]">
                  Missing skills — tap to add the ones you genuinely have:
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {targetMatch.missing.slice(0, 6).map((skill) => (
                    <button
                      key={skill}
                      className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-[11px] hover:bg-white/15"
                      onClick={() => {
                        set({ skills: [...resume.skills, skill] });
                        toast(`Added ${skill} to your skills`, "success");
                      }}
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11.5px] text-[#c9c8c1]">
                Every skill listed in this posting already appears in your résumé. Check that the
                summary mentions the same job title.
              </p>
            )}
          </div>
          <Link
            to={`/jobs/${targetJob.id}`}
            className="btn btn-outline btn-sm flex-none !border-white/25 !text-[var(--color-paper)] hover:!bg-white/10"
          >
            Back to role
          </Link>
        </div>
      )}

      {/* toolbar */}
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Ring value={score} size={42} />
            <div>
              <p className="text-[12px] font-medium leading-tight">ATS readiness</p>
              <p className="text-[11px] text-[var(--color-muted)]">
                {failed.length === 0 ? "All checks pass" : `${failed.length} things to fix`}
              </p>
            </div>
          </div>
          <div className="hidden h-8 w-px bg-[var(--color-line)] sm:block" />
          <div className="flex items-center gap-1.5">
            {ACCENTS.map((accent) => (
              <button
                key={accent.value}
                onClick={() => set({ accent: accent.value })}
                aria-label={`Accent ${accent.name}`}
                aria-pressed={resume.accent === accent.value}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform",
                  resume.accent === accent.value
                    ? "scale-110 border-[var(--color-ink)]"
                    : "border-transparent hover:scale-105"
                )}
                style={{ background: accent.value }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="mono hidden text-[10.5px] uppercase tracking-wider text-[var(--color-muted)] sm:inline">
            {saving ? "Saving…" : `Saved ${formatRelative(savedAt)}`}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
            <Upload size={13} /> Import
          </button>
          <button className="btn btn-ghost btn-sm" onClick={exportJson}>
            <FileJson size={13} /> JSON
          </button>
          <button className="btn btn-ghost btn-sm" onClick={loadExample}>
            <Wand2 size={13} /> Example
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then((text) => importJson(text));
              event.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="mt-3 lg:hidden">
        <Segmented
          value={mobileView}
          onChange={setMobileView}
          options={[
            { value: "edit", label: "Edit" },
            { value: "preview", label: `Preview · ${score}%` },
          ]}
        />
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)]">
        {/* editor */}
        <div className={cn("min-w-0 space-y-3", mobileView === "preview" && "hidden lg:block")}>
          <Section
            id="basics"
            title="Basics"
            hint="Name, headline and how to reach you"
            complete={Boolean(resume.fullName && resume.email)}
            open={openSections.includes("basics")}
            onToggle={toggleSection}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name">
                <input
                  className="field"
                  value={resume.fullName}
                  onChange={(e) => set({ fullName: e.target.value })}
                  placeholder="Aarav Mehta"
                  autoComplete="name"
                />
              </Field>
              <Field label="Headline" hint="Mirror the job title you want.">
                <input
                  className="field"
                  value={resume.headline}
                  onChange={(e) => set({ headline: e.target.value })}
                  placeholder="Frontend Engineer · React & TypeScript"
                />
              </Field>
              <Field label="Email">
                <input
                  className="field"
                  type="email"
                  value={resume.email}
                  onChange={(e) => set({ email: e.target.value })}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Phone">
                <input
                  className="field"
                  value={resume.phone}
                  onChange={(e) => set({ phone: e.target.value })}
                  placeholder="+91 98200 11223"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Location">
                <input
                  className="field"
                  value={resume.location}
                  onChange={(e) => set({ location: e.target.value })}
                  placeholder="Mumbai, India"
                />
              </Field>
              <Field label="Portfolio / website">
                <input
                  className="field"
                  value={resume.website}
                  onChange={(e) => set({ website: e.target.value })}
                  placeholder="yourname.dev"
                />
              </Field>
            </div>

            <div className="mt-4">
              <p className="field-label">Links</p>
              <div className="space-y-2">
                {resume.links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="field w-28 flex-none"
                      value={link.label}
                      placeholder="GitHub"
                      onChange={(e) => {
                        const links = [...resume.links];
                        links[index] = { ...link, label: e.target.value };
                        set({ links });
                      }}
                      aria-label="Link label"
                    />
                    <input
                      className="field flex-1"
                      value={link.url}
                      placeholder="github.com/you"
                      onChange={(e) => {
                        const links = [...resume.links];
                        links[index] = { ...link, url: e.target.value };
                        set({ links });
                      }}
                      aria-label="Link URL"
                    />
                    <button
                      className="btn btn-icon flex-none"
                      aria-label="Remove link"
                      onClick={() => set({ links: resume.links.filter((_, i) => i !== index) })}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-ghost btn-sm mt-2 -ml-2"
                onClick={() => set({ links: [...resume.links, { label: "", url: "" }] })}
              >
                <Plus size={13} /> Add link
              </button>
            </div>
          </Section>

          <Section
            id="summary"
            title="Summary"
            hint="Three or four sentences, one concrete result"
            complete={wordCount >= 35}
            open={openSections.includes("summary")}
            onToggle={toggleSection}
          >
            <textarea
              className="field"
              rows={6}
              value={resume.summary}
              onChange={(e) => set({ summary: e.target.value })}
              placeholder="What you do, how long you've done it, and one measurable thing you're proud of."
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span
                className={cn(
                  "text-[11.5px]",
                  wordCount >= 35 && wordCount <= 110
                    ? "text-[var(--color-green)]"
                    : "text-[var(--color-muted)]"
                )}
              >
                {wordCount} words{wordCount < 35 ? " · aim for 35–110" : wordCount > 110 ? " · trim to 110" : ""}
              </span>
              <button className="btn btn-accent btn-sm" onClick={suggestSummary}>
                <Sparkles size={13} /> Draft it for me
              </button>
            </div>
          </Section>

          <Section
            id="experience"
            title="Experience"
            hint="Most recent first. Bullets with numbers win."
            complete={resume.experience.some((e) => e.bullets.filter((b: string) => b.trim()).length >= 3)}
            open={openSections.includes("experience")}
            onToggle={toggleSection}
            count={resume.experience.length}
          >
            <div className="space-y-3">
              {resume.experience.map((exp, index) => (
                <div key={exp.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]/60 p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="mono text-[10.5px] uppercase tracking-wider text-[var(--color-muted)]">
                      Role {index + 1}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <IconBtn
                        label="Move up"
                        disabled={index === 0}
                        onClick={() => set({ experience: move(resume.experience, index, index - 1) })}
                      >
                        <ArrowUp size={13} />
                      </IconBtn>
                      <IconBtn
                        label="Move down"
                        disabled={index === resume.experience.length - 1}
                        onClick={() => set({ experience: move(resume.experience, index, index + 1) })}
                      >
                        <ArrowDown size={13} />
                      </IconBtn>
                      <IconBtn
                        label="Delete role"
                        onClick={() => set({ experience: resume.experience.filter((e) => e.id !== exp.id) })}
                      >
                        <Trash2 size={13} />
                      </IconBtn>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      className="field"
                      placeholder="Job title"
                      value={exp.role}
                      aria-label="Job title"
                      onChange={(e) => updateExperience(set, resume, exp.id, { role: e.target.value })}
                    />
                    <input
                      className="field"
                      placeholder="Company"
                      value={exp.company}
                      aria-label="Company"
                      onChange={(e) => updateExperience(set, resume, exp.id, { company: e.target.value })}
                    />
                    <input
                      className="field"
                      placeholder="Location (or Remote)"
                      value={exp.location}
                      aria-label="Location"
                      onChange={(e) => updateExperience(set, resume, exp.id, { location: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        className="field"
                        placeholder="Start (2022-06)"
                        value={exp.start}
                        aria-label="Start date"
                        onChange={(e) => updateExperience(set, resume, exp.id, { start: e.target.value })}
                      />
                      <input
                        className="field"
                        placeholder="End"
                        value={exp.current ? "" : exp.end}
                        disabled={exp.current}
                        aria-label="End date"
                        onChange={(e) => updateExperience(set, resume, exp.id, { end: e.target.value })}
                      />
                    </div>
                  </div>
                  <label className="mt-2 flex w-max cursor-pointer items-center gap-2 text-[12px] text-[var(--color-ink-soft)]">
                    <input
                      type="checkbox"
                      className="check h-[15px] w-[15px]"
                      checked={exp.current}
                      onChange={(e) =>
                        updateExperience(set, resume, exp.id, { current: e.target.checked })
                      }
                    />
                    I currently work here
                  </label>

                  <div className="mt-3">
                    <p className="field-label">Bullets</p>
                    <div className="space-y-1.5">
                      {exp.bullets.map((bullet, bIndex) => (
                        <div key={bIndex} className="flex items-start gap-1.5">
                          <span className="mt-2.5 h-1.5 w-1.5 flex-none rounded-full bg-[var(--color-line-strong)]" />
                          <textarea
                            className="field min-h-[38px] flex-1 py-2 text-[13px]"
                            rows={1}
                            value={bullet}
                            placeholder="Reduced checkout errors by 30% by…"
                            aria-label={`Bullet ${bIndex + 1}`}
                            onChange={(e) => {
                              const bullets = [...exp.bullets];
                              bullets[bIndex] = e.target.value;
                              updateExperience(set, resume, exp.id, { bullets });
                            }}
                          />
                          <button
                            className="btn btn-icon mt-0.5 flex-none !p-1.5"
                            aria-label="Remove bullet"
                            onClick={() =>
                              updateExperience(set, resume, exp.id, {
                                bullets: exp.bullets.filter((_, i) => i !== bIndex),
                              })
                            }
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      className="btn btn-ghost btn-sm mt-1.5 -ml-2"
                      onClick={() =>
                        updateExperience(set, resume, exp.id, { bullets: [...exp.bullets, ""] })
                      }
                    >
                      <Plus size={13} /> Add bullet
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn btn-outline btn-sm mt-3"
              onClick={() => set({ experience: [...resume.experience, newExperience()] })}
            >
              <Plus size={13} /> Add role
            </button>
          </Section>

          <Section
            id="projects"
            title="Projects"
            hint="Especially useful early in a career"
            complete={resume.projects.some((p) => p.name)}
            open={openSections.includes("projects")}
            onToggle={toggleSection}
            count={resume.projects.length}
          >
            <div className="space-y-3">
              {resume.projects.map((project, index) => (
                <div key={project.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]/60 p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="mono text-[10.5px] uppercase tracking-wider text-[var(--color-muted)]">
                      Project {index + 1}
                    </span>
                    <IconBtn
                      label="Delete project"
                      onClick={() => set({ projects: resume.projects.filter((p) => p.id !== project.id) })}
                    >
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      className="field"
                      placeholder="Project name"
                      value={project.name}
                      aria-label="Project name"
                      onChange={(e) => updateProject(set, resume, project.id, { name: e.target.value })}
                    />
                    <input
                      className="field"
                      placeholder="Link"
                      value={project.link}
                      aria-label="Project link"
                      onChange={(e) => updateProject(set, resume, project.id, { link: e.target.value })}
                    />
                  </div>
                  <textarea
                    className="field mt-2.5"
                    rows={2}
                    placeholder="What it does and one result (users, stars, time saved)."
                    value={project.description}
                    aria-label="Project description"
                    onChange={(e) => updateProject(set, resume, project.id, { description: e.target.value })}
                  />
                  <input
                    className="field mt-2.5"
                    placeholder="Tech used — React, Node, Postgres"
                    value={project.tech}
                    aria-label="Project tech"
                    onChange={(e) => updateProject(set, resume, project.id, { tech: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <button
              className="btn btn-outline btn-sm mt-3"
              onClick={() => set({ projects: [...resume.projects, newProject()] })}
            >
              <Plus size={13} /> Add project
            </button>
          </Section>

          <Section
            id="education"
            title="Education"
            hint="Degree, school, years"
            complete={resume.education.some((e) => e.school || e.degree)}
            open={openSections.includes("education")}
            onToggle={toggleSection}
            count={resume.education.length}
          >
            <div className="space-y-3">
              {resume.education.map((edu, index) => (
                <div key={edu.id} className="rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)]/60 p-3.5">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="mono text-[10.5px] uppercase tracking-wider text-[var(--color-muted)]">
                      Education {index + 1}
                    </span>
                    <IconBtn
                      label="Delete education"
                      onClick={() => set({ education: resume.education.filter((e) => e.id !== edu.id) })}
                    >
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      className="field"
                      placeholder="School or university"
                      value={edu.school}
                      aria-label="School"
                      onChange={(e) => updateEducation(set, resume, edu.id, { school: e.target.value })}
                    />
                    <input
                      className="field"
                      placeholder="Degree (B.E., B.Sc.)"
                      value={edu.degree}
                      aria-label="Degree"
                      onChange={(e) => updateEducation(set, resume, edu.id, { degree: e.target.value })}
                    />
                    <input
                      className="field"
                      placeholder="Field of study"
                      value={edu.field}
                      aria-label="Field"
                      onChange={(e) => updateEducation(set, resume, edu.id, { field: e.target.value })}
                    />
                    <div className="flex items-center gap-2">
                      <input
                        className="field"
                        placeholder="From"
                        value={edu.start}
                        aria-label="Start year"
                        onChange={(e) => updateEducation(set, resume, edu.id, { start: e.target.value })}
                      />
                      <input
                        className="field"
                        placeholder="To"
                        value={edu.end}
                        aria-label="End year"
                        onChange={(e) => updateEducation(set, resume, edu.id, { end: e.target.value })}
                      />
                    </div>
                  </div>
                  <input
                    className="field mt-2.5"
                    placeholder="Detail — 8.4 CGPA, first class, relevant coursework"
                    value={edu.detail}
                    aria-label="Education detail"
                    onChange={(e) => updateEducation(set, resume, edu.id, { detail: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <button
              className="btn btn-outline btn-sm mt-3"
              onClick={() => set({ education: [...resume.education, newEducation()] })}
            >
              <Plus size={13} /> Add education
            </button>
          </Section>

          <Section
            id="skills"
            title="Skills"
            hint="Eight or more, matching the roles you target"
            complete={resume.skills.length >= 8}
            open={openSections.includes("skills")}
            onToggle={toggleSection}
            count={resume.skills.length}
          >
            <SkillsInput
              skills={resume.skills}
              onChange={(skills) => set({ skills })}
            />
          </Section>

          <Section
            id="extras"
            title="Certifications & design"
            hint="Optional extras and how the page looks"
            complete
            open={openSections.includes("extras")}
            onToggle={toggleSection}
            count={resume.certifications.length}
          >
            <div className="space-y-2">
              {resume.certifications.map((cert) => (
                <div key={cert.id} className="flex gap-2">
                  <input
                    className="field flex-1"
                    placeholder="Certification name"
                    value={cert.name}
                    aria-label="Certification name"
                    onChange={(e) =>
                      set({
                        certifications: resume.certifications.map((c) =>
                          c.id === cert.id ? { ...c, name: e.target.value } : c
                        ),
                      })
                    }
                  />
                  <input
                    className="field w-32 flex-none"
                    placeholder="Issuer"
                    value={cert.issuer}
                    aria-label="Issuer"
                    onChange={(e) =>
                      set({
                        certifications: resume.certifications.map((c) =>
                          c.id === cert.id ? { ...c, issuer: e.target.value } : c
                        ),
                      })
                    }
                  />
                  <input
                    className="field w-20 flex-none"
                    placeholder="Year"
                    value={cert.year}
                    aria-label="Year"
                    onChange={(e) =>
                      set({
                        certifications: resume.certifications.map((c) =>
                          c.id === cert.id ? { ...c, year: e.target.value } : c
                        ),
                      })
                    }
                  />
                  <button
                    className="btn btn-icon flex-none"
                    aria-label="Remove certification"
                    onClick={() =>
                      set({ certifications: resume.certifications.filter((c) => c.id !== cert.id) })
                    }
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn-ghost btn-sm mt-1.5 -ml-2"
              onClick={() => set({ certifications: [...resume.certifications, newCertification()] })}
            >
              <Plus size={13} /> Add certification
            </button>

            <div className="mt-5 border-t border-dashed border-[var(--color-line)] pt-4">
              <p className="field-label">Template</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => set({ template: template.id })}
                    className={cn(
                      "rounded-xl border p-2.5 text-left transition-colors",
                      resume.template === template.id
                        ? "border-[var(--color-ink)] bg-[var(--color-paper-2)]"
                        : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                    )}
                  >
                    <span className="block text-[12.5px] font-medium">{template.name}</span>
                    <span className="mt-0.5 block text-[10.5px] leading-snug text-[var(--color-muted)]">
                      {template.blurb}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <p className="field-label mb-0">Text size</p>
                  <span className="mono text-[11px]">{Math.round(resume.fontScale * 100)}%</span>
                </div>
                <input
                  type="range"
                  className="range mt-2"
                  min={0.9}
                  max={1.12}
                  step={0.02}
                  value={resume.fontScale}
                  onChange={(e) => set({ fontScale: Number(e.target.value) })}
                  aria-label="Text size"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 border-t border-dashed border-[var(--color-line)] pt-4">
              <button className="btn btn-ghost btn-sm" onClick={() => setImportOpen(true)}>
                <FileText size={13} /> Paste JSON
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  set({ ...exampleResume(), fullName: resume.fullName, email: resume.email });
                  toast("Example content loaded into your template", "info");
                }}
              >
                <Wand2 size={13} /> Fill with example
              </button>
            </div>
          </Section>
        </div>

        {/* preview + ATS */}
        <div className={cn("min-w-0", mobileView === "edit" && "hidden lg:block")}>
          <div className="lg:sticky lg:top-24">
            <div className="flex items-center justify-between pb-2">
              <p className="eyebrow flex items-center gap-1.5">
                <FileText size={12} /> Live preview
              </p>
              <div className="flex items-center gap-1">
                <button className="btn btn-ghost btn-sm" onClick={printResume}>
                  <Printer size={13} /> Print
                </button>
                <button className="btn btn-ghost btn-sm" onClick={openShare}>
                  <Link2 size={13} /> Link
                </button>
              </div>
            </div>
            <div className="resume-stage max-h-[70vh] overflow-y-auto scroll-thin">
              {resume.fullName || resume.summary || resume.experience.length ? (
                <ResumePreview resume={resume} />
              ) : (
                <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)] p-6 text-center">
                  <FileText size={24} className="text-[var(--color-line-strong)]" />
                  <p className="text-[13px] font-medium">Your résumé appears here</p>
                  <p className="max-w-[240px] text-[12px] leading-relaxed text-[var(--color-muted)]">
                    Start with your name and headline — the preview updates as you type.
                  </p>
                  <button className="btn btn-accent btn-sm" onClick={loadExample}>
                    <Wand2 size={13} /> See a filled example
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1.5 text-center text-[10.5px] text-[var(--color-muted)] lg:hidden">
              Scaled to fit — export the PDF for the real thing.
            </p>

            <div className="mt-3 rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
              <div className="flex items-center justify-between">
                <p className="eyebrow">ATS check</p>
                <Badge tone={score >= 80 ? "green" : score >= 55 ? "amber" : "coral"}>
                  {score >= 80 ? "Strong" : score >= 55 ? "Needs work" : "Getting started"}
                </Badge>
              </div>
              <ul className="mt-3 space-y-2">
                {checks.map((check) => (
                  <li key={check.id} className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full",
                        check.ok ? "bg-[#157f4a] text-white" : "bg-[var(--color-paper-3)] text-[var(--color-muted)]"
                      )}
                    >
                      {check.ok ? <Check size={10} strokeWidth={3} /> : <X size={9} />}
                    </span>
                    <div>
                      <p className={cn("text-[12px] leading-snug", check.ok ? "text-[var(--color-ink-soft)]" : "font-medium")}>
                        {check.label}
                      </p>
                      {!check.ok && (
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--color-muted)]">{check.hint}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this résumé"
        description="A read-only page. The résumé is encoded inside the link itself — no server, no account, and you can revoke it by simply not sharing it."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShareOpen(false)}>
              Close
            </button>
            <button
              className="btn btn-outline"
              onClick={async () => {
                const ok = await copyText(shareUrl);
                toast(ok ? "Share link copied" : "Couldn't copy — select it manually", ok ? "success" : "error");
              }}
            >
              Copy link
            </button>
            <a className="btn btn-primary" href={`#/r/${shareUrl.split("#/r/")[1] ?? ""}`} target="_blank" rel="noreferrer">
              Open preview <Link2 size={14} />
            </a>
          </>
        }
      >
        <textarea
          readOnly
          className="field h-28 font-mono text-[11px]"
          value={shareUrl}
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          aria-label="Share link"
        />
        <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--color-muted)]">
          {shareUrl.length.toLocaleString()} characters. Anyone with this link can read the résumé
          details above. Don't post it publicly if it includes your phone number.
        </p>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Paste résumé JSON"
        description="Export from this app earlier, or from another tool that produces the same shape."
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => importJson(importText)} disabled={!importText.trim()}>
              Import
            </button>
          </>
        }
      >
        <textarea
          className="field h-40 font-mono text-[11px]"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{ "fullName": "…" }'
          aria-label="Résumé JSON"
        />
      </Modal>

      <PrintSheet resume={resume} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

type SetFn = (patch: Partial<Resume>) => void;

function updateExperience(
  set: SetFn,
  resume: Resume,
  id: string,
  patch: Partial<Resume["experience"][number]>
) {
  set({
    experience: resume.experience.map((exp) => (exp.id === id ? { ...exp, ...patch } : exp)),
  });
}

function updateProject(set: SetFn, resume: Resume, id: string, patch: Partial<Resume["projects"][number]>) {
  set({ projects: resume.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
}

function updateEducation(set: SetFn, resume: Resume, id: string, patch: Partial<Resume["education"][number]>) {
  set({ education: resume.education.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}

function IconBtn({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="btn btn-icon !border-transparent !bg-transparent !p-1.5 text-[var(--color-muted)] hover:!bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Section({
  id,
  title,
  hint,
  complete,
  open,
  onToggle,
  count,
  children,
}: {
  id: SectionId;
  title: string;
  hint: string;
  complete: boolean;
  open: boolean;
  onToggle: (id: SectionId) => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]">
      <button
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => onToggle(id)}
        aria-expanded={open}
      >
        <span
          className={cn(
            "grid h-5 w-5 flex-none place-items-center rounded-full border",
            complete
              ? "border-[var(--color-green)] bg-[var(--color-green)] text-white"
              : "border-[var(--color-line-strong)] text-[var(--color-line-strong)]"
          )}
        >
          {complete ? <Check size={11} strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
        </span>
        <span className="flex-1">
          <span className="flex items-center gap-1.5 text-[14px] font-medium">
            {title}
            {typeof count === "number" && count > 0 && (
              <span className="mono rounded bg-[var(--color-paper-2)] px-1.5 text-[10px] text-[var(--color-muted)]">
                {count}
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-[11.5px] text-[var(--color-muted)]">{hint}</span>
        </span>
        <ChevronDown
          size={16}
          className={cn("flex-none text-[var(--color-muted)] transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="border-t border-[var(--color-line)] px-4 py-4">{children}</div>}
    </section>
  );
}

function SkillsInput({ skills, onChange }: { skills: string[]; onChange: (skills: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const suggestions = ALL_SKILLS.filter((s) => !skills.includes(s)).slice(0, 10);

  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...skills, trimmed]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-2">
        {skills.map((skill) => (
          <span
            key={skill}
            className="badge badge-neutral !py-1 !pl-2.5 !pr-1.5 !text-[12px]"
          >
            {skill}
            <button
              onClick={() => onChange(skills.filter((s) => s !== skill))}
              aria-label={`Remove ${skill}`}
              className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--color-paper-3)]"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className="min-w-[120px] flex-1 border-none bg-transparent px-1 py-1 text-[13px] outline-none"
          value={draft}
          placeholder={skills.length ? "Add a skill…" : "Type a skill and press Enter"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            }
            if (e.key === "Backspace" && !draft && skills.length) {
              onChange(skills.slice(0, -1));
            }
          }}
          onBlur={() => add(draft)}
          aria-label="Add skill"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1.5 text-[11px] text-[var(--color-muted)]">Common in postings:</p>
          <div className="flex flex-wrap gap-1">
            {suggestions.map((skill) => (
              <button key={skill} className="chip !py-1 !text-[11.5px]" onClick={() => add(skill)}>
                <Plus size={10} /> {skill}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
