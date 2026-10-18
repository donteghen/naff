// Operational limits and switches, read from env with safe defaults.

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const config = {
  loginMaxFails: () => numberFromEnv("LOGIN_MAX_FAILS", 5),
  loginWindowMinutes: () => numberFromEnv("LOGIN_WINDOW_MINUTES", 15),
  pinResetMax: () => numberFromEnv("PIN_RESET_MAX", 3),
  pinResetWindowMinutes: () => numberFromEnv("PIN_RESET_WINDOW_MINUTES", 60),
  tempPinTtlMinutes: () => numberFromEnv("TEMP_PIN_TTL_MINUTES", 30),
  deliveryCodeMaxAttempts: () => numberFromEnv("DELIVERY_CODE_MAX_ATTEMPTS", 3),
  refreshSeconds: () => numberFromEnv("REFRESH_SECONDS", 15),
  fallbackToRefresh: () => process.env.FALLBACK_TO_REFRESH === "true",
  debugLog: () => process.env.DEBUG_LOG === "true",
  ablyConfigured: () => Boolean(process.env.ABLY_API_KEY),
  sessionDays: 7,
  siteUrl: () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  panelUrl: () => (process.env.PANEL_URL || "http://panel.localhost:3000").replace(/\/$/, ""),
};
