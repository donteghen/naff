import Link from "next/link";
import { BarChart } from "@/components/panel/BarChart";
import { Card, EmptyState, PageTitle, SectionLabel, StatCard } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { formatDuration } from "@/lib/dates";
import { formatAmount, formatXAF } from "@/lib/money";
import { formatPhone } from "@/lib/phone";
import { requireAdminPage } from "@/server/auth/current";
import { load } from "@/server/debug";
import { getReports, type Granularity } from "@/server/services/reports";

export const dynamic = "force-dynamic";

const GRANULARITIES: Granularity[] = ["day", "week", "month"];

function shortLabel(key: string, granularity: Granularity, language: string) {
  if (granularity === "month") return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", { month: "short", timeZone: "UTC" }).format(new Date(`${key}-01T00:00:00Z`));
  return new Intl.DateTimeFormat(language === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${key}T00:00:00Z`));
}

/** Rising / falling signal. */
function Trend({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-muted">{label}: —</span>;
  const tone = value > 0 ? "text-green-ink" : value < 0 ? "text-red" : "text-muted";
  const arrow = value > 0 ? "▲" : value < 0 ? "▼" : "■";
  return <span className={tone}>{arrow} {Math.abs(value)}% {label}</span>;
}

function Table({ rows, empty, columns }: { rows: (string | number)[][]; empty: string; columns: string[] }) {
  if (rows.length === 0) return <EmptyState>{empty}</EmptyState>;
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-xs text-muted uppercase">{columns.map((column, index) => <th key={column} className={`pb-2 ${index > 0 ? "text-right" : "text-left"}`}>{column}</th>)}</tr></thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex} className="border-t border-line">
            {row.map((cell, index) => <td key={index} className={`py-2 ${index > 0 ? "text-right font-bold tabular-nums" : ""}`}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ by?: string }> }) {
  await requireAdminPage();
  const { t, language } = await getTranslator();
  const { by } = await searchParams;
  const granularity: Granularity = GRANULARITIES.includes(by as Granularity) ? (by as Granularity) : "week";
  const report = await load("panel.reports", { granularity }, () => getReports(granularity));
  const vsLabel = t(`reports.vsPrevious.${granularity}`);
  const series = (pick: (row: (typeof report.trend)[number]) => number, money = false) =>
    report.trend.map((row) => ({ label: shortLabel(row.key, granularity, language), value: pick(row), display: money ? formatXAF(pick(row)) : formatAmount(pick(row)) }));

  const charts = [
    { key: "requests", title: t("reports.requests"), bars: series((row) => row.requests), change: report.changes.requests },
    { key: "delivered", title: t("reports.delivered"), bars: series((row) => row.delivered), change: report.changes.delivered },
    { key: "revenue", title: t("reports.revenue"), bars: series((row) => row.revenue, true), change: report.changes.revenue },
    { key: "margin", title: t("reports.margin"), bars: series((row) => row.margin, true), change: report.changes.margin },
  ];

  return (
    <>
      <PageTitle
        title={t("nav.reports")}
        subtitle={t("reports.intro")}
        actions={
          <div className="flex gap-2">
            {GRANULARITIES.map((item) => (
              <Link key={item} href={`/reports?by=${item}`} className={`min-h-10 rounded-full px-4 py-2 text-[13px] font-extrabold ${granularity === item ? "bg-navy text-white" : "bg-cloud text-muted"}`}>{t(`reports.by.${item}`)}</Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("reports.requests")} value={report.current.requests} note={<Trend value={report.changes.requests} label={vsLabel} />} />
        <StatCard label={t("reports.delivered")} value={report.current.delivered} note={<Trend value={report.changes.delivered} label={vsLabel} />} />
        <StatCard label={t("reports.revenue")} value={formatXAF(report.current.revenue)} note={<Trend value={report.changes.revenue} label={vsLabel} />} />
        <StatCard label={t("reports.margin")} value={formatXAF(report.current.margin)} note={<Trend value={report.changes.margin} label={vsLabel} />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((chart) => (
          <Card key={chart.key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-extrabold">{chart.title}</h2>
              <span className="text-xs font-bold"><Trend value={chart.change} label={vsLabel} /></span>
            </div>
            <BarChart bars={chart.bars} title={chart.title} />
            <details className="text-sm">
              <summary className="min-h-10 cursor-pointer font-bold text-indigo">{t("reports.showTable")}</summary>
              <Table columns={[t("reports.period"), chart.title]} rows={chart.bars.map((bar) => [bar.label, bar.display])} empty="—" />
            </details>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <SectionLabel>{t("reports.times")}</SectionLabel>
          <Table
            columns={[t("reports.measure"), t(`reports.thisPeriod.${granularity}`)]}
            empty="—"
            rows={[
              [t("reports.requestToApproval"), report.current.avgApprovalMinutes === null ? "—" : formatDuration(report.current.avgApprovalMinutes)],
              [t("reports.requestToDelivery"), report.current.avgDeliveryMinutes === null ? "—" : formatDuration(report.current.avgDeliveryMinutes)],
              [t("reports.timeAtAgency"), report.avgTimeAtAgencyMinutes === null ? "—" : formatDuration(report.avgTimeAtAgencyMinutes)],
              [t("reports.lateArrivals"), report.lateArrivals],
              [t("reports.completionRate"), `${report.current.completionRate}%`],
              [t("reports.webShare"), `${report.current.webShare}%`],
            ]}
          />
        </Card>
        <Card className="flex flex-col gap-2">
          <SectionLabel>{t("reports.topRoutes")}</SectionLabel>
          <Table columns={[t("order.route"), t("reports.orders")]} empty={t("reports.noData")} rows={report.topRoutes.map((row) => [row.label, row.count])} />
        </Card>
        <Card className="flex flex-col gap-2">
          <SectionLabel>{t("reports.customers")}</SectionLabel>
          <p className="text-sm">{t("reports.repeatRate", { rate: report.repeatRate, count: report.customersCount })}</p>
          <Table columns={[t("order.sender"), t("reports.orders"), t("reports.spent")]} empty={t("reports.noData")} rows={report.topCustomers.map((row) => [`${row.name} · ${formatPhone(row.phone)}`, row.count, formatXAF(row.spent)])} />
        </Card>
        <Card className="flex flex-col gap-2">
          <SectionLabel>{t("reports.pickupAreas")}</SectionLabel>
          <Table columns={[t("reports.area"), t("reports.orders")]} empty={t("reports.noData")} rows={report.topPickupAreas.map((row) => [row.label, row.count])} />
        </Card>
        <Card className="flex flex-col gap-2">
          <SectionLabel>{t("reports.dropoffAreas")}</SectionLabel>
          <Table columns={[t("reports.area"), t("reports.orders")]} empty={t("reports.noData")} rows={report.topDropoffAreas.map((row) => [row.label, row.count])} />
        </Card>
        <Card className="flex flex-col gap-2">
          <SectionLabel>{t("reports.exits")}</SectionLabel>
          <Table columns={[t("reports.cancelReason"), t("reports.orders")]} empty={t("reports.noData")} rows={report.cancelReasons.map((row) => [row.label, row.count])} />
          <Table columns={[t("reports.failReason"), t("reports.orders")]} empty={t("reports.noData")} rows={report.failReasons.map((row) => [row.label, row.count])} />
        </Card>
      </div>

      <Card className="flex flex-col gap-2 overflow-x-auto">
        <SectionLabel>{t("reports.routeMargins")}</SectionLabel>
        <Table
          columns={[t("order.route"), t("reports.delivered"), t("reports.revenue"), t("dashboard.agencyFees"), t("reports.margin")]}
          empty={t("reports.noData")}
          rows={report.routeMargins.map((row) => [row.label, row.deliveries, formatXAF(row.revenue), formatXAF(row.agencyFees), formatXAF(row.margin)])}
        />
        <p className="text-xs text-muted">{t("reports.windowNote")}</p>
      </Card>
    </>
  );
}
