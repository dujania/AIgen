import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Application,
  ApplicationStatus,
  Job,
  JobSnapshot,
  Resume,
  TrackEvent,
  TrackEventName,
  WorkspaceState,
} from "./types";
import { emptyResume, encodePayload, decodePayload, exampleResume } from "./resume";
import { getIdentity, sendTelemetry, type Identity } from "./track";
import { todayISO, uid } from "./utils";

const STORAGE_KEY = "openrole.workspace.v2";

export type Toast = {
  id: string;
  message: string;
  tone: "success" | "info" | "error";
};

type Ctx = {
  state: WorkspaceState;
  identity: Identity;
  resume: Resume;
  applications: Application[];
  savedJobs: string[];
  events: TrackEvent[];
  updateResume: (updater: Partial<Resume> | ((current: Resume) => Resume)) => void;
  track: (name: TrackEventName, props?: Record<string, string | number | boolean>) => void;
  clearEvents: () => void;
  updatePrefs: (patch: Partial<WorkspaceState["prefs"]>) => void;
  isSaved: (id: string) => boolean;
  toggleSave: (job: Job) => void;
  applyToJob: (job: Job, coverLetter: string) => Application;
  updateApplication: (id: string, patch: Partial<Application>) => void;
  moveApplication: (id: string, status: ApplicationStatus) => void;
  removeApplication: (id: string) => void;
  getApplication: (jobId: string) => Application | undefined;
  toast: (message: string, tone?: Toast["tone"]) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  resetWorkspace: () => void;
  exportWorkspace: () => Promise<string>;
  importWorkspace: (code: string) => Promise<{ ok: boolean; error?: string }>;
  loadExample: () => void;
  replaceResume: (resume: Resume) => void;
};

const WorkspaceContext = createContext<Ctx | null>(null);

function defaultState(): WorkspaceState {
  return {
    version: 2,
    resume: emptyResume(),
    applications: [],
    savedJobs: [],
    events: [],
    prefs: { showSampleJobs: true, lastVisited: todayISO() },
  };
}

function normalizeState(raw: unknown): WorkspaceState {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<WorkspaceState>;
  const incoming = (value.resume ?? {}) as Partial<Resume>;
  const list = <T,>(input: unknown): T[] => (Array.isArray(input) ? (input as T[]) : []);

  return {
    ...base,
    ...value,
    version: 2,
    resume: {
      ...base.resume,
      ...incoming,
      links: list(incoming.links),
      experience: list<Resume["experience"][number]>(incoming.experience).map((exp) => ({
        ...exp,
        bullets: list<string>(exp?.bullets),
      })),
      education: list(incoming.education),
      projects: list(incoming.projects),
      skills: list(incoming.skills),
      certifications: list(incoming.certifications),
    },
    prefs: { ...base.prefs, ...(value.prefs ?? {}) },
    applications: list<Application>(value.applications)
      .filter((application) => application && application.job)
      .map((application) => ({
        ...application,
        timeline: list(application.timeline),
        notes: application.notes ?? "",
        coverLetter: application.coverLetter ?? "",
      })),
    savedJobs: list<string>(value.savedJobs),
    events: list<TrackEvent>(value.events).slice(-400),
  };
}

