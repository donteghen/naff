"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useTransition, type ReactNode } from "react";
import { IconRefresh } from "../Icons";

// Feedback for filters that stay on the same page (no loading screen there):
// the tapped link or the Apply button spins until the new data has arrived.

function Spinner({ size = 14 }: { size?: number }) {
  return <IconRefresh size={size} className="shrink-0 animate-spin" />;
}

/** Spinner shown inside any <Link> while its page loads. Server components can use it as a child too. */
export function LinkSpinner() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner /> : null;
}

/** A filter pill, tab or paging link. */
export function PendingLink({ href, className = "", children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`inline-flex items-center justify-center gap-1.5 ${className}`}>
      {children}
      <LinkSpinner />
    </Link>
  );
}

const QueryPending = createContext(false);

/**
 * GET filter form: puts the fields in the address (empty ones left out) and loads it in place,
 * so `QuerySubmit` can show that the page is working.
 */
export function QueryForm({ className = "", children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) {
      if (typeof value === "string" && value !== "") query.append(key, value);
    }
    startTransition(() => router.push(query.size > 0 ? `${pathname}?${query}` : pathname));
  }

  return (
    <form method="get" onSubmit={submit} aria-busy={pending} className={className}>
      <QueryPending.Provider value={pending}>{children}</QueryPending.Provider>
    </form>
  );
}

/** The form's Apply button: spins and is disabled while the results load. */
export function QuerySubmit({ className = "", children }: { className?: string; children: ReactNode }) {
  const pending = useContext(QueryPending);
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending && <Spinner size={16} />}
      {children}
    </button>
  );
}
