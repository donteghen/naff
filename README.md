# NAFF

Delivery coordination for a small delivery business in Cameroon: customers request a delivery, the admin agrees the price by phone and approves, assigns drivers, and everyone follows the parcel, including deliveries between cities via partner travel agencies.

- Behaviour: [SPEC.md](SPEC.md) (the source of truth). Coding rules: [CLAUDE.md](CLAUDE.md).
- Original documents and designs: [docs/source/](docs/source/) and [docs/design/](docs/design/) (`screenshots/` for a quick look).
- Manual run-through: open [manual-test.html](manual-test.html) in a browser.

## Three apps, one deployment

| Host | App | Who |
|---|---|---|
| `your-domain` | Customer site: landing page `/`, app home `/home`, request form, my orders, account, public tracking `/t/<code>` | Customers and guests |
| `driver.your-domain` | Driver app: jobs, money to collect, status steps, delivery code | Drivers |
| `panel.your-domain` | Admin panel: dashboard, live queue, orders, drivers, users, reports, logs, settings | Admins |

`src/middleware.ts` picks the app from the host name (`driver.*`, `panel.*`, anything else = site) and prefixes the path with `/driver`, `/panel` or `/site`. Each app has its own session cookie (host-only), so the three logins never mix.

Locally: `http://localhost:3000`, `http://driver.localhost:3000`, `http://panel.localhost:3000` (Chrome and Firefox resolve `*.localhost` by themselves).

## Brand assets (generated once)
All in `public/`, made from the NAFF logo and the design illustrations. Ask to regenerate them if the brand changes.

| File | Use |
|---|---|
| `favicon.ico` (16/32/48), `icon.svg` | Browser tab |
| `apple-touch-icon.png` (180) | iPhone / iPad home screen |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Android install, referenced by the manifests |
| `site.webmanifest`, `driver.webmanifest`, `panel.webmanifest` | "Add to home screen" for each app |
| `og-fr.png`, `og-en.png` (1200×630) | Preview when a link is shared on WhatsApp, Facebook, X… (language of the visitor, French by default) |
| `landing/*.svg` | Landing page illustrations |

Set `SITE_URL` in production: share previews need absolute image URLs.

## Stack
Next.js 15 (App Router, server components + server actions) · TypeScript · Tailwind CSS 4 · MongoDB + Mongoose · Zod · bcryptjs · Ably (admin live alerts) · nodemailer · Leaflet + OpenStreetMap · Vitest.

## Setup
```bash
npm install
cp .env.example .env.local     # set MONGODB_URI at least
npm run seed-demo              # optional: Douala, Buea, Yaoundé + one agency
npm run create-super-admin     # name, phone, 6-digit PIN
npm run dev
```
Then log in on the panel, and in **Settings** set the contacts (Call us, WhatsApp, MTN MoMo, Orange Money), cities, agencies and the discount rate. Add drivers in **Drivers**: each gets a temporary PIN to give by phone.

## Environment variables
All are listed with comments in [.env.example](.env.example).

| Name | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string (free M0 is enough; allow `0.0.0.0/0` for Vercel) |
| `SITE_URL`, `PANEL_URL` | Public URLs used in tracking links and alert emails |
| `ABLY_API_KEY` | Live admin alerts. Empty = live alerts off |
| `FALLBACK_TO_REFRESH`, `REFRESH_SECONDS` | Only without Ably: `true` makes the panel reload its data every N seconds |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME` | Customer PIN reset and new-request emails. Empty = email off |
| `LOGIN_MAX_FAILS`, `LOGIN_WINDOW_MINUTES` | Failed logins per phone before blocking |
| `PIN_RESET_MAX`, `PIN_RESET_WINDOW_MINUTES` | PIN reset emails per phone |
| `TEMP_PIN_TTL_MINUTES` | Lifetime of an emailed temporary PIN |
| `DELIVERY_CODE_MAX_ATTEMPTS` | Wrong delivery codes before the entry locks |
| `DEBUG_LOG` | `true` = one terminal line per server action and page load |

## Scripts
| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript check (also fails if an English text is missing) |
| `npm test` | Business rules, order flows and auth against an in-memory MongoDB (49 tests) |
| `npm run create-super-admin` | Creates the one super admin |
| `npm run reset-super-admin-pin` | New PIN for the super admin, ends their sessions |
| `npm run seed-demo` | Optional starter cities and agency on an empty database |

## Debugging server data
Pages load data on the server and forms call server actions, so there is no JSON API to inspect.
- `DEBUG_LOG=true`: every action and page load prints `[action] name {input} → {result} (ms)` / `[load] …` in the terminal. PINs and codes are masked.
- In development the browser console prints each action result (`[action] name → …`).
- Actions still appear in the browser Network tab as POST requests to the page.

## Live alerts (Ably)
The server publishes every order event on the channel `admin-alerts` with the Ably REST SDK. The panel gets a short-lived, subscribe-only token from `/api/ably-token` (admin session required) and listens through Ably's Server-Sent Events endpoint with the browser's `EventSource`, so no Ably library is shipped to the browser. Every event plays the same beep, shows a toast and increments the badge (no history). Browsers only allow sound after one click on the page.

## Code map
```
src/middleware.ts            host → app
src/app/site|driver|panel    the three apps (pages only); site/(landing) = public landing, site/(app) = customer app
src/actions/                 server actions: check the session, call a service
src/server/services/         all business rules (orders.ts is the heart)
src/server/models/           Mongoose models
src/server/auth/             sessions, PINs, "who is logged in"
src/components/              UI (ui.tsx = design system pieces)
src/lib/                     shared helpers (money, dates, phone, form rules)
src/i18n/fr.ts, en.ts        all texts (French default)
tests/                       Vitest
```

## Deploying on Vercel
1. Import the project, add the environment variables.
2. Add three domains to the same project: `your-domain`, `driver.your-domain`, `panel.your-domain`.
3. Run `npm run create-super-admin` with the production `MONGODB_URI`.
