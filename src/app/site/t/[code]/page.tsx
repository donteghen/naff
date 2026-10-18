import { CallUsButton } from "@/components/site/CallUsButton";
import { Timeline } from "@/components/site/Timeline";
import { TrackingScene } from "@/components/site/TrackingScene";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Logo } from "@/components/Logo";
import { RefreshButton } from "@/components/RefreshButton";
import { Card, Chip } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDayAndTime, formatTime } from "@/lib/dates";
import { hasReached } from "@/lib/order-steps";
import { load } from "@/server/debug";
import { getTracking } from "@/server/services/order-queries";

export const dynamic = "force-dynamic";

/** Public tracking page: no login, reduced data, "expired" once the delivery has ended. */
export default async function TrackingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { t, tx, language } = await getTranslator();
  const tracking = await load("site.tracking", { code }, () => getTracking(code));

  const header = (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-5">
      <Logo onDark size={24} />
      <LanguageSwitch onDark />
    </div>
  );

  if (tracking.state !== "active") {
    const expired = tracking.state === "expired";
    return (
      <main className="flex flex-1 flex-col">
        <div className="relative overflow-hidden md:rounded-t-[32px]">{header}<TrackingScene progress={expired ? 1 : 0} done={expired} label={t("track.sceneLabel")} /></div>
        <div className="relative z-10 -mt-6 flex flex-1 flex-col gap-3 rounded-t-[26px] bg-mist px-5 pt-6 pb-8">
          <h1 className="text-[26px] font-extrabold">{expired ? t("track.expiredTitle") : t("track.notFoundTitle")}</h1>
          <p className="text-muted">{expired ? t("track.expiredBody") : t("track.notFoundBody")}</p>
          <div className="mt-auto"><CallUsButton /></div>
        </div>
      </main>
    );
  }

  const steps = tracking.steps;
  const position = Math.max(0, steps.indexOf(tracking.status));
  const progress = steps.length > 1 ? position / (steps.length - 1) : 0;
  const readyAtAgency = tracking.intercityMode === "collect_at_agency" && tracking.status === "arrived_at_agency_b";
  const title = readyAtAgency ? t("track.readyAtAgency") : tx(`status.${tracking.status}`);
  const description = readyAtAgency
    ? t("track.readyAtAgencyBody", { city: tracking.destinationCityName })
    : tx(`track.desc.${tracking.status}`, { city: tracking.destinationCityName, area: tracking.dropoffArea });
  const lastTime = tracking.statusTimes[tracking.status];
  const route = tracking.type === "intercity"
    ? `${tracking.originCityName} (${tracking.pickupArea}) → ${tracking.destinationCityName}`
    : `${tracking.originCityName} (${tracking.pickupArea} → ${tracking.dropoffArea})`;

  return (
    <main className="flex flex-1 flex-col">
      <div className="relative overflow-hidden md:rounded-t-[32px]">{header}<TrackingScene progress={progress} label={t("track.sceneLabel")} /></div>
      <div className="relative z-10 -mt-6 flex flex-1 flex-col gap-3 rounded-t-[26px] bg-mist px-5 pt-5 pb-8">
        <p className="text-xs font-bold text-muted">{route} · NF-{tracking.number}{tracking.intercityMode === "collect_at_agency" ? ` · ${t("mode.collect_at_agency")}` : ""}</p>
        <h1 className="text-[26px] leading-tight font-extrabold">{title}</h1>
        <p className="text-[15px] text-muted">{description}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {lastTime && <span className="text-xs font-bold text-green-ink">● {t("track.updated", { time: formatTime(lastTime, language) })}</span>}
          <Chip tone={tracking.paid ? "green" : "amber"}>● {tracking.paid ? t("track.paidBoth") : t("track.notPaidBoth")}</Chip>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {steps.map((step, index) => (
            <span key={step} className={`h-1.5 flex-1 rounded-full ${index < position ? "bg-navy" : index === position ? (tracking.status === "delivered" ? "bg-green" : "bg-amber") : "bg-cloud"}`} />
          ))}
        </div>
        <RefreshButton />

        {tracking.type === "intercity" && tracking.intercityMode === "to_address" && (
          <Card className="grid grid-cols-3 items-center gap-1 p-3 text-center text-xs font-bold">
            <div>{t("track.courier1")}<br /><Chip tone={hasReached(tracking.status, "dropped_at_agency") ? "green" : "amber"} className="mt-1">{hasReached(tracking.status, "dropped_at_agency") ? `✓ ${t("track.done")}` : t("track.now")}</Chip></div>
            <div>{t("track.agencyVehicle")}<br /><Chip tone={hasReached(tracking.status, "arrived_at_agency_b") ? "green" : hasReached(tracking.status, "dropped_at_agency") ? "amber" : "grey"} className="mt-1">{hasReached(tracking.status, "arrived_at_agency_b") ? `✓ ${t("track.done")}` : hasReached(tracking.status, "dropped_at_agency") ? t("track.onRoad") : t("track.waiting")}</Chip></div>
            <div>{t("track.courier2")}<br /><Chip tone={hasReached(tracking.status, "arrived_at_agency_b") ? "amber" : "grey"} className="mt-1">{hasReached(tracking.status, "arrived_at_agency_b") ? t("track.now") : t("track.waiting")}</Chip></div>
          </Card>
        )}

        {tracking.agencyName && (
          <div className="rounded-[18px] bg-navy p-4 text-white">
            <p className="text-xs font-extrabold tracking-wider text-amber uppercase">{t("track.travelPass")}</p>
            <p className="font-extrabold">{tracking.agencyName} · {tracking.originCityName} → {tracking.destinationCityName}</p>
            <div className="mt-2 flex justify-between border-t border-dashed border-navy-line pt-2 text-sm">
              <span>{t("track.vehicle")}<br /><b>{tracking.vehicleNumber}</b></span>
              {readyAtAgency && tracking.arrivedAt ? (
                <span className="text-right">{t("track.readySince")}<br /><b>{formatTime(tracking.arrivedAt, language)}</b></span>
              ) : tracking.eta ? (
                <span className="text-right">{t("track.expectedArrival")}<br /><b>{formatDayAndTime(tracking.eta, language, t("common.today"))}</b></span>
              ) : null}
            </div>
          </div>
        )}

        <Card>
          <Timeline
            steps={steps}
            status={tracking.status}
            times={tracking.statusTimes}
            language={language}
            labelFor={(step) => (step === "arrived_at_agency_b" && tracking.intercityMode === "collect_at_agency" ? t("track.readyAtAgency") : tx(`status.${step}`))}
            nowLabel={t("track.now")}
          />
        </Card>
        <div className="mt-auto pt-2"><CallUsButton /></div>
      </div>
    </main>
  );
}
