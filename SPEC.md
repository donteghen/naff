# NAFF — Specification (source of truth)

Delivery coordination platform for a small delivery business in Cameroon (Douala, Buea, …).
This file is the result of the alignment on the source documents in `docs/source/` and the designs in `docs/design/`.
**Where this file differs from those documents, this file wins.**

Principle: the platform records and organises manual work. Humans communicate (phone, WhatsApp) and decide. Prices, assignment and money are human decisions. Nothing is automated "just in case".

---

## 1. Hosts and apps

One Next.js project, one Vercel deployment, one MongoDB database, three hosts:

| Host (env) | App | Audience |
|---|---|---|
| `SITE_HOST` (e.g. `naff.cm`) | Customer site: landing page `/`, app home `/home`, request form, my orders, account, public tracking `/t/<code>` | Users and guests |
| `DRIVER_HOST` (e.g. `driver.naff.cm`) | Driver app | Drivers |
| `PANEL_HOST` (e.g. `panel.naff.cm`) | Admin panel | Admins |

- `middleware.ts` maps each host to its own route folder. A path from one app is never reachable from another host.
- Local development: `localhost:3000`, `driver.localhost:3000`, `panel.localhost:3000`.
- Each app has its own session cookie, host-only (no `Domain`), so sessions are isolated by the browser.

## 2. Stack

Next.js 15 (App Router, TypeScript, server components + server actions) · Tailwind CSS 4 · MongoDB Atlas + Mongoose · Zod · bcryptjs · Ably (admin live alerts) · nodemailer (SMTP) · Leaflet + OpenStreetMap (map pin) · Vitest.
French (default) and English everywhere, typed dictionaries, language saved in a cookie.
Money: integer XAF. Time zone: Africa/Douala.

## 3. Design

- Brand **NAFF**. Designs in `docs/design/` (open the `.dc.html` files through a local server, or see `docs/design/screenshots/`). They define look and feel only, never logic.
- Navy `#0B1B3F` = structure and passed steps. Indigo `#14307A` = passed. Amber `#FFB81C` = "now" and "do this". Mist `#F5F7FC` = background. Green `#12A150` only for delivered/paid. Red `#D92D20` only for failed/issue.
- Plus Jakarta Sans. Text ≥ 15px (body 17px on phones). Tap targets ≥ 44px (primary buttons 56px). Radius 16–26px. Cards white with soft shadow.
- Status chips with a glyph that shows progress (see brand design).
- Phones and tablets first. Admin designs are desktop only: phone and tablet layouts must be designed in the same style (compact sidebar on tablet, drawer menu on phone).
- Tracking page: lightweight inline SVG scene per step group, rebuilt from the tracking design.

## 4. Accounts and authentication

### 4.1 Shared rules
- Three separate collections: `users`, `drivers`, `admins`. A phone is unique **within** a collection only (one person may be a user, a driver and an admin).
- Stateful sessions in the `sessions` collection: `{ _id: random 32 bytes base64url, audience, subjectId, createdAt, expiresAt }`. TTL index on `expiresAt`.
- Session lifetime **7 days, fixed** (not sliding). Logout deletes the session. Several sessions per person are allowed.
- Cookies: `sess_user`, `sess_driver`, `sess_panel`. HttpOnly, Secure (in production), SameSite=Lax, host-only.
- Every protected request: read cookie → find session → check `expiresAt`, audience and that the person is still active → load the person. Otherwise the app shows **Session ended / log in**.
- Credentials: users and drivers use a **4-digit PIN**. Admins use a **6-digit PIN**. All hashed with bcrypt.
- Login errors never say whether the account exists.
- Rate limits stored in Mongo, values from env: `LOGIN_MAX_FAILS` (5) per phone and audience within `LOGIN_WINDOW_MINUTES` (15); `PIN_RESET_MAX` (3) per phone within `PIN_RESET_WINDOW_MINUTES` (60).
- A person with a temporary PIN must set a new PIN right after login before doing anything else. Setting a new PIN deletes all their other sessions.
- `lastSeenAt` is updated at login.

