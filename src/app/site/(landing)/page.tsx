import Link from "next/link";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { TownsMap } from "@/components/landing/TownsMap";
import { TrackBox } from "@/components/landing/TrackBox";
import { IconBox, IconPhone, IconShield, IconUser, IconWhatsApp } from "@/components/Icons";
import { Logo } from "@/components/Logo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TrackingScene } from "@/components/site/TrackingScene";
import { buttonClass } from "@/components/ui";
import { getTranslator } from "@/i18n/server";
import { percent } from "@/lib/money";
import { formatPhone, internationalPhone } from "@/lib/phone";
import { getCurrentUser } from "@/server/auth/current";
import { listActiveCities } from "@/server/services/places";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

const STEPS = [1, 2, 3, 4, 5] as const;

/** Public landing page: where visitors arrive from campaigns, social posts and WhatsApp statuses. */
export default async function LandingPage() {
  const { t, tx } = await getTranslator();
  const [settings, cities, user] = await Promise.all([getSettings(), listActiveCities(), getCurrentUser()]);
  const towns = cities.map((city) => city.name);
  const rate = settings.discountRate > 0 ? percent(settings.discountRate) : null;
  const callHref = settings.callUsPhone ? `tel:+237${settings.callUsPhone}` : null;
  const whatsappHref = settings.whatsappPhone ? `https://wa.me/${internationalPhone(settings.whatsappPhone)}?text=${encodeURIComponent(t("landing.whatsappHello"))}` : null;
  const siteHost = (process.env.SITE_URL || "http://localhost:3000").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const maintenance = settings.operationalStatus === "maintenance";

  const sectionTitle = "text-[30px] leading-tight font-extrabold md:text-[44px]";
  const faqs = ["price", "pay", "account", "towns", "code", "forbidden"] as const;

  return (
    <div className="min-h-dvh bg-white">
      {maintenance && <div className="bg-amber px-4 py-2 text-center text-sm font-extrabold text-navy">{t("site.maintenanceBody")}</div>}
      <LandingHeader loggedIn={Boolean(user)} />

      {/* Hero */}
      <section className="bg-navy pb-24 text-white md:pb-28">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 pt-6 md:px-8 md:pt-10 lg:grid-cols-[1.05fr_1fr]">
          <div className="animate-rise">
            {towns.length > 0 && (
              <p className="inline-flex rounded-full bg-navy-soft px-4 py-1.5 text-sm font-bold text-amber">{towns.join(" · ")}</p>
            )}
            <h1 className="mt-5 text-[44px] leading-[1.02] font-extrabold tracking-tight sm:text-[56px] lg:text-[72px]">
              {t("landing.heroLine1")}<br />{t("landing.heroLine2")}<br /><span className="text-amber">{t("landing.heroLine3")}</span>
            </h1>
            <p className="mt-5 max-w-[560px] text-lg leading-relaxed text-side-text md:text-xl">{t("landing.heroBody")}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/request" className={buttonClass("action", "lg", "animate-pulse-amber px-8")}>{t("landing.send")} →</Link>
              <a href="#track" className={buttonClass("secondary", "lg", "bg-transparent px-8 text-white shadow-[inset_0_0_0_2px_#5B6BA0]")}>{t("landing.track")}</a>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold">
              {rate && <span className="rounded-full bg-navy-soft px-3 py-1.5">★ {t("landing.chipDiscount", { rate })}</span>}
              <span className="rounded-full bg-navy-soft px-3 py-1.5">{t("landing.chipNoOnline")}</span>
              <span className="rounded-full bg-navy-soft px-3 py-1.5">{t("landing.chipLocalIntercity")}</span>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[28px] shadow-[0_24px_60px_#0006]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/hero.svg" alt={t("landing.heroArt")} width={620} height={540} fetchPriority="high" className="block h-auto w-full" />
            </div>
            <span className="absolute top-[24%] left-[4%] inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-navy shadow-lg md:text-base">
              <span className="h-3 w-3 rounded-full bg-amber" />{t("landing.badgePickup")}
            </span>
            <span className="absolute right-[6%] bottom-[22%] rounded-full bg-green px-4 py-2 text-sm font-extrabold text-white shadow-lg md:text-base">✓ {t("landing.badgeDelivered")}</span>
            {callHref && (
              <a href={callHref} className={buttonClass("secondary", "lg", "mt-5 w-full lg:hidden")}><IconPhone size={20} />{t("site.callUs")}</a>
            )}
          </div>
        </div>
      </section>

      {/* Track */}
      <div id="track" className="relative z-10 mx-auto -mt-14 max-w-[1200px] scroll-mt-24 px-4 md:px-8">
        <div className="rounded-[22px] bg-white p-5 shadow-[0_18px_44px_#0b1b3f26] md:p-6">
          <TrackBox />
        </div>
      </div>

      {/* Facts (all true and computed: no invented numbers) */}
      <section className="bg-mist py-12">
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-4 text-center md:grid-cols-4 md:px-8">
          {[
            { big: t("landing.factCall"), small: t("landing.factCallText") },
            { big: t("landing.factTowns", { count: towns.length }), small: t("landing.factTownsText") },
            rate ? { big: t("landing.factDiscount", { rate }), small: t("landing.factDiscountText") } : { big: t("landing.factCash"), small: t("landing.factCashText") },
            { big: t("landing.factLink"), small: t("landing.factLinkText") },
          ].map((fact) => (
            <div key={fact.big}>
              <p className="text-[34px] leading-tight font-extrabold text-indigo md:text-[48px]">{fact.big}</p>
              <p className="font-bold text-muted">{fact.small}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto max-w-[1280px] px-4 md:px-8">
          <h2 className={`${sectionTitle} text-center`}>{t("landing.howTitle")}</h2>
          <p className="mt-3 text-center text-lg text-muted">{t("landing.howSub")}</p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step) => (
              <li key={step} className={`flex flex-col overflow-hidden rounded-[22px] bg-white p-3 shadow-[var(--shadow-card)] ${step % 2 === 0 ? "lg:mt-8" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/landing/step-${step}.svg`} alt="" width={300} height={200} loading="lazy" className="block h-auto w-full rounded-2xl" />
                <div className="flex items-start gap-3 p-2 pt-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-extrabold text-amber">{step}</span>
                  <div>
                    <p className="text-lg leading-tight font-extrabold">{tx(`landing.step${step}Title`)}</p>
                    <p className="mt-1 text-sm text-muted">{tx(`landing.step${step}Text`)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Same city or between towns */}
      <section className="bg-navy py-16 text-white md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <h2 className={`${sectionTitle} text-center`}>{t("landing.typesTitle")}</h2>
          <p className="mt-3 text-center text-lg text-side-text">{t("landing.typesSub")}</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-[26px] bg-white p-4 text-navy">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/landing/step-3.svg" alt="" width={300} height={200} loading="lazy" className="block h-auto w-full rounded-[20px]" />
              <p className="mt-4 px-2 text-2xl font-extrabold">{t("landing.sameCity")}</p>
              <p className="mt-1 px-2 pb-2 text-muted">{t("landing.sameCityText")}</p>
            </div>
            <div className="rounded-[26px] bg-amber p-4 text-navy">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/landing/step-4.svg" alt="" width={300} height={200} loading="lazy" className="block h-auto w-full rounded-[20px]" />
              </div>
              <p className="mt-4 px-2 text-2xl font-extrabold">{t("landing.anotherTown")}</p>
              <p className="mt-1 px-2 pb-2">{t("landing.anotherTownText")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* One link */}
      <section className="bg-mist py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-4 md:px-8 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-[340px] -rotate-3 overflow-hidden rounded-[30px] bg-white shadow-[0_24px_60px_#0b1b3f33]">
            <TrackingScene progress={0.62} label={t("track.sceneLabel")} />
            <div className="p-5">
              <p className="text-2xl font-extrabold">{t("status.in_transit")}</p>
              <p className="text-sm text-muted">{t("landing.linkMockText")}</p>
              <div className="mt-3 flex gap-1" aria-hidden="true">
                {Array.from({ length: 10 }, (_, index) => <span key={index} className={`h-1.5 flex-1 rounded-full ${index < 6 ? "bg-navy" : index === 6 ? "bg-amber" : "bg-cloud"}`} />)}
              </div>
            </div>
          </div>
          <div>
            <h2 className={sectionTitle}>{t("landing.linkTitle")}</h2>
            <p className="mt-4 text-lg text-muted">{t("landing.linkText")}</p>
            <div className="mt-6 max-w-[360px] rounded-2xl bg-white p-2 shadow-[var(--shadow-card)]">
              <div className="flex items-center gap-3 rounded-xl bg-navy p-3 text-white">
                <Logo onDark size={30} withText={false} />
                <div>
                  <p className="font-extrabold leading-tight">{t("landing.linkPreviewTitle")}</p>
                  <p className="text-xs text-side-text">{t("landing.linkPreviewSub")}</p>
                </div>
              </div>
              <p className="px-2 pt-2 pb-1 text-sm break-all text-indigo">{siteHost}/t/7KQ2M9XH4RTA</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-extrabold text-indigo">
              {["landing.linkChip1", "landing.linkChip2", "landing.linkChip3"].map((key) => <span key={key} className="rounded-full bg-indigo-tint px-3 py-1.5">✓ {tx(key)}</span>)}
            </div>
          </div>
        </div>
      </section>

      {/* How you pay */}
      <section id="pay" className="scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <h2 className={`${sectionTitle} text-center`}>{t("landing.payTitle")}</h2>
          <p className="mx-auto mt-3 max-w-[720px] text-center text-lg text-muted">{t("landing.paySub")}</p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {(["request", "pickup", "delivery"] as const).map((moment, index) => (
              <div key={moment} className={`rounded-[22px] p-6 ${index === 0 ? "bg-navy text-white" : "bg-mist"}`}>
                <p className={`text-sm font-extrabold uppercase ${index === 0 ? "text-amber" : "text-indigo"}`}>{tx(`landing.payWhen.${moment}`)}</p>
                <p className="mt-2 text-xl font-extrabold">{tx(`landing.payWho.${moment}`)}</p>
                <p className={`mt-2 ${index === 0 ? "text-side-text" : "text-muted"}`}>{tx(`landing.payText.${moment}`)}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-center text-sm font-bold text-muted">{t("landing.payNote")}</p>
        </div>
      </section>

      {/* Why NAFF */}
      <section className="bg-mist py-16 md:py-24">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          <h2 className={`${sectionTitle} text-center`}>{t("landing.whyTitle")}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <IconUser size={22} />, key: "pay" },
              { icon: <IconShield size={22} />, key: "private" },
              { icon: <IconPhone size={22} />, key: "talk" },
              { icon: <IconBox size={22} />, key: "rules" },
            ].map((item) => (
              <div key={item.key} className="rounded-[22px] bg-white p-6 shadow-[var(--shadow-card)]">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber text-navy">{item.icon}</span>
                <p className="mt-4 text-xl font-extrabold">{tx(`landing.why.${item.key}.title`)}</p>
                <p className="mt-2 text-muted">{tx(`landing.why.${item.key}.text`)}</p>
                {item.key === "rules" && <Link href="/forbidden" className="mt-3 inline-flex min-h-10 items-center font-bold text-indigo underline">{t("form.seeForbidden")}</Link>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Towns */}
      <section id="towns" className="scroll-mt-20 py-16 md:py-24">
        <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-4 md:px-8 lg:grid-cols-2">
          <div>
            <h2 className={sectionTitle}>{t("landing.townsTitle")}</h2>
            <p className="mt-4 text-lg text-muted">{t("landing.townsText")}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {towns.map((town) => <span key={town} className="rounded-full bg-indigo-tint px-3.5 py-1.5 font-bold text-indigo">{town}</span>)}
            </div>
            <Link href="/request" className={buttonClass("primary", "lg", "mt-7 px-8")}>{t("landing.send")} →</Link>
          </div>
          {towns.length > 0 && <TownsMap towns={towns} label={t("landing.townsMapLabel")} />}
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-mist py-16 md:py-24">
        <div className="mx-auto max-w-[860px] px-4 md:px-8">
          <h2 className={`${sectionTitle} text-center`}>{t("landing.faqTitle")}</h2>
          <div className="mt-10 flex flex-col gap-3">
            {faqs.map((faq) => (
              <details key={faq} className="group rounded-[18px] bg-white shadow-[var(--shadow-card)]">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-lg font-extrabold">
                  {tx(`landing.faq.${faq}.q`)}
                  <span className="text-2xl text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="px-5 pb-5 text-muted">{tx(`landing.faq.${faq}.a`, { rate: rate ?? "0%" })}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section className="bg-amber py-16 text-navy md:py-20">
        <div className="mx-auto max-w-[900px] px-4 text-center md:px-8">
          <h2 className="text-[34px] leading-tight font-extrabold md:text-[56px]">{t("landing.ctaTitle")}</h2>
          <p className="mt-3 text-lg font-bold">{rate ? t("landing.ctaDiscount", { rate }) : t("landing.ctaText")}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/request" className={buttonClass("primary", "lg", "px-8")}>{t("landing.send")} →</Link>
            {callHref && <a href={callHref} className={buttonClass("secondary", "lg", "bg-transparent px-8 shadow-[inset_0_0_0_2px_var(--color-navy)]")}><IconPhone size={20} />{t("landing.callNumber", { phone: formatPhone(settings.callUsPhone) })}</a>}
            {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className={buttonClass("secondary", "lg", "bg-transparent px-8 shadow-[inset_0_0_0_2px_var(--color-navy)]")}><IconWhatsApp size={20} />WhatsApp</a>}
          </div>
          {!user && rate && <Link href="/account/register" className="mt-5 inline-flex min-h-10 items-center font-extrabold underline">{t("site.createAccount")}</Link>}
        </div>
      </section>

      <footer className="bg-navy text-side-text">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8">
          <Logo onDark size={28} />
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
            <a href="#how" className="hover:text-white">{t("landing.navHow")}</a>
            <a href="#track" className="hover:text-white">{t("landing.navTrack")}</a>
            <Link href="/forbidden" className="hover:text-white">{t("forbidden.title")}</Link>
            <Link href={user ? "/home" : "/account/login"} className="hover:text-white">{user ? t("landing.mySpace") : t("site.login")}</Link>
            {!user && <Link href="/account/register" className="hover:text-white">{t("site.createAccount")}</Link>}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <LanguageSwitch onDark />
            <span>© {new Date().getFullYear()} NAFF</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
