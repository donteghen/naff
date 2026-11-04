"use client";

import { useRouter } from "next/navigation";
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
import { IconPlus } from "../Icons";
import { Modal } from "../Modal";
import { useAction } from "../use-action";
import { Button, Chip, Field, Notice, inputClass } from "../ui";
import { AccountActions } from "./AccountActions";
import { PersonForm } from "./PersonForm";
import { Cell, Row, RowActions, Table } from "./Table";

type City = { id: string; name: string; active: boolean; drivers: number };
type Agency = { id: string; name: string; phone: string; active: boolean; branches: { cityId: string; address: string }[] };

function Feedback({ error, values, fields, saved }: { error: string | null; values?: Record<string, string | number>; fields: Record<string, string>; saved: boolean }) {
  const { t, tx } = useT();
  if (error) return <Notice tone="error">{error === "errors.checkForm" ? Object.values(fields).map((key) => tx(key)).join(" · ") : tx(error, values)}</Notice>;
  if (saved) return <Notice tone="success">{t("common.saved")}</Notice>;
  return null;
}

/** Intro on the left, the add button on the right, above a settings table. */
function Toolbar({ intro, children }: { intro?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {intro ? <p className="text-sm text-muted">{intro}</p> : <span />}
      <div className="flex justify-end">{children}</div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <Button size="md" variant="action" onClick={onClick}><IconPlus size={18} />{label}</Button>;
}

function CityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, tx } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [name, setName] = useState("");
  return (
    <Modal open={open} onClose={onClose} title={t("settings.addCity")}>
      <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); run("addCity", () => saveCityAction({ name, active: true }), () => { setName(""); onClose(); }); }}>
        <Field label={t("table.city")} error={fields.name ? tx(fields.name) : undefined}>
          <input className={inputClass(Boolean(fields.name))} value={name} onChange={(event) => setName(event.target.value)} placeholder={t("settings.newCity")} required autoFocus />
        </Field>
        <Feedback error={error} values={errorValues} fields={fields} saved={false} />
        <Button type="submit" size="md" disabled={pending}>{pending ? t("common.wait") : t("common.add")}</Button>
      </form>
    </Modal>
  );
}

export function CitiesForm({ cities }: { cities: City[] }) {
  const { t } = useT();
  const { run, pending, error, errorValues, fields } = useAction();
  const [adding, setAdding] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <Toolbar><AddButton label={t("settings.addCity")} onClick={() => setAdding(true)} /></Toolbar>
      <Feedback error={error} values={errorValues} fields={fields} saved={false} />
      <div className="overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line)]">
        <Table columns={[{ label: t("table.city") }, { label: t("nav.drivers"), className: "text-right" }, { label: t("orders.status") }, { label: t("table.actions"), className: "text-right" }]}>
          {cities.map((city) => (
            <Row key={city.id}>
              <Cell className="font-extrabold">{city.name}</Cell>
              <Cell className="text-right tabular-nums">{city.drivers}</Cell>
              <Cell><Chip tone={city.active ? "green" : "grey"}>{city.active ? t("people.active") : t("people.inactive")}</Chip></Cell>
              <Cell>
                <RowActions>
                  <Button size="sm" variant="secondary" disabled={pending} onClick={() => run("saveCity", () => saveCityAction({ id: city.id, name: city.name, active: !city.active }))}>
                    {city.active ? t("settings.switchOff") : t("settings.switchOn")}
                  </Button>
                </RowActions>
              </Cell>
            </Row>
          ))}
        </Table>
      </div>
      <CityModal open={adding} onClose={() => setAdding(false)} />
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
    <div className="flex flex-col gap-3">
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
      <div className="grid grid-cols-2 gap-2">
        <Button size="md" variant="secondary" onClick={onDone}>{t("common.cancel")}</Button>
        <Button size="md" disabled={pending} onClick={() => run("saveAgency", () => saveAgencyAction({ id: agency?.id, name, phone, active, branches }), onDone)}>{pending ? t("common.wait") : t("common.save")}</Button>
      </div>
    </div>
  );
}

