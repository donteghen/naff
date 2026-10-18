"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { buttonClass, inputClass } from "../ui";

/** "Already sent something?" Paste a tracking link or type the code, then open the tracking page. */
export function TrackBox() {
  const { t } = useT();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const afterPath = value.includes("/t/") ? value.slice(value.lastIndexOf("/t/") + 3) : value;
    const code = afterPath.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!code) return setError(true);
    router.push(`/t/${code}`);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
      <p className="text-lg leading-tight font-extrabold md:w-48 md:shrink-0">{t("landing.trackTitle")}</p>
      <label className="flex-1">
        <span className="sr-only">{t("landing.trackPlaceholder")}</span>
        <input
          className={`${inputClass(error)} bg-mist`}
          value={value}
          onChange={(event) => { setValue(event.target.value); setError(false); }}
          placeholder={t("landing.trackPlaceholder")}
          autoComplete="off"
          enterKeyHint="go"
        />
      </label>
      <button type="submit" className={buttonClass("primary", "lg", "md:px-8")}>{t("landing.trackIt")}</button>
    </form>
  );
}
