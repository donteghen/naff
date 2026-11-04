import Link from "next/link";
import type { ReactNode } from "react";

// Standard admin table. Less important columns hide on small screens (pass e.g. "hidden md:table-cell"
// to both the header and the cells); wide tables scroll sideways inside their card.

export type Column = { label: string; className?: string };

export function Table({ columns, children, minWidth = 0 }: { columns: Column[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={minWidth ? { minWidth } : undefined}>
        <thead className="bg-mist text-xs font-extrabold tracking-wide text-muted uppercase">
          <tr>
            {columns.map((column, index) => (
              <th key={index} scope="col" className={`px-4 py-3 whitespace-nowrap ${column.className ?? ""}`}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A table row. With `href`, the whole row opens it (the link in `RowLink` stretches over the row). */
export function Row({ children, tone = "" }: { children: ReactNode; tone?: string }) {
  return <tr className={`relative border-t border-line align-middle transition hover:bg-mist ${tone}`}>{children}</tr>;
}

export function Cell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

/** Main link of a row; its click area covers the whole row. */
export function RowLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="font-extrabold after:absolute after:inset-0 after:content-['']">{children}</Link>;
}

/** Buttons inside a clickable row sit above the row link. */
export function RowActions({ children }: { children: ReactNode }) {
  return <div className="relative z-10 flex flex-wrap items-center justify-end gap-2">{children}</div>;
}
