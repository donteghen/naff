"use client";

import { setAvailableAction } from "@/actions/driver";
import { useT } from "@/i18n/client";
import { useAction } from "../use-action";

export function AvailabilitySwitch({ available }: { available: boolean }) {
  const { t } = useT();
  const { run, pending } = useAction();
  const option = (value: boolean, label: string) => (
    <button
      type="button"
      disabled={pending}
      aria-pressed={available === value}
      onClick={() => available !== value && run("setAvailable", () => setAvailableAction(value))}
      className={`min-h-10 rounded-full px-4 text-sm font-extrabold transition ${available === value ? (value ? "bg-green text-white" : "bg-navy text-white") : "text-muted"}`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex rounded-full bg-cloud p-1" role="group" aria-label={t("driver.availability")}>
      {option(true, t("driver.available"))}
      {option(false, t("driver.offline"))}
    </div>
  );
}
