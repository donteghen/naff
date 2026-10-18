import Link from "next/link";
import { notFound } from "next/navigation";
import { DriverHeader } from "@/components/driver/DriverHeader";
import { JobActions } from "@/components/driver/JobActions";
import { IconBack, IconCheck, IconNavigate, IconPhone } from "@/components/Icons";
import { RefreshButton } from "@/components/RefreshButton";
import { ButtonLink, Card, Chip, Notice, StatusChip } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDayAndTime } from "@/lib/dates";
import { navigationUrl } from "@/lib/location";
import { formatXAF } from "@/lib/money";
import { hasReached, isFinal } from "@/lib/order-steps";
import { formatPhone } from "@/lib/phone";
import { requireDriverPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { getDriverJob } from "@/server/services/order-queries";

export const dynamic = "force-dynamic";

export default async function DriverJobPage({ params }: { params: Promise<{ id: string }> }) {
  const driver = await requireDriverPage();
  const { id } = await params;
  const { t, tx, language } = await getTranslator();
  const data = await load("driver.job", { id }, () => getDriverJob(driver._id, id));
  if (!data) notFound();
  const { job, agencies } = data;

  const originLegDone = job.role === "origin" && job.type === "intercity" && hasReached(job.status, "dropped_at_agency");
  const finished = isFinal(job.status) || originLegDone;
  const goingToPickup = job.role === "origin" && !hasReached(job.status, "picked_up");
  // The origin driver of an intercity order goes to the agency in their own city, not to the receiver.
  const toAgency = job.role === "origin" && job.type === "intercity";
  const target = goingToPickup ? job.pickup : job.dropoff;
  const contact = goingToPickup || toAgency ? job.sender : job.receiver;
  const showNavigate = goingToPickup || !toAgency;

  if (finished) {
    const delivered = job.status === "delivered";
    return (
      <>
        <DriverHeader available={driver.available} />
        <main className="flex flex-1 flex-col items-center gap-4 p-6 text-center">
          <div className={`mt-8 flex h-24 w-24 items-center justify-center rounded-full ${delivered || originLegDone ? "bg-green" : "bg-cloud"} text-white`}>
            <IconCheck size={48} />
          </div>
          <h1 className="text-3xl font-extrabold">{tx(`status.${originLegDone && !isFinal(job.status) ? "dropped_at_agency" : job.status}`)}</h1>
          <p className="text-muted">NF-{job.number}</p>
          {job.paidToMe && <Chip tone="green">● {t("driver.paidToMe")}</Chip>}
          {job.collectedOnThisJob > 0 && <p className="text-sm text-muted">{t("driver.collectedOnJob", { amount: formatXAF(job.collectedOnThisJob) })}</p>}
          <div className="mt-auto w-full"><ButtonLink href="/" variant="primary" className="w-full">{t("driver.backToJobs")}</ButtonLink></div>
        </main>
      </>
    );
  }

  return (
    <>
      <DriverHeader available={driver.available} />
      <main className="flex flex-col gap-4 p-4 pb-10">
        <Link href="/" className="inline-flex min-h-11 items-center gap-1 font-bold text-muted"><IconBack size={18} />{t("driver.backToJobs")}</Link>
        <RefreshButton />
        <Card className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <StatusChip status={job.status} label={tx(`status.${job.status}`)} />
            <b>NF-{job.number}</b>
          </div>
          <p className="text-xl font-extrabold">
            {job.role === "destination" ? job.handover.agencyName || job.destinationCityName : job.pickup.text} → {toAgency ? t("driver.agencyIn", { city: job.originCityName }) : job.dropoff.text}
          </p>
          <p className="text-sm text-muted">
            {tx(`size.${job.size}`)} · {tx(`category.${job.category}`)} · {job.contents} ({job.itemCount})
          </p>
          {job.pickupTime && job.role === "origin" && <p className="text-sm font-bold">{t("driver.pickupAt", { time: job.pickupTime })}</p>}
          {job.type === "intercity" && (
            <p className="text-sm font-bold text-indigo">
              {job.originCityName} → {job.destinationCityName} · {tx(`mode.${job.intercityMode}`)} · {t(job.role === "origin" ? "driver.originLeg" : "driver.destinationLeg")}
            </p>
          )}
        </Card>

        <Card className="flex flex-col gap-1">
          <p className="text-xs font-extrabold text-muted uppercase">{goingToPickup || toAgency ? t("order.sender") : t("order.receiver")}</p>
          <p className="font-extrabold">{contact.name}</p>
          <p className="text-[15px]">{formatPhone(contact.phone)}</p>
          {showNavigate && <p className="text-sm text-muted">{goingToPickup ? t("order.pickup") : t("order.dropoff")}: {target.text}</p>}
          <div className={`mt-2 grid gap-2 ${showNavigate ? "grid-cols-2" : "grid-cols-1"}`}>
            <ButtonLink href={`tel:+237${contact.phone}`} variant="secondary" size="md"><IconPhone size={18} />{t("driver.call")}</ButtonLink>
            {showNavigate && <a href={navigationUrl({ text: target.text, lat: target.lat ?? undefined, lng: target.lng ?? undefined })} target="_blank" rel="noreferrer" className="press inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-white px-4 text-[15px] font-bold shadow-[inset_0_0_0_2px_var(--color-field)]">
              <IconNavigate size={18} />{t("driver.navigate")}
            </a>}
          </div>
          {!goingToPickup && job.role === "origin" && !toAgency && (
            <p className="mt-2 text-xs text-muted">{t("order.sender")}: {job.sender.name} · {formatPhone(job.sender.phone)}</p>
          )}
        </Card>

        {job.role === "destination" && !hasReached(job.status, "arrived_at_agency_b") && (
          <Notice tone="info">
            {job.handover.agencyName
              ? t("driver.onTheWay", { agency: job.handover.agencyName, vehicle: job.handover.vehicleNumber, eta: job.handover.eta ? formatDayAndTime(job.handover.eta, language, t("common.today")) : "—" })
              : t("driver.waitingForDrop")}
          </Notice>
        )}

        <JobActions job={job} agencies={agencies} originCityId={job.originCityId} />
      </main>
    </>
  );
}