export function AgenciesForm({ agencies, cities }: { agencies: Agency[]; cities: City[] }) {
  const { t } = useT();
  // null: closed, "new": adding, otherwise the id of the agency being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const cityName = (id: string) => cities.find((city) => city.id === id)?.name ?? "?";
  const current = agencies.find((agency) => agency.id === editing) ?? null;
  return (
    <div className="flex flex-col gap-4">
      <Toolbar intro={t("settings.agenciesIntro")}><AddButton label={t("settings.addAgency")} onClick={() => setEditing("new")} /></Toolbar>
      <div className="overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line)]">
        <Table
          columns={[
            { label: t("table.agency") },
            { label: t("auth.phone"), className: "hidden md:table-cell" },
            { label: t("table.branches"), className: "hidden md:table-cell" },
            { label: t("orders.status") },
            { label: t("table.actions"), className: "text-right" },
          ]}
        >
          {agencies.map((agency) => (
            <Row key={agency.id}>
              <Cell>
                <p className="font-extrabold">{agency.name}</p>
                <p className="text-xs text-muted md:hidden">{agency.branches.map((branch) => cityName(branch.cityId)).join(" · ")}</p>
              </Cell>
              <Cell className="hidden whitespace-nowrap tabular-nums md:table-cell">{agency.phone ? formatPhone(agency.phone) : "—"}</Cell>
              <Cell className="hidden md:table-cell">
                {agency.branches.map((branch) => (
                  <p key={branch.cityId}><b>{cityName(branch.cityId)}</b>{branch.address ? <span className="text-muted"> · {branch.address}</span> : null}</p>
                ))}
              </Cell>
              <Cell><Chip tone={agency.active ? "green" : "grey"}>{agency.active ? t("people.active") : t("people.inactive")}</Chip></Cell>
              <Cell><RowActions><Button size="sm" variant="secondary" onClick={() => setEditing(agency.id)}>{t("common.edit")}</Button></RowActions></Cell>
            </Row>
          ))}
        </Table>
      </div>
      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("settings.addAgency") : t("settings.editAgency")}>
        <AgencyEditor key={editing ?? "closed"} agency={current} cities={cities} onDone={() => setEditing(null)} />
      </Modal>
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
  const router = useRouter();
  // null: closed, "new": adding, otherwise the id of the admin being edited.
  const [editing, setEditing] = useState<string | null>(null);
  const current = admins.find((admin) => admin.id === editing) ?? null;
  const close = () => { setEditing(null); router.refresh(); };
  return (
    <div className="flex flex-col gap-4">
      <Toolbar><AddButton label={t("admins.add")} onClick={() => setEditing("new")} /></Toolbar>
      <div className="overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_var(--color-line)]">
        <Table
          columns={[
            { label: t("form.name") },
            { label: t("auth.phone"), className: "hidden md:table-cell" },
            { label: t("site.email"), className: "hidden lg:table-cell" },
            { label: t("table.role"), className: "hidden sm:table-cell" },
            { label: t("orders.status") },
            { label: t("table.actions"), className: "text-right" },
          ]}
        >
          {admins.map((admin) => (
            <Row key={admin.id}>
              <Cell>
                <p className="font-extrabold">{admin.name}</p>
                <p className="text-xs text-muted md:hidden">{formatPhone(admin.phone)}</p>
              </Cell>
              <Cell className="hidden whitespace-nowrap tabular-nums md:table-cell">{formatPhone(admin.phone)}</Cell>
              <Cell className="hidden max-w-[220px] truncate lg:table-cell">{admin.email || "—"}</Cell>
              <Cell className="hidden sm:table-cell">{admin.isSuperAdmin ? <Chip tone="navy">{t("panel.superAdmin")}</Chip> : t("table.admin")}</Cell>
              <Cell><Chip tone={admin.active ? "green" : "grey"}>{admin.active ? t("people.active") : t("people.inactive")}</Chip></Cell>
              <Cell>{!admin.isSuperAdmin && <RowActions><Button size="sm" variant="secondary" onClick={() => setEditing(admin.id)}>{t("common.edit")}</Button></RowActions>}</Cell>
            </Row>
          ))}
        </Table>
      </div>
      <Modal open={editing !== null} onClose={close} title={editing === "new" ? t("admins.add") : t("admins.edit")}>
        {editing === "new" && (
          <PersonForm initial={{ name: "", phone: "", email: "" }} withEmail submitLabel={t("admins.create")} submit={(values) => createAdminAction({ name: values.name, phone: values.phone, email: values.email ?? "" })} onDone={close} />
        )}
        {current && (
          <div className="flex flex-col gap-5">
            <PersonForm initial={{ name: current.name, phone: formatPhone(current.phone), email: current.email }} withEmail submitLabel={t("common.save")} submit={(values) => updateAdminAction(current.id, { name: values.name, phone: values.phone, email: values.email ?? "" })} onDone={close} />
            <div className="flex flex-col gap-3 border-t border-line pt-4">
              <AccountActions active={current.active} resetPin={() => resetAdminPinAction(current.id)} setActive={(active) => setAdminActiveAction(current.id, active)} deactivateLabel={t("people.deactivate")} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
