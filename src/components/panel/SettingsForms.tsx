"use client";

import { useState } from "react";
import {
  createAdminAction,
  resetAdminPinAction,
  saveAgencyAction,
  saveCityAction,
  saveContactsAction,
  saveDiscountRateAction,
  setAdminActiveAction,
  setOperationalStatusAction,
  updateAdminAction,
} from "@/actions/panel-admin";
import { useT } from "@/i18n/client";
import { formatPhone } from "@/lib/phone";
import { useWhatsAppMode } from "./order/WhatsAppButtons";
import { useAction } from "../use-action";
import { Button, Chip, Field, Notice, inputClass } from "../ui";
import { AccountActions } from "./AccountActions";
import { PersonForm } from "./PersonForm";

type City = { id: string; name: string; active: boolean; drivers: number };
type Agency = { id: string; name: string; phone: string; active: boolean; branches: { cityId: string; address: string }[] };

function Feedback({ error, values, fields, saved }: { error: string | null; values?: Record<string, string | number>; fields: Record<string, string>; saved: boolean }) {
  const { t, tx } = useT();
  if (error) return <Notice tone="error">{error === "errors.checkForm" ? Object.values(fields).map((key) => tx(key)).join(" · ") : tx(error, values)}</Notice>;
  if (saved) return <Notice tone="success">{t("common.saved")}</Notice>;
  return null;
}

export function CitiesForm({ cities }: { cities: City[] }) {
  const { t } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {cities.map((city) => (
          <li key={city.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-mist px-3 py-2">
            <span className="flex-1 font-bold">{city.name}</span>
            <span className="text-xs text-muted">{t("settings.cityDrivers", { count: city.drivers })}</span>
            <Chip tone={city.active ? "green" : "grey"}>{city.active ? t("people.active") : t("people.inactive")}</Chip>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => run("saveCity", () => saveCityAction({ id: city.id, name: city.name, active: !city.active }))}>
              {city.active ? t("settings.switchOff") : t("settings.switchOn")}
            </Button>
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setSaved(false); run("addCity", () => saveCityAction({ name, active: true }), () => { setName(""); setSaved(true); }); }}>
        <input className={inputClass(Boolean(fields.name))} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("settings.newCity")} required />
        <Button type="submit" size="md" disabled={pending}>{t("common.add")}</Button>
      </form>
      <Feedback error={error} values={errorValues} fields={fields} saved={saved} />
    </div>
  );
}

function AgencyEditor({ agency, cities, onDone }: { agency: Agency | null; cities: City[]; onDone: () => void }) {
  const { t } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [name, setName] = useState(agency?.name ?? "");
  const [phone, setPhone] = useState(agency?.phone ? formatPhone(agency.phone) : "");
  const [active, setActive] = useState(agency?.active ?? true);
  const [branches, setBranches] = useState(agency?.branches ?? []);
  const toggleCity = (cityId: string) =>
    setBranches((current) => (current.some((branch) => branch.cityId === cityId) ? current.filter((branch) => branch.cityId !== cityId) : [...current, { cityId, address: "" }]));
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-mist p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("settings.agencyName")}><input className={inputClass(Boolean(fields.name))} value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label={t("settings.agencyPhone")}><input className={inputClass(Boolean(fields.phone))} value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
      </div>
      <p className="text-sm font-bold">{t("settings.branches")}</p>
      {cities.map((city) => {
        const branch = branches.find((item) => item.cityId === city.id);
        return (
          <div key={city.id} className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-11 min-w-32 items-center gap-2 font-bold">
              <input type="checkbox" className="h-5 w-5" checked={Boolean(branch)} onChange={() => toggleCity(city.id)} />
              {city.name}
            </label>
            {branch && (
              <input
                className={`${inputClass()} flex-1`}
                value={branch.address}
                placeholder={t("settings.branchAddress")}
                onChange={(event) => setBranches((current) => current.map((item) => (item.cityId === city.id ? { ...item, address: event.target.value } : item)))}
              />
            )}
          </div>
        );
      })}
      <label className="flex min-h-11 items-center gap-2 font-bold">
        <input type="checkbox" className="h-5 w-5" checked={active} onChange={(event) => setActive(event.target.checked)} />
        {t("people.active")}
      </label>
      <Feedback error={error} values={errorValues} fields={fields} saved={false} />
      <div className="flex gap-2">
        <Button size="md" variant="secondary" onClick={onDone}>{t("common.cancel")}</Button>
        <Button size="md" disabled={pending} onClick={() => run("saveAgency", () => saveAgencyAction({ id: agency?.id, name, phone, active, branches }), onDone)}>{t("common.save")}</Button>
      </div>
    </div>
  );
}

export function AgenciesForm({ agencies, cities }: { agencies: Agency[]; cities: City[] }) {
  const { t } = useT();
  const [editing, setEditing] = useState<string | null>(null);
  const cityName = (id: string) => cities.find((city) => city.id === id)?.name ?? "?";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t("settings.agenciesIntro")}</p>
      {agencies.map((agency) =>
        editing === agency.id ? (
          <AgencyEditor key={agency.id} agency={agency} cities={cities} onDone={() => setEditing(null)} />
        ) : (
          <div key={agency.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-mist px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{agency.name}</p>
              <p className="text-xs text-muted">{agency.branches.map((branch) => `${cityName(branch.cityId)}${branch.address ? ` (${branch.address})` : ""}`).join(" · ")}</p>
            </div>
            <Chip tone={agency.active ? "green" : "grey"}>{agency.active ? t("people.active") : t("people.inactive")}</Chip>
            <Button size="sm" variant="secondary" onClick={() => setEditing(agency.id)}>{t("common.edit")}</Button>
          </div>
        ),
      )}
      {editing === "new" ? <AgencyEditor agency={null} cities={cities} onDone={() => setEditing(null)} /> : <Button size="md" variant="secondary" onClick={() => setEditing("new")}>{t("settings.addAgency")}</Button>}
    </div>
  );
}

