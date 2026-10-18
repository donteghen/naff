// Small styled building blocks shared by the three apps (server and client components).

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { OrderStatus } from "@/lib/constants";

type ButtonVariant = "primary" | "action" | "secondary" | "success" | "danger" | "ghost";
type ButtonSize = "lg" | "md" | "sm";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-navy text-white",
  action: "bg-amber text-navy",
  secondary: "bg-white text-navy shadow-[inset_0_0_0_2px_var(--color-field)]",
  success: "bg-green text-white",
  danger: "bg-white text-red shadow-[inset_0_0_0_2px_var(--color-red-tint)]",
  ghost: "bg-cloud/60 text-navy",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  lg: "min-h-14 rounded-2xl px-5 text-[17px] font-extrabold",
  md: "min-h-12 rounded-[14px] px-4 text-[15px] font-bold",
  sm: "min-h-11 rounded-xl px-3.5 text-sm font-bold",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "lg", extra = "") {
  return `press inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:bg-field disabled:text-muted disabled:shadow-none ${BUTTON_STYLES[variant]} ${BUTTON_SIZES[size]} ${extra}`;
}

export function Button({ variant = "primary", size = "lg", className = "", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ variant = "primary", size = "lg", className = "", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] ${className}`}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-xs font-extrabold tracking-wide text-muted uppercase">{children}</p>;
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl leading-tight font-extrabold md:text-[28px]">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const INPUT_BASE =
  "w-full min-h-12 rounded-[14px] border-2 bg-white px-3.5 py-2.5 text-base text-navy placeholder:text-faint outline-none transition focus:border-navy";

export function inputClass(hasError = false) {
  return `${INPUT_BASE} ${hasError ? "border-red bg-red-tint/40" : "border-field"}`;
}

/** Label + control + error. `error` is an already translated message. */
export function Field({ label, error, hint, children, className = "" }: { label: ReactNode; error?: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-bold">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-muted">{hint}</span>}
      {error && <span className="text-sm font-bold text-red">{error}</span>}
    </label>
  );
}

export type ChipTone = "amber" | "indigo" | "green" | "red" | "grey" | "navy";

const CHIP_STYLES: Record<ChipTone, string> = {
  amber: "bg-amber-soft text-amber-ink",
  indigo: "bg-indigo-tint text-indigo",
  green: "bg-green-tint text-green-ink",
  red: "bg-red-tint text-red-ink",
  grey: "bg-cloud text-muted",
  navy: "bg-navy text-white",
};

export function Chip({ tone, children, className = "" }: { tone: ChipTone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-[11px] py-[5px] text-[13px] font-bold whitespace-nowrap ${CHIP_STYLES[tone]} ${className}`}>{children}</span>;
}

/** The glyph shows how far along the journey the order is (brand design). */
const STATUS_GLYPHS: Record<OrderStatus, string> = {
  requested: "○",
  approved: "◔",
  assigned: "◔",
  driver_confirmed: "◑",
  picked_up: "◑",
  dropped_at_agency: "◕",
  in_transit: "◕",
  arrived_at_agency_b: "◕",
  collected_at_destination: "◕",
  delivered: "●",
  cancelled: "✕",
  failed: "!",
};

export function statusTone(status: OrderStatus): ChipTone {
  if (status === "requested") return "amber";
  if (status === "delivered") return "green";
  if (status === "failed") return "red";
  if (status === "cancelled") return "grey";
  return "indigo";
}

export function StatusChip({ status, label }: { status: OrderStatus; label: string }) {
  return (
    <Chip tone={statusTone(status)}>
      <span aria-hidden="true">{STATUS_GLYPHS[status]}</span>
      {label}
    </Chip>
  );
}

export function Notice({ tone, children, className = "" }: { tone: "error" | "success" | "warning" | "info"; children: ReactNode; className?: string }) {
  const styles = {
    error: "bg-red-tint text-red-ink",
    success: "bg-green-tint text-green-ink",
    warning: "bg-amber-soft text-navy",
    info: "bg-indigo-tint text-indigo",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm font-bold ${styles[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-6 py-10 text-center text-sm text-faint">{children}</div>;
}

/** Key figure card used on the dashboard and reports. */
export function StatCard({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: "red" | "green" | "amber" }) {
  const noteColor = tone === "red" ? "text-red" : tone === "green" ? "text-green-ink" : "text-amber-ink";
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)]">
      <p className="text-[13px] font-bold text-muted">{label}</p>
      <p className="mt-1 text-[26px] leading-tight font-extrabold tabular-nums md:text-[30px]">{value}</p>
      {note && <p className={`mt-1 text-xs font-bold ${noteColor}`}>{note}</p>}
    </div>
  );
}

/** Label / value line used in summaries. */
export function Row({ label, children, strong = false }: { label: ReactNode; children: ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${strong ? "text-lg font-extrabold" : "text-[15px]"}`}>
      <span className={strong ? "" : "text-muted"}>{label}</span>
      <span className="text-right font-bold tabular-nums">{children}</span>
    </div>
  );
}

/** Round avatar with an initial. */
export function Avatar({ name, tone = "cloud", size = 40 }: { name: string; tone?: "cloud" | "amber"; size?: number }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ${tone === "amber" ? "bg-amber text-navy" : "bg-indigo-tint text-navy"}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
