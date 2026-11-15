"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X, Loader2, ArrowRight, BookOpen, Sparkles } from "lucide-react";
export function Button({
  children,
  variant = "",
  className = "",
  busy = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: string;
  busy?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      aria-busy={busy || undefined}
      className={`btn ${variant} ${className}`}
    >
      {busy ? <Loader2 size={17} className="spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      type="button"
      className={`icon-btn ${props.className || ""}`}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="modal-title"
    >
      <div className="modal-head">
        <div>
          <h2 id="modal-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <IconButton label="Close dialog" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon || <BookOpen size={27} />}</div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Progress({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`progress ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, Math.min(100, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Ring({
  value,
  size = 106,
  children,
}: {
  value: number;
  size?: number;
  children?: ReactNode;
}) {
  const r = 44,
    c = 2 * Math.PI * r;
  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} className="ring-track" />
        <circle
          cx="50"
          cy="50"
          r={r}
          className="ring-value"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
        />
      </svg>
      <div>{children}</div>
    </div>
  );
}
export function SectionTitle({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
export function ForgeMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`forge-mark ${small ? "small" : ""}`}>
      <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect
          x="5"
          y="8"
          width="17"
          height="21"
          rx="3"
          transform="rotate(-10 5 8)"
          fill="currentColor"
          opacity=".4"
        />
        <rect x="10" y="4" width="17" height="22" rx="3" fill="currentColor" />
        <path
          d="M15 10h7M15 14h5M15 18h3"
          stroke="var(--primary)"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
const SWATCHES = ["cobalt", "vermilion", "mustard", "fern"] as const;
export type Swatch = (typeof SWATCHES)[number];
/**
 * The color-block a deck is drawn in. It follows the color the user picked for
 * the deck (nearest of the four theme swatches by hue), and falls back to a
 * stable hash of the id when the color is missing or unreadable.
 */
export function deckSwatch(deck: { id: string; color?: string }): Swatch {
  const hex = /^#?([0-9a-f]{6})$/i.exec(deck.color || "")?.[1];
  if (hex) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d > 0.04) {
      const h = (max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
      const hue = (h + 360) % 360;
      if (hue < 25 || hue >= 330) return "vermilion";
      if (hue < 65) return "mustard";
      if (hue < 190) return "fern";
      return "cobalt";
    }
  }
  let n = 0;
  for (let i = 0; i < deck.id.length; i++) n = (n * 31 + deck.id.charCodeAt(i)) >>> 0;
  return SWATCHES[n % SWATCHES.length];
}