### 4.2 Users (customers)
- **Register:** name, phone, email (required, used only for PIN reset), PIN twice. Phone must be free in `users`. Logged in straight away. No business name.
- **Log in:** phone + PIN.
- **Forgot PIN:** enter phone → if an active account exists, a 4-digit temporary PIN is emailed to the address on file, valid `TEMP_PIN_TTL_MINUTES` (30). Same neutral message in every case. The old PIN keeps working until the temporary PIN is used. If the mailer is not configured, the screen says "Reset by email is not available, call us".
- **Profile:** edit name, phone (must be free) and email; change PIN (current PIN required, logs out other devices); log out.
- Guests have no account. Guest orders are never linked to an account, even if the phone matches.

### 4.3 Drivers
- Created by an admin: name, phone, city. The system generates a temporary 4-digit PIN, shown **once** to the admin, who tells the driver by phone.
- First login with the temporary PIN → forced new PIN.
- Forgot PIN → driver calls the admin → **Reset PIN** (new temporary PIN shown once, all driver sessions deleted).
- **Log out everywhere** (lost phone) deletes all the driver's sessions.
- **Suspend**: deletes sessions, blocks login and assignment. Blocked while the driver has active jobs (reassign first). **Reactivate** possible.
- The driver can change their own PIN (current PIN required). Name, phone and city are edited by admins only.
- Temporary PINs issued by admins do not expire.

### 4.4 Admins
- One **super admin** created by CLI: `npm run create-super-admin` (name, phone, 6-digit PIN). Reset by CLI: `npm run reset-super-admin-pin`. No in-app reset for the super admin. Exactly one super admin; no promotion in the app.
- The super admin creates admins (name, phone, optional email for alerts). Temporary PIN shown once. First login → forced new PIN.
- Forgot PIN → ask the super admin → Reset PIN (temporary PIN shown once, sessions deleted).
- Any admin changes their own PIN in Settings.
- Admins are **deactivated**, never deleted (logs must point to real people). The super admin cannot deactivate themselves.
- All admins can do every admin action, except managing admin accounts (super admin only).

## 5. Data (collections)

- **users**: name, phone, email, pinHash, tempPin {hash, expiresAt} | null, mustChangePin, active, lastSeenAt.
- **drivers**: name, phone, cityId, pinHash, mustChangePin, available (bool), active, lastSeenAt.
- **admins**: name, phone, email (optional, receives new-request alert emails), pinHash, mustChangePin, isSuperAdmin, active, lastSeenAt.
- **sessions**: see §4.1.
- **rateLimits**: key, count, windowStart (TTL).
- **cities**: name, active.
- **agencies**: name (the transport company, e.g. Express Voyages), contact phone, active, `branches: [{ cityId, address }]`. One agency serves several cities: a parcel dropped at agency X in city A arrives at the same agency X in city B. An agency can be used for a route only if it has a branch in both cities.
- **settings** (single document): discountRate (default 0.05), callUsPhone, whatsappPhone, mtnMomo {number, name}, orangeMoney {number, name}, operationalStatus (`live` | `maintenance`).
- **counters**: next order number.
- **orders**: see §6.
- **activityLogs**: orderId?, actorType (`user` | `guest` | `driver` | `admin` | `system`), actorId, onBehalfOfDriverId?, action, fromStatus?, toStatus?, details (object: old/new values, reason, note), at. Covers every order operation, including status changes.
- **auditLogs**: adminId, action, targetType, targetId, details, at. Covers admin-side operations: accounts (users, drivers, admins), PIN resets, sessions ended, settings, cities, agencies, operational status.

Nothing is hard-deleted: users, drivers, admins, cities and agencies are deactivated; orders are cancelled or failed.

## 6. Orders

