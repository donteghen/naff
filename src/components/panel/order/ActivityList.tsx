import { getTranslator } from "@/i18n/server";
import { formatDateTime } from "@/lib/dates";
import { formatXAF } from "@/lib/money";

export type ActivityEntry = {
  id: string;
  action: string;
  actorType: string;
  actorName: string;
  onBehalfOfDriverName: string;
  fromStatus: string | null;
  toStatus: string | null;
  details: Record<string, unknown>;
  at: string;
};

/** Short readable line for the details of a log entry. */
export function describeDetails(details: Record<string, unknown>, tx: (key: string, values?: Record<string, string | number>) => string): string {
  const parts: string[] = [];
  if (typeof details.reason === "string" && details.reason) parts.push(details.reason);
  if (typeof details.note === "string" && details.note) parts.push(details.note);
  if (typeof details.grossPrice === "number") parts.push(formatXAF(details.grossPrice));
  if (typeof details.driverName === "string") parts.push(details.driverName);
  if (typeof details.feeCollected === "number") parts.push(tx("activity.feeCollected", { amount: formatXAF(details.feeCollected) }));
  if (typeof details.goodsCollected === "number") parts.push(tx("activity.goodsCollected", { amount: formatXAF(details.goodsCollected) }));
  if (typeof details.agency === "string") parts.push(`${details.agency} · ${details.vehicleNumber ?? ""}`);
  const changed = details.new as Record<string, unknown> | undefined;
  const old = details.old as Record<string, unknown> | undefined;
  if (old && changed && typeof old.grossPrice === "number" && typeof changed.grossPrice === "number") parts.push(`${formatXAF(old.grossPrice)} → ${formatXAF(changed.grossPrice)}`);
  return parts.join(" · ");
}

export async function ActivityList({ entries }: { entries: ActivityEntry[] }) {
  const { tx, t, language } = await getTranslator();
  return (
    <ol className="flex flex-col gap-3">
      {entries.map((entry) => {
        const title = entry.action === "status_changed" && entry.toStatus ? tx(`status.${entry.toStatus}`) : tx(`activity.${entry.action}`);
        const details = describeDetails(entry.details, tx);
        return (
          <li key={entry.id} className="flex gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo" />
            <div className="min-w-0">
              <p className="font-extrabold">{title}</p>
              {details && <p className="text-sm break-words">{details}</p>}
              <p className="text-xs text-muted">
                {formatDateTime(entry.at, language)} · {entry.actorName || tx(`actor.${entry.actorType}`)}
                {entry.actorType === "guest" ? ` (${t("actor.guest")})` : ""}
                {entry.onBehalfOfDriverName ? ` · ${t("actions.onBehalf", { name: entry.onBehalfOfDriverName })}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
