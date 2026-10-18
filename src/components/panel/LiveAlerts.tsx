"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { IconBell } from "../Icons";

type Alert = { event: string; orderId: string; number: number; status: string; at: string };

/** One short two-tone beep. Same sound for every event. */
function beep(context: AudioContext) {
  const now = context.currentTime;
  [880, 1175].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, now + index * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.35, now + index * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.18 + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now + index * 0.18);
    oscillator.stop(now + index * 0.18 + 0.17);
  });
}

/**
 * Admin live alerts through Ably: sound, short toast, badge, and a data refresh.
 * Without Ably: refresh every few seconds only if FALLBACK_TO_REFRESH is on, otherwise "Live alerts off".
 * The badge counts events since the page was opened (no history).
 */
export function LiveAlerts({ ablyConfigured, fallbackToRefresh, refreshSeconds }: { ablyConfigured: boolean; fallbackToRefresh: boolean; refreshSeconds: number }) {
  const { t, tx } = useT();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [count, setCount] = useState(0);
  const [toast, setToast] = useState<Alert | null>(null);
  const audio = useRef<AudioContext | null>(null);

  // Browsers only allow sound after a tap or click on the page.
  useEffect(() => {
    function unlock() {
      if (!audio.current) audio.current = new AudioContext();
      audio.current.resume().then(() => setSoundOn(audio.current?.state === "running"));
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!ablyConfigured) {
      if (!fallbackToRefresh) return;
      const timer = setInterval(() => router.refresh(), refreshSeconds * 1000);
      return () => clearInterval(timer);
    }
    // Ably Server-Sent Events: a token from our server, then a plain EventSource.
    // When the connection drops or the token expires, get a new token and reconnect after a short pause.
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    async function connect() {
      if (closed) return;
      try {
        const response = await fetch("/api/ably-token", { cache: "no-store" });
        if (response.status === 401) return router.push("/login?ended=1");
        const { token } = (await response.json()) as { token?: string };
        if (!token || closed) throw new Error("no token");
        source = new EventSource(`https://realtime.ably.io/sse?v=1.2&channels=admin-alerts&accessToken=${encodeURIComponent(token)}`);
        source.onopen = () => setConnected(true);
        source.onmessage = (event) => {
          const message = JSON.parse(event.data) as { name?: string; data?: unknown };
          if (message.name !== "order") return;
          const alert = (typeof message.data === "string" ? JSON.parse(message.data) : message.data) as Alert;
          setCount((value) => value + 1);
          setToast(alert);
          if (audio.current?.state === "running") beep(audio.current);
          router.refresh();
        };
        source.onerror = () => {
          setConnected(false);
          source?.close();
          scheduleReconnect();
        };
      } catch {
        setConnected(false);
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (closed || retry) return;
      retry = setTimeout(() => {
        retry = null;
        connect();
      }, 5000);
    }

    connect();
    return () => {
      closed = true;
      source?.close();
      if (retry) clearTimeout(retry);
    };
  }, [ablyConfigured, fallbackToRefresh, refreshSeconds, router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  let chip = <span className="rounded-full bg-cloud px-3 py-1.5 text-xs font-extrabold text-muted" title={t("panel.liveOff")}>●<span className="ml-1 hidden sm:inline">{t("panel.liveOff")}</span></span>;
  if (ablyConfigured) {
    chip = connected ? (
      <span className="rounded-full bg-green-tint px-3 py-1.5 text-xs font-extrabold text-green-ink">● {t("panel.live")}<span className="hidden sm:inline"> · {soundOn ? t("panel.soundOn") : t("panel.tapForSound")}</span></span>
    ) : (
      <span className="rounded-full bg-amber-soft px-3 py-1.5 text-xs font-extrabold text-amber-ink">● {t("panel.connecting")}</span>
    );
  } else if (fallbackToRefresh) {
    chip = <span className="rounded-full bg-indigo-tint px-3 py-1.5 text-xs font-extrabold text-indigo" title={t("panel.autoRefresh", { seconds: refreshSeconds })}>↻<span className="ml-1 hidden sm:inline">{t("panel.autoRefresh", { seconds: refreshSeconds })}</span></span>;
  }

  return (
    <>
      {chip}
      <button type="button" onClick={() => setCount(0)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-extrabold shadow-[var(--shadow-card)]" aria-label={t("panel.alerts")}>
        <IconBell size={15} />
        {t("panel.alerts")} {count > 0 && <span className="rounded-full bg-red px-1.5 text-white">{count}</span>}
      </button>
      {toast && (
        <a href={`/orders/${toast.orderId}`} className="fixed right-4 bottom-4 z-50 max-w-sm rounded-2xl bg-navy p-4 text-white shadow-[var(--shadow-float)] animate-rise">
          <p className="text-xs font-bold text-amber">{tx(`alert.${toast.event}`)}</p>
          <p className="font-extrabold">NF-{toast.number} · {tx(`status.${toast.status}`)}</p>
        </a>
      )}
    </>
  );
}