### 6.1 Fields
- `number` (sequential, shown as `NF-1042`), `trackingCode` (12 chars, alphabet without look-alikes, random, unique), `deliveryCode` (4 digits, none for collect-at-agency), `guestToken` (random, guest orders only).
- `source`: `web` | `admin`. `userId` (only when a logged-in user booked on the site).
- `type`: `local` | `intercity`. `intercityMode`: `to_address` | `collect_at_agency`.
- `originCityId`, `destinationCityId` (same for local). No customer-chosen agency: the origin driver picks the agency at the drop.
- Sender: name, phone. Receiver: name, phone. Server rule: `senderPhone !== receiverPhone`.
- Pickup and drop-off: `{ text (address + landmark), lat?, lng? }`.
- Parcel: size (`envelope` | `small` | `medium` | `large` | `bulky`), category (`documents` | `clothes` | `electronics` | `food` | `cosmetics` | `spare_parts` | `medicine` | `other`), contents (text), itemCount, estimatedValue (optional), declarationAccepted (must be true).
- Price (set by admin): `grossPrice`, `discountRate`, `discountAmount`, `netPrice`, `agencyFee` (intercity, admin-only, 0 allowed), `priceSetBy`, `approvedAt`, `pickupTime` (optional text).
- Delivery fee: `fee = { payer: sender|receiver, timing: request|pickup|delivery, method: cash|mtn_momo|orange_money, status: unpaid|paid, paidAt, paidToDriverId?, recordedByAdminId? }`.
- Goods money (sale only): `goods = { isSale, status: already_paid|receiver_pays, amount, collected, collectedByDriverId, collectedAt, handedToSeller (bool|null), handedByDriverId }`.
- `receiverConfirmed` (bool), `needsReceiverConfirmation` (computed at creation).
- Assignments: `originDriverId`, `originConfirmedAt`, `destinationDriverId`, `destinationConfirmedAt` (history lives in activityLogs).
- Handover (intercity): agencyId, vehicleNumber, agencyDriverPhone, registeredUnderName, registeredUnderPhone, eta, droppedAt, originPhotoConfirmed, destinationPhotoConfirmed, arrivedAt.
- `status`, `statusTimes` (time per status reached), `issue = { open, note, by, at }`, `cancelReason`, `failReason`, `codeAttempts`, `codeLocked`, `guestCodeShownAt`.

### 6.2 Request form (customers and admin quick order)
One question per screen on the customer site (designs: User app). Answers:
1. **Where is it going?** Same city (pick the city) or another town (pick origin and destination among active cities).
2. **Another town only: how should it arrive?** Deliver to the address, or receiver collects at the agency in the destination city.
3. **Is this a sale?** No / yes, goods already paid / yes, receiver pays on delivery (+ amount). "Receiver pays on delivery" is **local only** (hidden for every intercity order: a cancelled or refused intercity parcel would cost us).
4. **Who pays the delivery fee, and when?**
   Payment happens at one of three moments:
   - **At request** — sender, by mobile money (MTN MoMo or Orange Money), when the admin calls to agree the price. The admin approves only after confirming the money arrived.
   - **At pickup** — sender, cash (or mobile money) to the driver.
   - **At delivery** — receiver, cash or mobile money to the driver, before handover. **Local only.**
   Another town: at request or at pickup only.
5. **Parcel size** (5 sizes).
6. **Parcel category.** Medicine shows a hint to name the prescription or pharmacy in the contents.
7. **Contents**, item count, estimated value (optional), and the required declaration "no illegal or prohibited items", with a link to the **forbidden items** screen.
8. **Pickup and drop-off:** each by map pin (Leaflet, "use my location"), pasted WhatsApp/Google Maps location link (coordinates extracted when possible), or typed address and landmark.
9. **People:** sender name and phone (prefilled for logged-in users), receiver name and phone.
10. **Check your request:** plain-language summary, then **Send request**.

After sending: **"We will call you shortly"** screen with the order number and a large **Call us** button.
- Logged-in user: order appears in **My orders**.
- Guest: gets a private order link (`/o/<guestToken>`) saved in a cookie on the device, to see status and price.
- New orders are refused while the operational status is `maintenance`.

**Admin quick order** (`Quick order` button in the panel top bar): the same questions on one compact page, filled from scratch every time (no templates, no presets). `source = admin`, never linked to a user, no discount. The admin may enter the price and approve in the same step.

**Plain-language summary** (shown to admin at the top of each order and on the review screen), e.g. "Local sale. Receiver pays 15,000 XAF for the goods plus the delivery fee on arrival."
**Confirm with receiver first** is set when the order is not a sale and the receiver pays the delivery fee.

### 6.3 Statuses (enforced on the server)

| Status | Set by |
|---|---|
| `requested` | creation |
| `approved` | admin (price) |
| `assigned` | admin assigns the origin driver |
| `driver_confirmed` | origin driver accepts |
| `picked_up` | origin driver |
| `dropped_at_agency` | origin driver (intercity) |
| `in_transit` | admin confirms the drop |
| `arrived_at_agency_b` | admin, after phoning the agency |
| `collected_at_destination` | destination driver (to_address) |
| `delivered` | final-leg driver with the code; admin for collect_at_agency |
| `cancelled` | admin, before pickup, reason required |
| `failed` | admin, after pickup, reason required |