function loadState(): WorkspaceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultState();
  }
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WorkspaceState>(loadState);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const identity = useMemo(() => getIdentity(), []);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* quota or private mode — ignore */
      }
    }, 200);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [state]);

  useEffect(() => {
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [state]);

  const toast = useCallback((message: string, tone: Toast["tone"] = "success") => {
    const item: Toast = { id: uid("toast"), message, tone };
    setToasts((prev) => [...prev.slice(-3), item]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== item.id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const track = useCallback(
    (name: TrackEventName, props?: Record<string, string | number | boolean>) => {
      const event: TrackEvent = { id: uid("evt"), at: todayISO(), name, props };
      setState((prev) => ({
        ...prev,
        events: [...prev.events, event].slice(-400),
      }));
      sendTelemetry(name, props ?? {});
    },
    []
  );

  const updateResume = useCallback(
    (updater: Partial<Resume> | ((current: Resume) => Resume)) => {
      setState((prev) => ({
        ...prev,
        resume:
          typeof updater === "function"
            ? updater(prev.resume)
            : { ...prev.resume, ...updater },
      }));
    },
    []
  );

  const replaceResume = useCallback((resume: Resume) => {
    setState((prev) => ({ ...prev, resume }));
  }, []);

  const updatePrefs = useCallback((patch: Partial<WorkspaceState["prefs"]>) => {
    setState((prev) => ({ ...prev, prefs: { ...prev.prefs, ...patch } }));
  }, []);

  const clearEvents = useCallback(() => {
    setState((prev) => ({ ...prev, events: [] }));
  }, []);

  const isSaved = useCallback(
    (id: string) => state.savedJobs.includes(id),
    [state.savedJobs]
  );

  const toggleSave = useCallback(
    (job: Job) => {
      const wasSaved = state.savedJobs.includes(job.id);
      setState((prev) => ({
        ...prev,
        savedJobs: prev.savedJobs.includes(job.id)
          ? prev.savedJobs.filter((id) => id !== job.id)
          : [...prev.savedJobs, job.id],
      }));
      track("job_save", { jobId: job.id, jobTitle: job.title, saved: !wasSaved });
      toast(wasSaved ? "Removed from saved jobs" : "Saved to your shortlist", wasSaved ? "info" : "success");
    },
    [state.savedJobs, track, toast]
  );

  const getApplication = useCallback(
    (jobId: string) => state.applications.find((a) => a.job.id === jobId),
    [state.applications]
  );

  const applyToJob = useCallback(
    (job: Job, coverLetter: string) => {
      const snapshot: JobSnapshot = {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        mode: job.mode,
        type: job.type,
        logo: job.logo,
        color: job.color,
        applyUrl: job.applyUrl,
        source: job.source,
      };
      const now = todayISO();
      const existing = state.applications.find((a) => a.job.id === job.id);
      const application: Application = existing
        ? {
            ...existing,
            status: existing.status === "saved" ? "applied" : existing.status,
            appliedAt: existing.appliedAt ?? now,
            updatedAt: now,
            coverLetter,
            timeline: [
              ...existing.timeline,
              { id: uid("tl"), at: now, label: "Application updated" },
            ],
          }
        : {
            id: uid("app"),
            job: snapshot,
            status: "applied",
            createdAt: now,
            updatedAt: now,
            appliedAt: now,
            coverLetter,
            notes: "",
            timeline: [
              { id: uid("tl"), at: now, label: "Application started" },
              { id: uid("tl"), at: now, label: "Marked as applied" },
            ],
          };

      setState((prev) => ({
        ...prev,
        applications: existing
          ? prev.applications.map((a) => (a.id === application.id ? application : a))
          : [application, ...prev.applications],
        savedJobs: prev.savedJobs.includes(job.id) ? prev.savedJobs : [...prev.savedJobs, job.id],
        events: [
          ...prev.events,
          {
            id: uid("evt"),
            at: now,
            name: "apply_submit" as TrackEventName,
            props: { jobId: job.id, company: job.company, role: job.title },
          },
        ].slice(-400),
      }));
      sendTelemetry("apply_submit", { jobId: job.id, title: job.title });
      return application;
    },
    [state.applications, state.savedJobs]
  );

  const updateApplication = useCallback(
    (id: string, patch: Partial<Application>) => {
      setState((prev) => ({
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === id ? { ...a, ...patch, updatedAt: todayISO() } : a
        ),
      }));
    },
    []
  );

  const moveApplication = useCallback(
    (id: string, status: ApplicationStatus) => {
      const now = todayISO();
      setState((prev) => ({
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === id
            ? {
                ...a,
                status,
                updatedAt: now,
                appliedAt: a.appliedAt ?? (status !== "saved" ? now : undefined),
                timeline: [
                  ...a.timeline,
                  { id: uid("tl"), at: now, label: `Moved to ${STATUS_LABEL[status]}` },
                ],
              }
            : a
        ),
        events: [
          ...prev.events,
          {
            id: uid("evt"),
            at: now,
            name: "status_change" as TrackEventName,
            props: { applicationId: id, status },
          },
        ].slice(-400),
      }));
    },
    []
  );

  const removeApplication = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      applications: prev.applications.filter((a) => a.id !== id),
    }));
  }, []);

  const resetWorkspace = useCallback(() => {
    setState(defaultState());
    toast("Workspace cleared from this device", "info");
  }, [toast]);

  const exportWorkspace = useCallback(async () => {
    const code = await encodePayload({ ...state, exportedAt: todayISO() });
    track("workspace_export");
    return code;
  }, [state, track]);

  const importWorkspace = useCallback(
    async (code: string) => {
      try {
        const data = await decodePayload<Partial<WorkspaceState>>(code.trim());
        const next = normalizeState(data);
        setState(next);
        track("workspace_import");
        toast("Workspace restored from code", "success");
        return { ok: true };
      } catch {
        return { ok: false, error: "That code could not be read. Copy the whole string and try again." };
      }
    },
    [track, toast]
  );

  const loadExample = useCallback(() => {
    setState((prev) => ({ ...prev, resume: exampleResume() }));
    toast("Example résumé loaded — edit anything you like", "info");
  }, [toast]);

  const value: Ctx = {
    state,
    identity,
    resume: state.resume,
    applications: state.applications,
    savedJobs: state.savedJobs,
    events: state.events,
    updateResume,
    track,
    clearEvents,
    updatePrefs,
    isSaved,
    toggleSave,
    applyToJob,
    updateApplication,
    moveApplication,
    removeApplication,
    getApplication,
    toast,
    toasts,
    dismissToast,
    resetWorkspace,
    exportWorkspace,
    importWorkspace,
    loadExample,
    replaceResume,
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): Ctx {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}
