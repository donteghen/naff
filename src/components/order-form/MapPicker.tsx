"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { Button } from "../ui";
import "leaflet/dist/leaflet.css";

const DOUALA: [number, number] = [4.0511, 9.7679];

/** Full-screen OpenStreetMap: tap to drop the pin, then confirm. Leaflet is loaded only when opened. */
export function MapPicker({ initial, onConfirm, onClose }: { initial?: { lat: number; lng: number }; onConfirm: (point: { lat: number; lng: number }) => void; onClose: () => void }) {
  const { t } = useT();
  const container = useRef<HTMLDivElement>(null);
  const [point, setPoint] = useState(initial ?? null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;
      map = L.map(container.current).setView(initial ? [initial.lat, initial.lng] : DOUALA, initial ? 16 : 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      const icon = L.divIcon({ className: "", html: '<div style="width:22px;height:22px;border-radius:50%;background:#FFB81C;border:4px solid #0B1B3F;box-shadow:0 2px 6px #0003"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
      let marker = initial ? L.marker([initial.lat, initial.lng], { icon }).addTo(map) : null;
      map.on("click", (event) => {
        const next = { lat: Number(event.latlng.lat.toFixed(6)), lng: Number(event.latlng.lng.toFixed(6)) };
        if (marker) marker.setLatLng(event.latlng);
        else marker = L.marker(event.latlng, { icon }).addTo(map!);
        setPoint(next);
      });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [initial]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy/60 p-3 md:p-10" role="dialog" aria-modal="true">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-3xl bg-white">
        <p className="p-4 font-extrabold">{t("place.tapMap")}</p>
        <div ref={container} className="min-h-[300px] flex-1" />
        <div className="grid grid-cols-2 gap-2 p-3">
          <Button variant="secondary" size="md" onClick={onClose}>{t("common.cancel")}</Button>
          <Button variant="action" size="md" disabled={!point} onClick={() => point && onConfirm(point)}>{t("place.usePin")}</Button>
        </div>
      </div>
    </div>
  );
}