Paths:
- Local: requested → approved → assigned → driver_confirmed → picked_up → delivered.
- Intercity to address: … → picked_up → dropped_at_agency → in_transit → arrived_at_agency_b → collected_at_destination → delivered.
- Intercity collect at agency: … → picked_up → dropped_at_agency → in_transit → arrived_at_agency_b → delivered (admin, after phoning the receiver).

Rules:
- **Approve**: admin enters the gross price (> 0) and, for intercity, the agency fee (≥ 0). Blocked until `receiverConfirmed` is ticked when `needsReceiverConfirmation`. When `fee.timing = request`, approval also requires the admin to tick "Payment received" (the sender pays by mobile money during or right after the call); this sets fee `paid`, `paidAt`, `recordedByAdminId`.
- **Discount**: if `userId` is set and `settings.discountRate > 0`: `discountAmount = round(gross × rate)`, `net = gross − discount`. Otherwise net = gross and no discount line is shown. Rate is copied onto the order at approval.
- **Assign**: only approved (or assigned, to reassign) orders. Origin driver must be active and in the origin city. Destination driver (to_address only) must be active and in the destination city. A driver may hold several jobs.
- **Driver declines** (or admin unassigns before confirmation): status back to `approved`, logged, admin alerted.
- **Reassign**: origin driver until pickup; destination driver until `collected_at_destination`. Logged. No automatic timeouts.
- **Dropped at agency** requires the agency (active, with a branch in both the origin and destination cities), vehicle number, agency driver phone, ETA (date-time, no default), and for to_address an assigned destination driver. `registeredUnder` = destination driver (to_address) or receiver (collect_at_agency).
- **Arrived at agency B** (admin) records `arrivedAt`. The agency is the same one the parcel was dropped at.
- **Confirm drop** (admin), button text: "Confirming a drop-off at agency puts the delivery in transit". Sets `in_transit` and `originPhotoConfirmed`.
- **Destination photo check**: admin tick, logged, does not block anything.
- **Collected at destination**: only the destination driver, after confirming their assignment.
- **Delivered with code**: the driver types the 4 digits; the server compares. Wrong code increments `codeAttempts`; after `DELIVERY_CODE_MAX_ATTEMPTS` (3) wrong tries the entry locks and shows "Call the admin". The admin can unlock (logged).
- **Cancel**: allowed in requested, approved, assigned, driver_confirmed. **Fail**: allowed after pickup until final. Both need a reason.
- **Issue flag**: admin raises or clears it with a short note on any active order. Highlights the order. Does not change status.
- **Admin acts for drivers**: every driver action (accept, decline, picked up, dropped at agency, collected, delivered with the code read over the phone) can be done by an admin, logged as "admin X on behalf of driver Y". Money is still recorded against the driver.
- **Admin edits** (logged with old/new values): addresses, receiver, sender, parcel details, payment answers, pickup time; price and agency fee require a reason. Type and intercity mode cannot change after approval (cancel and re-create).

### 6.4 Money
No payment gateway. The platform records.
- **At pickup** (`fee.timing = pickup`, unpaid): driver job shows a loud amber card "COLLECT FROM SENDER <net> XAF · <method>". Tapping **Picked up** sets fee `paid`, `paidAt`, `paidToDriverId`.
- **At delivery** (local only): loud card "COLLECT FROM RECEIVER" with the fee and/or goods amount before handover. **Delivered** sets the fee paid to that driver and goods `collected` by that driver.
- **Intercity**: the fee is paid at request or at pickup, and goods money must already be paid. Nothing is ever collected at the destination.
- **At request**: recorded by the admin at approval (see §6.3). Drivers see "Prepaid".
- **Goods handed to seller**: admin ticks yes/no and which driver handed it. A record, not a control.
- Corrections by admins only, logged. No cash limits.
- Paid yes/no is visible to admins, assigned drivers, the sender (order view) and the public tracking page (no amounts).

### 6.5 Delivery code and links
- Generated at creation (except collect-at-agency). Shown to the sender **from `driver_confirmed`**, with copy buttons for the code and the tracking link.
- Logged-in sender: can reopen it any time in My orders.
- Guest: the code is returned once, on the first load of the guest order page after `driver_confirmed` (`guestCodeShownAt` set by the server), with "Copy the code now, you will not see it again".
- Admins always see it. Drivers never see it.

