import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, Info, X } from "lucide-react";
import { useWorkspace } from "../lib/store";
import { cn } from "../lib/utils";

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTarget = panelRef.current?.querySelector<HTMLElement>(
      "[data-autofocus], input, textarea, button"
    );
    setTimeout(() => focusTarget?.focus(), 40);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-sm", md: "max-w-xl", lg: "max-w-3xl" }[size];

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6"
      role="presentation"
    >
      <div className="modal-backdrop absolute inset-0 animate-fade" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "modal-panel relative w-full overflow-hidden rounded-t-2xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl sm:rounded-2xl",
          widths
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-[17px] font-semibold tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted)]">
                {description}
              </p>
            )}
          </div>
          <button className="btn btn-icon -mr-1 -mt-1" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[62vh] overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--color-line)] bg-[var(--color-paper)]/60 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */
const badgeTone: Record<string, string> = {
  neutral: "badge-neutral",
  lime: "badge-lime",
  green: "badge-green",
  amber: "badge-amber",
  coral: "badge-coral",
  blue: "badge-blue",
  violet: "badge-violet",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTone;
  className?: string;
}) {
  return <span className={cn("badge", badgeTone[tone], className)}>{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */
export function PageHeader({
  index,
  eyebrow,
  title,
  description,
  actions,
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 border-b border-[var(--color-line)] pb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {(index || eyebrow) && (
          <div className="eyebrow mb-3 flex items-center gap-2">
            {index && <span className="text-[var(--color-ink)]">{index}</span>}
            {index && eyebrow && <span className="h-px w-6 bg-[var(--color-line-strong)]" />}
            {eyebrow}
          </div>
        )}
        <h1 className="display text-[38px] leading-[1.02] sm:text-[46px]">{title}</h1>
        {description && (
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-[var(--color-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface)]/60 px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-[var(--color-paper-2)] text-[var(--color-ink-soft)]">
          {icon}
        </div>
      )}
      <h3 className="text-[16px] font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-[13.5px] leading-relaxed text-[var(--color-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Progress ring                                                       */
/* ------------------------------------------------------------------ */
export function Ring({
  value,
  size = 44,
  label,
  color,
}: {
  value: number;
  size?: number;
  label?: string;
  color?: string;
}) {
  const tone = color ?? (value >= 75 ? "#157f4a" : value >= 45 ? "#b45309" : "#b42318");
  return (
    <div
      className="ring"
      style={
        {
          "--value": value,
          "--size": `${size}px`,
          "--ring-color": tone,
        } as React.CSSProperties
      }
      aria-label={label ?? `${value}%`}
      role="img"
    >
      <span>{label ?? `${value}`}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */
export function Toasts() {
  const { toasts, dismissToast } = useWorkspace();
  if (!toasts.length) return null;
  return createPortal(
    <div className="pointer-events-none fixed bottom-20 left-1/2 z-[80] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-[var(--color-line-strong)] bg-[var(--color-ink)] px-4 py-3 text-[13px] text-[var(--color-paper)] shadow-xl"
          role="status"
        >
          <span className="mt-0.5 flex-none">
            {toast.tone === "success" ? (
              <Check size={15} className="text-[var(--color-lime)]" />
            ) : toast.tone === "error" ? (
              <AlertCircle size={15} className="text-[#ff9a85]" />
            ) : (
              <Info size={15} className="text-[var(--color-paper-3)]" />
            )}
          </span>
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="flex-none text-[var(--color-paper-3)] hover:text-white"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* Field                                                               */
/* ------------------------------------------------------------------ */
export function Field({
  label,
  hint,
  children,
  htmlFor,
  className,
}: {
  label?: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-full border border-[var(--color-line)] bg-[var(--color-paper-2)] p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "rounded-full font-medium transition-colors",
            size === "sm" ? "px-3 py-1.5 text-[12px]" : "px-4 py-1.5 text-[13px]",
            value === option.value
              ? "bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm"
              : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
