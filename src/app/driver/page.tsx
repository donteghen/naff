import Link from "next/link";
import { logoutDriverAction } from "@/actions/driver";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { AvailabilitySwitch } from "@/components/driver/AvailabilitySwitch";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { JobCard } from "@/components/driver/JobCard";
import { RefreshButton } from "@/components/RefreshButton";
import { EmptyState, SectionLabel } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { requireDriverPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { listDriverJobs } from "@/server/services/order-queries";

export const dynamic = "force-dynamic";

export default async function DriverJobsPage() {
  const driver = await requireDriverPage();
  const { t } = await getTranslator();
  const jobs = await load("driver.jobs", { driverId: String(driver._id) }, () => listDriverJobs(driver._id));
  const firstName = driver.name.split(" ")[0];

  return (
    <>
      <DriverHeader available={driver.available} />
      <main className="flex flex-col gap-5 p-4 pb-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold">{t("driver.hello", { name: firstName })}</h1>
          <AvailabilitySwitch available={driver.available} />
        </div>
        <RefreshButton />

        <section className="flex flex-col gap-2">
          <SectionLabel>{t("driver.awaiting")} · {jobs.awaiting.length}</SectionLabel>
          {jobs.awaiting.length === 0 ? <EmptyState>{t("driver.noneAwaiting")}</EmptyState> : jobs.awaiting.map((job) => <JobCard key={job.id + job.role} job={job} highlight />)}
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>{t("driver.active")} · {jobs.active.length}</SectionLabel>
          {jobs.active.length === 0 ? <EmptyState>{t("driver.noneActive")}</EmptyState> : jobs.active.map((job) => <JobCard key={job.id + job.role} job={job} />)}
        </section>

        <section className="flex flex-col gap-2">
          <SectionLabel>{t("driver.completedToday")} · {jobs.doneToday.length}</SectionLabel>
          {jobs.done.length === 0 ? <EmptyState>{t("driver.noneDone")}</EmptyState> : jobs.done.slice(0, 20).map((job) => <JobCard key={job.id + job.role} job={job} />)}
          {jobs.done.length > 0 && <p className="text-center text-xs text-faint">{t("driver.historyNote")}</p>}
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-muted">
          <Link href="/pin" className="inline-flex min-h-11 items-center font-bold">{t("auth.changePin")}</Link>
          <LogoutButton action={logoutDriverAction} afterLogout="/login" />
        </div>
      </main>
    </>
  );
}