export function PricingForm({ discountRate }: { discountRate: number }) {
  const { t } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [value, setValue] = useState(String(Math.round(discountRate * 1000) / 10));
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <Field label={t("settings.discountRate")} hint={t("settings.discountHint")}>
        <div className="flex items-center gap-2">
          <input className={inputClass(Boolean(fields.discountRate))} inputMode="decimal" value={value} onChange={(event) => { setSaved(false); setValue(event.target.value.replace(/[^\d.]/g, "")); }} />
          <b>%</b>
        </div>
      </Field>
      <Feedback error={error} values={errorValues} fields={fields} saved={saved} />
      <Button size="md" variant="action" disabled={pending} onClick={() => run("saveDiscount", () => saveDiscountRateAction(Number(value)), () => setSaved(true))}>{t("settings.savePricing")}</Button>
    </div>
  );
}

export function ContactsForm({ initial }: { initial: { callUsPhone: string; whatsappPhone: string; mtnNumber: string; mtnName: string; orangeNumber: string; orangeName: string } }) {
  const { t } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const input = (key: keyof typeof form, label: string) => (
    <Field label={label}>
      <input className={inputClass(Boolean(fields[key]))} value={form[key]} onChange={(event) => { setSaved(false); setForm({ ...form, [key]: event.target.value }); }} />
    </Field>
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {input("callUsPhone", t("settings.callUsPhone"))}
        {input("whatsappPhone", t("settings.whatsappPhone"))}
        {input("mtnNumber", t("settings.mtnNumber"))}
        {input("mtnName", t("settings.accountName"))}
        {input("orangeNumber", t("settings.orangeNumber"))}
        {input("orangeName", t("settings.accountName"))}
      </div>
      <Feedback error={error} values={errorValues} fields={fields} saved={saved} />
      <Button size="md" variant="action" disabled={pending} onClick={() => run("saveContacts", () => saveContactsAction(form), () => setSaved(true))}>{t("common.save")}</Button>
    </div>
  );
}

export function StatusForm({ status }: { status: "live" | "maintenance" }) {
  const { t } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [confirming, setConfirming] = useState(false);
  const next = status === "live" ? "maintenance" : "live";
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="font-bold">{t("settings.currentStatus")}</span>
        <Chip tone={status === "live" ? "green" : "amber"}>{t(`settings.status.${status}`)}</Chip>
      </div>
      <p className="text-sm text-muted">{t("settings.maintenanceExplained")}</p>
      <Feedback error={error} values={errorValues} fields={fields} saved={false} />
      <Button size="md" variant={next === "maintenance" ? "danger" : "success"} disabled={pending} onClick={() => (confirming ? run("setStatus", () => setOperationalStatusAction(next), () => setConfirming(false)) : setConfirming(true))}>
        {confirming ? t("common.confirmQuestion") : next === "maintenance" ? t("settings.goMaintenance") : t("settings.goLive")}
      </Button>
    </div>
  );
}

export function WhatsAppPreference() {
  const { t } = useT();
  const [mode, setMode] = useWhatsAppMode();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted">{t("settings.whatsappModeHint")}</p>
      <div className="flex gap-2">
        {(["web", "app"] as const).map((option) => (
          <button key={option} type="button" onClick={() => setMode(option)} className={`min-h-11 rounded-full px-4 text-sm font-extrabold ${mode === option ? "bg-navy text-white" : "bg-cloud text-muted"}`}>
            {t(`settings.whatsapp.${option}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

type AdminRow = { id: string; name: string; phone: string; email: string; isSuperAdmin: boolean; active: boolean; lastSeenAt: string | null };

export function AdminsForm({ admins }: { admins: AdminRow[] }) {
  const { t } = useT();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {admins.map((admin) => (
        <div key={admin.id} className="flex flex-col gap-2 rounded-xl bg-mist p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">{admin.name}</p>
              <p className="text-xs text-muted">{formatPhone(admin.phone)}{admin.email ? ` · ${admin.email}` : ""}</p>
            </div>
            {admin.isSuperAdmin && <Chip tone="navy">{t("panel.superAdmin")}</Chip>}
            <Chip tone={admin.active ? "green" : "grey"}>{admin.active ? t("people.active") : t("people.inactive")}</Chip>
            {!admin.isSuperAdmin && <Button size="sm" variant="secondary" onClick={() => setEditing(editing === admin.id ? null : admin.id)}>{editing === admin.id ? t("common.close") : t("common.edit")}</Button>}
          </div>
          {editing === admin.id && (
            <div className="flex flex-col gap-3 border-t border-line pt-3">
              <PersonForm initial={{ name: admin.name, phone: formatPhone(admin.phone), email: admin.email }} withEmail submitLabel={t("common.save")} submit={(values) => updateAdminAction(admin.id, { name: values.name, phone: values.phone, email: values.email ?? "" })} />
              <AccountActions active={admin.active} resetPin={() => resetAdminPinAction(admin.id)} setActive={(active) => setAdminActiveAction(admin.id, active)} deactivateLabel={t("people.deactivate")} />
            </div>
          )}
        </div>
      ))}
      <div className="rounded-xl bg-white p-3 shadow-[inset_0_0_0_2px_var(--color-field)]">
        <p className="mb-3 font-extrabold">{t("admins.add")}</p>
        <PersonForm key={admins.length} initial={{ name: "", phone: "", email: "" }} withEmail submitLabel={t("admins.create")} submit={(values) => createAdminAction({ name: values.name, phone: values.phone, email: values.email ?? "" })} />
      </div>
    </div>
  );
}
