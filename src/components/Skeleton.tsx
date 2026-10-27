"use client";

// Placeholders shown by the loading.tsx files while the next page is built on the server.
// They are static (no data, no cookies) so Next.js can show them instantly and prefetch them.

import { useT } from "@/i18n/client";
import { Logo } from "./Logo";

/** One placeholder shape. Size and shape come from `className`, colour from `tone`. */
export function Bone({ className = "", tone = "bg-cloud" }: { className?: string; tone?: string }) {
  return <div className={`animate-pulse rounded-xl ${tone} ${className}`} />;
}

/** Announces loading to screen readers; the shapes inside are hidden from them. */
function Loading({ className = "", children }: { className?: string; children: React.ReactNode }) {
  const { t } = useT();
  return (
    <div role="status" className={className}>
      <span className="sr-only">{t("common.loading")}</span>
      <div aria-hidden className="contents">{children}</div>
    </div>
  );
}

function CardBones({ count, height = "h-[76px]" }: { count: number; height?: string }) {
  return Array.from({ length: count }, (_, index) => <Bone key={index} tone="bg-white" className={`${height} rounded-card shadow-(--shadow-card)`} />);
}

function SiteHeaderBones() {
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-2">
      <Logo size={26} withText={false} />
      <div className="flex gap-2"><Bone className="h-11 w-24" /><Bone className="h-10 w-20" /><Bone className="h-10 w-11" /></div>
    </div>
  );
}

/** Customer app: home, lists, account, forms. */
export function SiteListSkeleton() {
  return (
    <Loading className="flex flex-1 flex-col">
      <SiteHeaderBones />
      <div className="flex flex-col gap-4 px-5 pt-3 pb-8">
        <Bone className="h-8 w-3/4" />
        <Bone className="h-14 w-full rounded-2xl" />
        <CardBones count={3} />
      </div>
    </Loading>
  );
}

/** Customer app: one order (registered or guest). */
export function SiteOrderSkeleton() {
  return (
    <Loading className="flex flex-1 flex-col">
      <SiteHeaderBones />
      <div className="flex flex-col gap-4 px-5 pt-3 pb-8">
        <Bone className="h-7 w-1/2" />
        <Bone tone="bg-navy/15" className="h-48 w-full rounded-card" />
        <CardBones count={2} height="h-28" />
      </div>
    </Loading>
  );
}

function DriverHeaderBones() {
  return (
    <div className="flex items-center justify-between gap-3 bg-navy px-4 py-3">
      <Logo onDark size={24} />
      <div className="flex gap-2"><Bone tone="bg-navy-soft" className="h-6 w-20 rounded-full" /><Bone tone="bg-navy-soft" className="h-10 w-11" /></div>
    </div>
  );
}

/** Driver app: job list. */
export function DriverListSkeleton() {
  return (
    <Loading className="flex flex-1 flex-col">
      <DriverHeaderBones />
      <div className="flex flex-col gap-3 p-4">
        <Bone className="h-14 w-full rounded-2xl" />
        <CardBones count={3} height="h-28" />
      </div>
    </Loading>
  );
}

/** Driver app: one job. */
export function DriverJobSkeleton() {
  return (
    <Loading className="flex flex-1 flex-col">
      <DriverHeaderBones />
      <div className="flex flex-col gap-3 p-4">
        <Bone className="h-7 w-1/2" />
        <CardBones count={3} height="h-32" />
        <Bone className="h-14 w-full rounded-2xl" />
      </div>
    </Loading>
  );
}

/** Panel: lists and dashboards. The sidebar and top bar stay on screen. */
export function PanelListSkeleton() {
  return (
    <Loading className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3"><Bone className="h-8 w-48" /><Bone className="h-11 w-32" /></div>
      <div className="flex gap-2"><Bone className="h-10 w-24 rounded-full" /><Bone className="h-10 w-24 rounded-full" /><Bone className="h-10 w-24 rounded-full" /></div>
      <div className="flex flex-col gap-2"><CardBones count={6} height="h-16" /></div>
    </Loading>
  );
}

/** Panel: one order, two columns from tablet up. */
export function PanelOrderSkeleton() {
  return (
    <Loading className="flex flex-col gap-5">
      <Bone className="h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4"><CardBones count={3} height="h-40" /></div>
        <div className="flex flex-col gap-4"><CardBones count={2} height="h-48" /></div>
      </div>
    </Loading>
  );
}
