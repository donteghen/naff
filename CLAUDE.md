# NAFF — project rules

- `SPEC.md` is the source of truth for behaviour. Update it before changing business rules. `docs/source/` holds the original documents; SPEC wins over them.
- This project is self-contained. Nothing goes in the parent `mvp/` folder: no shared files, no git there.
- The designs in `docs/design/` are for look and feel only. Never copy logic from them.
- Three apps, one codebase: customer site, driver app, admin panel, separated by host in `src/middleware.ts`. Each app only uses its own session cookie and its own server actions.
- Business rules belong in `src/server/services/*`. Pages and actions only validate input (Zod), check the session and call services.
- Every order change goes through the order service, which writes the activity log. Every admin-side change outside orders writes the audit log. Nothing is hard-deleted.
- All interface text goes in `src/i18n/fr.ts` and `src/i18n/en.ts`. French is the default, and TypeScript fails if a key is missing in English.
- Money is integer XAF. Prices and totals are always calculated on the server. Time zone Africa/Douala.
- The platform records manual work. No automation, fallbacks, retries, polling or conveniences that are not in SPEC. If Ably or SMTP is not configured, that feature is off (except the explicit `FALLBACK_TO_REFRESH` flag). A failed ntfy post is logged and never blocks an action.
- Every message about an order (driver notifications, WhatsApp texts) uses the order's language (`order.language`); screens use the reader's own language. Notifications never carry phone numbers, addresses, amounts or codes.
- Operational limits (rate limits, code attempts, temp PIN lifetime) come from env variables with defaults in `src/server/config.ts`.
- Free tiers first (Vercel, MongoDB Atlas M0, Ably free). Keep payloads small for 3G and cheap Android phones. No heavy libraries.

## Coding style (maintainability first)
- The owner maintains this project by hand. Write code a person can read and reason about quickly.
- Prefer simple, direct implementations: plain functions, explicit `if` checks, clear names, small files.
- Avoid clever abstractions, generic factories, deep inheritance, heavy type gymnastics and unnecessary layers or libraries.
- Comment only where the reason is not obvious.
- Backend business logic must stay especially simple: one obvious place per rule, readable top to bottom.
- Styling is the one area where complexity is allowed. Rich CSS and Tailwind are fine.

## Target devices
- Phones and tablets first for all three apps. Desktop is secondary for the customer and driver apps.
- Every admin screen has a proper layout for phone, tablet and desktop. Tablets get a compact sidebar and 2-column layouts.
- Touch targets at least 44px; primary buttons 56px.
- Keep token use low: make targeted edits and avoid re-reading files unnecessarily.
