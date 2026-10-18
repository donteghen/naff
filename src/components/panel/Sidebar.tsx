"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAdminAction } from "@/actions/panel-admin";
import { useT } from "@/i18n/client";
import { LogoutButton } from "../auth/LogoutButton";
import { IconBell, IconBox, IconChart, IconClose, IconGrid, IconList, IconMenu, IconSettings, IconShield, IconTruck, IconUser, IconUsers } from "../Icons";
import { LanguageSwitch } from "../LanguageSwitch";
import { Logo } from "../Logo";
import { Avatar } from "../ui";

const LINKS = [
  { href: "/", key: "nav.dashboard", icon: IconGrid },
  { href: "/queue", key: "nav.queue", icon: IconBell },
  { href: "/in-transit", key: "nav.inTransit", icon: IconTruck },
  { href: "/orders", key: "nav.orders", icon: IconBox },
  { href: "/users", key: "nav.users", icon: IconUsers },
  { href: "/drivers", key: "nav.drivers", icon: IconUser },
  { href: "/reports", key: "nav.reports", icon: IconChart },
  { href: "/activity", key: "nav.activity", icon: IconList },
  { href: "/audit", key: "nav.audit", icon: IconShield },
  { href: "/settings", key: "nav.settings", icon: IconSettings },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Desktop: full sidebar. Tablet: compact icon sidebar. Phone: top bar with a drawer menu.
 */
export function Sidebar({ admin }: { admin: { name: string; isSuperAdmin: boolean } }) {
  const { t } = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (compact: boolean) => (
    <nav className="flex flex-col gap-1">
      {LINKS.map(({ href, key, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            title={compact ? t(key) : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl font-bold transition ${compact ? "justify-center px-0" : "px-3.5"} ${active ? "bg-amber text-navy" : "text-side-text hover:bg-navy-soft"}`}
          >
            <Icon size={19} />
            {!compact && <span>{t(key)}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const account = (compact: boolean) => (
    <div className={`mt-auto rounded-2xl bg-navy-soft p-3 ${compact ? "flex flex-col items-center gap-2" : ""}`}>
      <div className="flex items-center gap-2.5">
        <Avatar name={admin.name} tone="amber" size={36} />
        {!compact && (
          <div className="min-w-0 text-white">
            <p className="truncate text-sm font-extrabold">{admin.name}</p>
            <p className="text-xs text-side-text">{admin.isSuperAdmin ? t("panel.superAdmin") : t("panel.admin")}</p>
          </div>
        )}
      </div>
      <LogoutButton action={logoutAdminAction} afterLogout="/login" iconOnly={compact} className="mt-2 w-full rounded-xl text-sm text-white shadow-[inset_0_0_0_1.5px_var(--color-navy-line)]" />
    </div>
  );

  return (
    <>
      {/* Phone */}
      <div className="sticky top-0 z-30 flex items-center justify-between bg-navy px-4 py-3 md:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label={t("nav.openMenu")} className="flex h-11 w-11 items-center justify-center rounded-xl text-white"><IconMenu /></button>
        <Logo onDark size={24} />
        <LanguageSwitch onDark />
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div className="flex w-72 flex-col gap-4 overflow-y-auto bg-navy p-4 animate-rise">
            <div className="flex items-center justify-between">
              <Logo onDark size={26} />
              <button type="button" onClick={() => setOpen(false)} aria-label={t("common.close")} className="flex h-11 w-11 items-center justify-center rounded-xl text-white"><IconClose /></button>
            </div>
            {nav(false)}
            {account(false)}
          </div>
          <button type="button" aria-label={t("common.close")} className="flex-1 bg-navy/50" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Tablet */}
      <aside className="sticky top-0 hidden h-dvh w-[84px] shrink-0 flex-col gap-5 overflow-y-auto bg-navy px-3 py-5 md:flex lg:hidden">
        <div className="flex justify-center"><Logo onDark size={28} withText={false} /></div>
        {nav(true)}
        {account(true)}
      </aside>

      {/* Desktop */}
      <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col gap-6 overflow-y-auto bg-navy px-4 py-6 lg:flex">
        <div className="px-2"><Logo onDark size={28} /></div>
        {nav(false)}
        {account(false)}
      </aside>
    </>
  );
}
