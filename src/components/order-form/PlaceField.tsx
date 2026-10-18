"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useT } from "@/i18n/client";
import { parseCoordinates, type Place } from "@/lib/location";
import { IconClose, IconLocate, IconPin } from "../Icons";
import { Field, inputClass } from "../ui";

const MapPicker = dynamic(() => import("./MapPicker").then((module) => module.MapPicker), { ssr: false });

/**
 * One place (pickup or drop-off): address and landmark text (always required),
 * plus optional coordinates from a map pin, a pasted WhatsApp / Maps link, or "use my location".
 */
export function PlaceField({ label, value, onChange, error }: { label: string; value: Place; onChange: (place: Place) => void; error?: string }) {
  const { t } = useT();
  const [mode, setMode] = useState<"none" | "paste">("none");
  const [mapOpen, setMapOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [message, setMessage] = useState("");
  const hasPoint = value.lat !== undefined && value.lng !== undefined && value.lat !== null && value.lng !== null;

  function setPoint(point: { lat: number; lng: number }) {
    onChange({ ...value, lat: point.lat, lng: point.lng });
    setMessage("");
  }

  function usePasted(text: string) {
    setPasted(text);
    const point = parseCoordinates(text);
    if (point) {
      setPoint(point);
      setMode("none");
      setPasted("");
    } else if (text.trim()) {
      setMessage(t("place.noCoordinates"));
    }
  }

  function locate() {
    if (!navigator.geolocation) return setMessage(t("place.noGeolocation"));
    setMessage(t("common.wait"));
    navigator.geolocation.getCurrentPosition(
      (position) => setPoint({ lat: Number(position.coords.latitude.toFixed(6)), lng: Number(position.coords.longitude.toFixed(6)) }),
      () => setMessage(t("place.noGeolocation")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const chip = "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-extrabold";
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} error={error}>
        <textarea
          className={`${inputClass(Boolean(error))} min-h-20 resize-none`}
          value={value.text}
          onChange={(event) => onChange({ ...value, text: event.target.value })}
          placeholder={t("place.placeholder")}
          rows={2}
        />
      </Field>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMapOpen(true)} className={`${chip} bg-navy text-white`}><IconPin size={15} />{t("place.mapPin")}</button>
        <button type="button" onClick={() => setMode(mode === "paste" ? "none" : "paste")} className={`${chip} ${mode === "paste" ? "bg-navy text-white" : "bg-cloud text-navy"}`}>{t("place.pasteLink")}</button>
        <button type="button" onClick={locate} className={`${chip} bg-cloud text-navy`}><IconLocate size={15} />{t("place.myLocation")}</button>
      </div>
      {mode === "paste" && (
        <input className={inputClass()} value={pasted} onChange={(event) => usePasted(event.target.value)} placeholder={t("place.pastePlaceholder")} autoFocus />
      )}
      {hasPoint && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-green-tint px-3 py-2 text-sm font-bold text-green-ink">
          <span>📍 {t("place.attached")} ({value.lat!.toFixed(4)}, {value.lng!.toFixed(4)})</span>
          <button type="button" aria-label={t("place.remove")} onClick={() => onChange({ text: value.text })} className="flex h-9 w-9 items-center justify-center rounded-lg"><IconClose size={16} /></button>
        </div>
      )}
      {message && <p className="text-xs font-bold text-muted">{message}</p>}
      {mapOpen && (
        <MapPicker
          initial={hasPoint ? { lat: value.lat!, lng: value.lng! } : undefined}
          onClose={() => setMapOpen(false)}
          onConfirm={(point) => {
            setPoint(point);
            setMapOpen(false);
          }}
        />
      )}
    </div>
  );
}
