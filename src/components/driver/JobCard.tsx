import Link from "next/link";
import { getTranslator } from "@/i18n/server";
import type { DriverJobView } from "@/server/services/order-views";
import { IconChevron } from "../Icons";
import { StatusChip } from "../ui";

function place(text: string) {
  return text.split(/[,\n]/)[0].trim();
}

export async function JobCard({ job, highlight = false }: { job: DriverJobView; highlight?: boolean }) {
  const { t, tx } = await getTranslator();
  const from = job.role === "destination" ? job.handover.agencyName || job.destinationCityName : place(job.pickup.text);
  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`press flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-[var(--shadow-card)] ${highlight ? "shadow-[inset_0_0_0_2px_var(--color-amber),var(--shadow-card)]" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-extrabold">
          {from} → {place(job.dropoff.text)}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          NF-{job.number} · {tx(`size.${job.size}`)}
          {job.pickupTime && job.role === "origin" ? ` · ${t("driver.pickupAt", { time: job.pickupTime })}` : ""}
          {job.role === "destination" ? ` · ${t("driver.destinationLeg")}` : ""}
        </p>
        <div className="mt-2">
          <StatusChip status={job.status} label={tx(`status.${job.status}`)} />
        </div>
      </div>
      <IconChevron className="shrink-0 text-faint" />
    </Link>
  );
}
