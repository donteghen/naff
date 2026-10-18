import { formatAmount } from "@/lib/money";

/** The loud amber card telling the driver to collect money before the next step. */
export function MoneyCard({ title, amount, note }: { title: string; amount: number; note: string }) {
  return (
    <div className="animate-pulse-amber rounded-[18px] bg-amber p-4 text-center text-navy shadow-[inset_0_0_0_3px_var(--color-navy)]">
      <p className="text-xs font-extrabold tracking-wider uppercase">{title}</p>
      <p className="text-[40px] leading-tight font-extrabold tabular-nums">{formatAmount(amount)} XAF</p>
      <p className="text-sm font-bold">{note}</p>
    </div>
  );
}
