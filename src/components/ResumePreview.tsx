import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Resume } from "../lib/types";

function monthLabel(value: string): string {
  if (!value) return "";
  // supports "2023-06" and free text like "Jun 2023"
  const match = /^(\d{4})-(\d{1,2})$/.exec(value);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
    return date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }
  return value;
}

export function ResumeSheet({ resume }: { resume: Resume }) {
  const contact = [
    resume.email,
    resume.phone,
    resume.location,
    resume.website,
    ...resume.links.map((l) => l.url),
  ].filter(Boolean);

  const templateClass =
    resume.template === "modern"
      ? "tpl-modern"
      : resume.template === "compact"
        ? "tpl-compact"
        : "tpl-classic";

  return (
    <article
      className={`resume-sheet ${templateClass}`}
      style={
        {
          "--rs-accent": resume.accent,
          fontSize: `${13 * (resume.fontScale || 1)}px`,
        } as React.CSSProperties
      }
      aria-label="Résumé preview"
    >
      <header>
        <h1 style={{ color: resume.template === "modern" ? resume.accent : undefined }}>
          {resume.fullName.trim() || "Your Name"}
        </h1>
        {resume.headline && (
          <p style={{ marginTop: 6, fontSize: "14px", color: "#3f434b" }}>{resume.headline}</p>
        )}
        {contact.length > 0 && (
          <div className="rs-contact" style={{ marginTop: 12 }}>
            {contact.map((item, index) => (
              <span key={`${item}-${index}`}>{item}</span>
            ))}
          </div>
        )}
      </header>

      {resume.summary.trim() && (
        <section className="rs-section">
          <div className="rs-rule" />
          <h2>Summary</h2>
          <p style={{ color: "#2c2f36" }}>{resume.summary}</p>
        </section>
      )}

      {resume.experience.some((e) => e.role || e.company) && (
        <section className="rs-section">
          <div className="rs-rule" />
          <h2>Experience</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {resume.experience
              .filter((e) => e.role || e.company)
              .map((exp) => (
                <div key={exp.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 12,
                    }}
                  >
                    <h3>
                      {exp.role || "Role"}
                      {exp.company && (
                        <span style={{ fontWeight: 400, color: "#5a5e67" }}>
                          {" "}
                          · {exp.company}
                        </span>
                      )}
                    </h3>
                    <span className="rs-meta">
                      {[monthLabel(exp.start), exp.current ? "Present" : monthLabel(exp.end)]
                        .filter(Boolean)
                        .join(" – ")}
                    </span>
                  </div>
                  {exp.location && (
                    <div style={{ fontSize: "11.5px", color: "#6b6f78", marginTop: 1 }}>
                      {exp.location}
                    </div>
                  )}
                  {exp.bullets.filter((b) => b.trim()).length > 0 && (
                    <ul>
                      {exp.bullets
                        .filter((b) => b.trim())
                        .map((bullet, i) => (
                          <li key={i}>{bullet}</li>
                        ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {resume.projects.some((p) => p.name || p.description) && (
        <section className="rs-section">
          <div className="rs-rule" />
          <h2>Projects</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {resume.projects
              .filter((p) => p.name || p.description)
              .map((project) => (
                <div key={project.id}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 12,
                    }}
                  >
                    <h3>
                      {project.name || "Project"}
                      {project.tech && (
                        <span style={{ fontWeight: 400, color: "#5a5e67" }}> · {project.tech}</span>
                      )}
                    </h3>
                    {project.link && <span className="rs-meta">{project.link}</span>}
                  </div>
                  {project.description && (
                    <p style={{ marginTop: 2, color: "#2c2f36" }}>{project.description}</p>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}

      {resume.education.some((e) => e.school || e.degree) && (
        <section className="rs-section">
          <div className="rs-rule" />
          <h2>Education</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {resume.education
              .filter((e) => e.school || e.degree)
              .map((edu) => (
                <div
                  key={edu.id}
                  style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                >
                  <div>
                    <h3>{[edu.degree, edu.field].filter(Boolean).join(" ") || edu.school}</h3>
                    <div style={{ fontSize: "11.5px", color: "#5a5e67" }}>
                      {[edu.school, edu.detail].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className="rs-meta">
                    {[edu.start, edu.end].filter(Boolean).join(" – ")}
                  </span>
                </div>
              ))}
          </div>
        </section>
      )}

      {resume.skills.length > 0 && (
        <section className="rs-section">
          <div className="rs-rule" />
          <h2>Skills</h2>
          <div>
            {resume.skills.map((skill) => (
              <span className="rs-skill" key={skill}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {resume.certifications.length > 0 && (
        <section className="rs-section">
          <div className="rs-rule" />
          <h2>Certifications</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {resume.certifications.map((cert) => (
              <div
                key={cert.id}
                style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
              >
                <span>
                  <strong style={{ fontWeight: 600 }}>{cert.name}</strong>
                  {cert.issuer && <span style={{ color: "#5a5e67" }}> · {cert.issuer}</span>}
                </span>
                <span className="rs-meta">{cert.year}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

export function ResumePreview({
  resume,
  maxScale = 1,
}: {
  resume: Resume;
  maxScale?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(1123 * 0.6);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const sheet = sheetRef.current;
    if (!wrapper || !sheet) return;

    const compute = () => {
      const width = wrapper.clientWidth;
      const next = Math.min(maxScale, width / 794);
      setScale(next);
      setHeight(sheet.scrollHeight * next);
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(wrapper);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [maxScale, resume]);

  return (
    <div ref={wrapperRef} className="relative w-full overflow-hidden" style={{ height }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 794,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div ref={sheetRef}>
          <ResumeSheet resume={resume} />
        </div>
      </div>
    </div>
  );
}

export function PrintSheet({ resume }: { resume: Resume }) {
  return createPortal(
    <div id="print-root" className="print-only" aria-hidden>
      <ResumeSheet resume={resume} />
    </div>,
    document.body
  );
}