### 6.6 Public tracking `/t/<trackingCode>` (customer host)
- No login. Server-rendered on each load. **Not live**: shows "Tracking is not live, refresh for the latest status" and a Refresh button.
- Unknown or malformed code → friendly "We cannot find this parcel" + Call us.
- Final status (delivered, cancelled, failed) → only "Tracking expired, this delivery is complete" + Call us. Nothing else is loaded.
- Active: status steps with times, paid yes/no, city and area names (no full address), for intercity the agency name, vehicle number and expected arrival (the receiver collects at the same agency's branch in the destination city), and "Ready for collection at agency B" for collect-at-agency after arrival.
- Never shows: phones, full addresses, coordinates, prices, delivery code, agency fee, notes, admin fields.
- The user's own order view (logged in) and the guest order view show the full journey and the final screens (Delivered, Cancelled, Failed designs).

## 7. Customer site
- **Landing page `/`** (full width; where campaign, social and WhatsApp status links arrive): sticky header (How it works, Our towns, Payment, Track, EN|FR, Log in / My space, Send a parcel), hero (active towns, headline, Send / Track, discount chip when the rate > 0), track box (paste a link or code → `/t/<code>`), facts computed from real data (1 call, number of active towns, discount rate, 1 link — never invented numbers), five steps, same city vs another town, the one-link section, how you pay (3 moments), why NAFF, towns map drawn from the active cities, FAQ, final call to action (Send, Call us, WhatsApp from Settings → Contacts), footer. Shows the maintenance message when maintenance is on. Illustrations are static files in `public/landing/`.
- Social preview: title, description and a 1200×630 image per language (`public/og-fr.png`, `public/og-en.png`). Private pages (guest link, orders, account, tracking) are not indexed; the driver app and the panel are never indexed.
- Installable: each host has its own web manifest (`site`, `driver`, `panel`) with the NAFF icons.
- App home `/home`: greeting, **New delivery**, active delivery card, recent orders (logged in), "Create an account: 5% off" banner (rate from settings, hidden when 0).
- Request form (§6.2), forbidden items screen, "We will call you" screen.
- Order view: status, agreed price with discount line, paid status, code + tracking link when available.
- Account: register, login, forgot PIN, set new PIN, profile, My orders (All / Active / Done).
- Tracking page (§6.6). Maintenance screen when `maintenance`.
- Call us button always reachable. EN/FR toggle in the header.

## 8. Driver app
- Login (phone + PIN), forced PIN change, Session ended screen.
- Header: availability toggle (Available / Offline).
- Jobs: **Awaiting my confirmation** (Confirm / Decline), **Active**, **Completed today**. Short history (last 7 days).
- Job detail (visible only after assignment): route, size, sender and receiver with tap-to-call, Navigate (Google Maps with coordinates or text), loud money card, the status button for the next step only.
- Delivery code entry (4 boxes), wrong-code message with remaining tries, lock message.
- Drop at agency form: "Register the parcel under …", agency (agencies with a branch in both cities), vehicle number, agency driver phone, ETA (required). Locked message until ETA is filled and destination driver is assigned.
- Destination job: collect at agency X, vehicle, registered name, then deliver to …
- Delivered screen: "Paid, paid to this driver" and "Collected on this job: X XAF" (information only).
- No retries or offline queue: when the network fails, the driver phones the admin, who acts on their behalf.

## 9. Admin panel
Sidebar: **Dashboard** (home) · **Live queue** · **In transit** · **Orders** · **Users** · **Drivers** · **Reports** · **Activity log** · **Audit log** · **Settings**. Top bar: **Quick order**, live status chip, alerts badge, EN/FR. Sidebar footer: admin name, role (Admin / Super admin), Sign out. Banner when maintenance is on.

- **Dashboard**: pick a date range (presets: today, 7 days, this month), Apply. No comparisons. Cards and simple tables: orders by status (requested, approved, assigned, running, delivered, cancelled, failed, issues open), intercity (in transit, ETA passed, awaiting collection at agency), money (gross, discounts, net, agency fees, margin, fees collected by drivers, fees paid at request, goods money collected, goods not yet handed to seller), people (drivers available / on job / offline, active cities, active agencies, new users), splits (local vs intercity, web vs admin, guest vs registered).
- **Live queue**: filter chips (All, Requested, Active, Issues), list with status chips and times, selected order panel: summary, confirm-with-receiver tick, price inputs, discount preview, Approve; or the next admin action for that status.
- **Order detail**: summary, all fields, chips (status, paid, issue), delivery code, agency fee, edit forms, assign/reassign drivers (driver list filtered by city with availability and current job), status actions (incl. on behalf of drivers), drop confirmation, photo ticks, goods handed to seller, issue flag, cancel/fail, code unlock, WhatsApp buttons, full activity timeline.
- **In transit**: intercity orders in transit / arrived; filter "In transit, ETA passed" with red highlight; one-tap **Arrived at agency B**; **Delivered** for collect-at-agency after arrival.
- **Orders**: search (number, phone, name, tracking code) and filters (status, type, city, source, date range, issue), paginated.
- **Users**: list and search; edit name, phone, email; deactivate / reactivate; reset PIN (temporary PIN shown once); log out everywhere; see the user's orders.
- **Drivers**: list by city with status; add; edit; suspend / reactivate; reset PIN; log out everywhere; jobs and money collected.
- **Reports** (analysis): pick period granularity (day / week / month); current vs previous period comparisons; trend charts with rising/falling signal for orders, revenue and margin; top routes and areas; top customers and repeat rate; request-to-approval and request-to-delivery times; time at agencies; cancellation and failure reasons; agency fee and margin per route. Charts are plain SVG.
- **Activity log** and **Audit log**: read-only, newest first, filters: date range, actor type, actor, action, order number / target, paginated.
- **Settings**: Cities, Agencies, Pricing (discount rate), Contacts (Call us phone, WhatsApp, MTN MoMo and Orange Money numbers and names), Operational status (live / maintenance), My PIN, Admins (super admin only), WhatsApp preference.
- **WhatsApp buttons**: "Send price to sender", "Send tracking link to sender", "Send tracking link to receiver". One button each. Per-device setting "Open WhatsApp in: Web / App" (default Web on computers, App on phones and tablets): Web → `web.whatsapp.com/send`, App → `whatsapp://send`.

### 9.1 Live alerts (admin only)
- Ably channel `admin-alerts`. The server publishes on every order event (Ably REST SDK). The browser gets a subscribe-only token from `/api/ably-token` on the panel host (admin session required) and listens with Ably's Server-Sent Events endpoint (`EventSource`, no client library). It reconnects with a new token when the connection drops.
- Every event plays the **same sound**, shows a short toast and increments the alerts badge (in memory, reset on click, no history).
- **Email** only for a **new request**, to every active admin who has an email address on their account.
- If Ably is not configured: when `FALLBACK_TO_REFRESH=true` the panel refreshes its data every `REFRESH_SECONDS` (15); otherwise the chip shows "Live alerts off". If SMTP is not configured, no email is sent.

## 10. Operational status
`maintenance`: customer site shows a maintenance screen with Call us and refuses new requests; tracking pages and order views keep working; driver app keeps working; panel works and shows a banner. Toggle logged in the audit log.

## 11. Security and privacy
HTTPS, hashed PINs, rate limits, Zod validation on every input, server checks on every action (audience, ownership, assignment, status). Drivers see order details only for orders assigned to them. Tracking and guest links are unguessable. No sensitive data on the tracking page. Security headers in `next.config.ts`.

## 12. Debugging server data
Server actions and page loaders do not show readable JSON in the browser like API routes, so:
- With `DEBUG_LOG=true`, every server action and page data load logs one line in the terminal: name, input (PINs masked), result or error, duration.
- In development, the client form helper also logs each action's result to the browser console (`[action] name → result`).
- Server actions still appear in the browser Network tab as POST requests to the page.

## 13. Environment
`MONGODB_URI`, `SITE_HOST`, `DRIVER_HOST`, `PANEL_HOST`, `SITE_URL`, `ABLY_API_KEY`, `FALLBACK_TO_REFRESH`, `REFRESH_SECONDS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`, `LOGIN_MAX_FAILS`, `LOGIN_WINDOW_MINUTES`, `PIN_RESET_MAX`, `PIN_RESET_WINDOW_MINUTES`, `TEMP_PIN_TTL_MINUTES`, `DELIVERY_CODE_MAX_ATTEMPTS`, `DEBUG_LOG`.

## 14. Out of scope (V1)
Automatic pricing, minimum fare, online payment, live GPS, photo upload, in-app chat, notifications to users or drivers, ratings and referrals, cash limits, waybills, linking guest orders to accounts, saved places or receivers, reorder, customer-chosen agency, order templates, driver issue reporting, offline retry queues, auto-refresh of customer pages, alert history, backups.
