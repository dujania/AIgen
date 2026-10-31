# openrole

**Free job search, résumé builder and application tracker — with no signup and no login.**

openrole is a small, deliberately account-free job-hunting workspace. You search roles, write a
résumé that survives applicant tracking systems, generate a cover letter, and track every
application — all stored in your own browser. There is no server-side user record, no email
capture, and no paywall.

![stack](https://img.shields.io/badge/stack-React%2018%20%2B%20TypeScript%20%2B%20Vite-121317)
![data](https://img.shields.io/badge/data-local--first-d8fb4f)

---

## What's inside

### 01 · Search
- 42 curated roles across engineering, design, data, product, marketing, support, operations,
  finance and people — including fresher-friendly and internship listings.
- Filters for work mode, job type, seniority, category, minimum salary and posting age; sorts by
  résumé match, recency or salary.
- Quick search with `/` keyboard shortcut, saved-role shortlist, and shareable job links.
- **Live feed:** optionally pull 40 current remote listings from Remotive's public API, directly
  from your browser. Live roles are labelled and link to the original posting.
- Match scores are computed locally by comparing job skills/requirements against your résumé,
  including which skills are missing.

### 02 · Craft (résumé builder)
- Split editor / live A4 preview with three templates, six accent colours and a text-size control.
- Sections: basics and links, summary, experience with bullet editor and reordering, projects,
  education, skills (with suggestions), certifications.
- **ATS checklist** with weighted scoring and actionable fixes: contact details, quantified
  bullets, action verbs, summary length, keyword coverage, links and placeholder detection.
- **Tailoring mode:** open the builder from any job (`/resume?job=…`) to see the match score and
  add missing skills individually.
- Export a print-perfect PDF via the browser, export/import JSON, or copy a **read-only share
  link** — the résumé is compressed into the URL itself, so there is no server to leak it.
- Autosaves as you type (debounced) and survives a refresh.

### 03 · Track
- Kanban pipeline (Shortlisted → Applied → Interviewing → Offer → Closed) with drag-and-drop and
  a table view.
- Notes, follow-up dates surfaced at the top of the page, per-application timeline, stored cover
  letters, and shortlist of saved roles not yet applied to.

### 04 · Your data
- Anonymous identity card: random workspace ID, first-seen, visits, device, timezone, first-touch
  source (referrer/UTM), landing page.
- Your own funnel and a local activity log with CSV export.
- **Workspace backup code:** moves your entire workspace to another browser without an account.
- Clear-all controls, plus a plain-language explanation of exactly what is stored.

---

## How "no signup" tracking works

| Account-based job board | openrole |
| --- | --- |
| Email + password, marketing emails | Random `anon_…` ID in `localStorage` |
| Server session, account recovery emails | 30-minute session window, visit counts, return-rate |
| Cross-site cookies and pixels | No cookies, no third parties, no fingerprinting |
| Data behind a login you can lose | Portable compressed workspace code + readable local data |
| Résumé hosted on their server | Résumé encoded inside the share link you control |

Details:

1. **Anonymous ID** — a UUID created on first visit, stored in `localStorage`. It identifies a
   browser, not a person. Clearing site data resets it.
2. **Sessions** — a new session starts after 30 quiet minutes, which is what produces visit counts
   and "days known".
3. **First-touch attribution** — `utm_*` parameters and `document.referrer` are captured once and
   kept locally.
4. **Event log** — searches, role views, saves, applications, résumé edits and exports are stored
   in the same local workspace (last 400 events) and shown to you in *Your data*.
5. **Optional first-party analytics** — completely off unless you build with
   `VITE_TELEMETRY_URL`. When set, events are sent with `navigator.sendBeacon` using only the
   anonymous ID, event name, properties and timestamp. Nothing else.
6. **No third-party requests at runtime** beyond the optional Remotive job fetch and Google Fonts
   (both browser-direct), plus links you choose to open.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production bundle in dist/
npm run typecheck  # tsc --noEmit
```

### Optional analytics endpoint

```bash
VITE_TELEMETRY_URL="https://your-collector.example/events" npm run build
```

The collector should accept `POST` JSON bodies:

```json
{
  "id": "anon_9f3c…",
  "session": "sess_…",
  "name": "apply_submit",
  "props": { "jobId": "northwind-labs-frontend-engineer-react" },
  "at": "2026-10-30T10:00:00.000Z",
  "path": "#/jobs/northwind-labs-frontend-engineer-react"
}
```

Nothing is sent when the variable is unset. The app remains fully functional offline from a
local build apart from fonts and the optional live job feed.

---

## Project layout

```
src/
  App.tsx                 hash router + shell / shared résumé route
  components/
    Layout.tsx            header, nav, footer, mobile tabs, route tracking
    JobCard.tsx           role card with match ring + save
    ApplyDialog.tsx       cover letter generation + application tracking
    ResumePreview.tsx     A4 sheet, responsive scaling, print portal
    ui.tsx                modal, badges, toast, ring, segmented control
  data/jobs.ts            curated job dataset (42 roles)
  lib/
    types.ts              shared types
    store.tsx             workspace state, persistence, actions, toasts
    track.ts              anonymous identity, sessions, optional telemetry
    resume.ts             ATS scoring, job matching, cover letters, URL codec
    search.ts             filters, sorting, labels
    liveJobs.ts           Remotive fetch + session cache
    utils.ts              formatting, download, clipboard helpers
  pages/                  Dashboard, Jobs, JobDetail, Resume, Applications, Insights, Shared
```

### Data notes

- Curated listings are illustrative sample data written for this demo — treat details such as
  salary and team size as examples and verify anything you apply to.
- Live listings come from [Remotive](https://remotive.com) and always link back to the source.
- Share links and workspace codes contain the résumé/application text in compressed form. Anyone
  with the link can read it, so share deliberately.

---

## Live deployment

A production build is committed to `docs/` (relative asset paths, hash routing, `.nojekyll`), so
the app can be served from any static host without rewrite rules. Regenerate it any time with:

```bash
npm run build:pages   # build + sync dist/ into docs/
```

### GitHub Pages (this repo)

Pages for this repository is currently pointed at a different branch's `docs/` folder. To publish
openrole instead, a repo admin needs to change one setting:

1. **Settings → Pages → Build and deployment**
2. Source: **Deploy from a branch**
3. Branch: **`arena/cfc41448-aigen`**, folder **`/docs`** → **Save**

The app then goes live at <https://dujania.github.io/AIgen/> within a minute. After this branch is
merged, point the same setting at `main` + `/docs` so deployments follow the default branch.

> Note: the connected GitHub integration only has `pages=read`, and changing Pages settings
> requires `pages=write` + `administration=write`, so the app cannot flip this setting itself.

### Any other static host

| Host | Setup |
| --- | --- |
| Netlify | Import the repo (config in `netlify.toml`), or drag `dist/` into <https://app.netlify.com/drop> |
| Vercel | Import the repo — `vercel.json` pins the build and output directory |
| Cloudflare Pages | Build command `npm run build`, output directory `dist` |
| S3 / nginx / Apache | Upload `dist/`; no SPA rewrites needed because routing is hash-based (`#/jobs`) |
| Local | `npm run build && npx serve dist` |

The build has no server-side dependencies, no environment variables, and no database, so any
static file host will do. Free tiers on Netlify, Vercel and Cloudflare Pages are more than enough
for a personal job search.

> Lovable cannot host this codebase: its GitHub integration is export-only and does not support
> importing an existing repository, and its free plan builds projects from its own editor.

---

## Privacy in one line

Your résumé, saved roles and applications never leave the browser unless you explicitly copy a
share link, download a backup, or configure a telemetry endpoint.

Built with React 18, TypeScript, Vite 6, Tailwind CSS 4, and Lucide icons.
