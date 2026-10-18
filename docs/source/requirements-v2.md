# Requirements Document: Delivery Coordination Platform (v2)

**Revision notes vs v1.** This version replaces the "Express backend + 3 React SPAs on 3 hosts" architecture with a **single Next.js project deployed on Vercel**, serving three subdomains from one codebase and one MongoDB database. Authentication changes from stateless JWT + refresh rotation to **stateful MongoDB-backed sessions** with opaque HttpOnly cookies. Permission groups are removed (all admins equal; one seeded super admin). Admin real-time alerts move from WebSocket to **Ably**. Phone uniqueness is relaxed to per-collection. Session lifetime unified at 7 days. Everything else — order lifecycle, payments, delivery code, tracking, reports — is carried forward with only the edits required by the architecture change. Where this document and the Manual Process Flow differ, the Manual Process Flow wins.

---

## 1. Guiding principles

1. **Record, don't automate.** The platform records and organizes manual work. Pricing, assignment and cash handling stay human decisions.
2. **Backend owns the rules.** Order states, permissions, visibility and logging are enforced only in the backend. Frontends display data and send actions.
3. **Isolation by subdomain.** One Next.js project, one deployment, three subdomains. Each audience has its own login, its own cookie and its own API namespace.
4. **Mobile first, data light.** Built for cheap Android phones and weak connections.
5. **Capture data now, analyze later.** Fields needed for future analysis are stored from the first order.

---

## 2. System overview

One Next.js (App Router) project, deployed on Vercel, serving three hosts from the same codebase and the same MongoDB database. `middleware.ts` rewrites by host so each subdomain resolves to its own route group.

| Host | Route group | Audience | Purpose |
|---|---|---|---|
| `domain.com` | `/user` | Customers and guests | Request form, order view, tracking page |
| `driver.domain.com` | `/driver` | Drivers | Assigned jobs, status updates |
| `panel.domain.com` | `/panel` | Admins | Approval, assignment, order management, reports |

**API serving.** Each subdomain also serves its own first-party API at `/api/<audience>/*` via `next.config.js` rewrites to the shared route handlers. The browser sees first-party requests and first-party cookies on all three hosts. No CORS. No third-party cookie issues.

**Rendering.** Mobile-first. Marketing-ish and static pages use SSG/ISR; app screens are client components fetching the API. No SSR requirement for app screens.

**Deep links** (e.g. `domain.com/t/<code>`) are ordinary Next.js routes and work directly. The v1 "every path to index" workaround is obsolete.

---

## 3. Proposed technologies

- **Framework:** Next.js (App Router), TypeScript, deployed on Vercel.
- **Database:** MongoDB Atlas. One database, collections per entity. Cached Mongo client across serverless invocations.
- **Auth:** custom stateful sessions. No auth library. `bcrypt` for PIN/password hashing, `crypto.randomBytes` for session IDs.
- **Real-time (admin only):** Ably. One channel `admin-alerts`; capability token issued by the backend per admin session.
- **Email:** SMTP via `nodemailer` with a cached transporter and HTML templates in the repo. Outbound SMTP from Vercel is supported. Provider TBD, credentials via env.
- **i18n:** `next-intl`, French and English.
- **Maps:** map pin selection and parsing of shared location links. No routing or distance service in V1.
- **Currency/time:** XAF, Africa/Douala.

These are proposals and can be changed without altering the requirements.

---

## 4. Authentication and access

### 4.1 Three isolated auth namespaces

Each subdomain has its own auth: its own route namespace (`/api/user/auth/*`, `/api/driver/auth/*`, `/api/panel/auth/*`), its own session cookie, and its own entity collection.

- **Users** — phone + PIN. Email required at registration (used for PIN reset). Guests have no account.
- **Drivers** — phone + PIN. Accounts created only by admins.
- **Admins** — phone + password. Accounts created only by an existing super admin. One admin is **seeded at deployment** with `isSuperAdmin: true`.

**No access control beyond role.** There are no permission groups and no per-action permission checks. Every admin can do every admin action. The `isSuperAdmin` flag currently only gates admin-account management (create/edit/delete other admins, reset admin passwords); it will later gate analytics. All admins are otherwise equal for MVP.

**One role per login, not per phone.** A phone may exist as a user, a driver and an admin simultaneously — they are separate records with separate logins and separate sessions. Uniqueness is **per collection**: `users.phone` unique, `drivers.phone` unique, `admins.phone` unique. No cross-collection uniqueness.

**Guests.** No login. A guest request is identified by its tracking code. Guest requests are never linked to an account, even if the same phone registers later.

### 4.2 Sessions

- **Stateful.** A login creates a document in the `sessions` collection.
- **Session document:** `{ _id (opaque random 32-byte base64url), audience, subjectId, createdAt, expiresAt }`. Nothing else. TTL index on `expiresAt` auto-purges expired sessions. Logout = hard delete. Lost driver phone = admin deletes that driver's sessions.
- **Cookie:** HttpOnly, Secure, SameSite=Lax, host-only (no `Domain` attribute). One cookie per audience: `sess_user`, `sess_driver`, `sess_panel`. Because each cookie is host-only and each subdomain is a distinct host, the three sessions are isolated by the browser. The per-audience cookie *name* is belt-and-suspenders.
- **Lifetime:** 7 days, fixed. Not sliding, not refreshed by activity. There is no refresh token and no rotation. When the session expires, the next request returns 401 and the app shows the login screen.
- **Multiple sessions per subject are allowed** (e.g. phone + tablet). No cap. TTL handles cleanup.
- **Every request** hits the session middleware: read cookie → look up `sessions` by `_id` → check `expiresAt` and `audience` → load `subjectId`. Wrong audience or missing session → 401.
- **`lastSeenAt`** lives on the `user` / `driver` / `admin` entity, updated at login (and optionally on notable actions) for later observability. It is not used for session enforcement.

### 4.3 Credentials, resets and rate limits

- **User PIN reset:** temp PIN generated by backend, emailed to the address on file, forced change at next login.
- **Driver PIN reset:** admin resets from the panel and tells the driver verbally. No email.
- **Admin password reset:** super admin resets from the panel and shares out-of-band.
- **Super admin password reset:** via deployment env change / CLI. No UI in MVP.
- **Rate limits:** failed logins and PIN/password reset requests are rate limited.

### 4.4 Admin real-time

- **Ably**, channel `admin-alerts`, broadcast to every connected admin.
- Capability token issued by `/api/panel/ably-token`, authenticated by the admin session cookie.
- **Email rule (unchanged from v1):** only a **new request** and a **raised issue flag** also send an SMTP email. Every other event (driver decline or no-response, confirmed, picked up, dropped at agency, in transit, arrived at agency B, delivered, cancelled, failed, price change, reassignment) is Ably-only.
- Users and drivers receive no automated notifications. Communication is by phone and WhatsApp.

---

## 5. Core data entities (conceptual)

**User.** Name, phone (unique within `users`), email (required), optional display name for businesses, hashed PIN, `lastSeenAt`.

**Driver.** Name, phone (unique within `drivers`), hashed PIN, city, availability, active flag, `lastSeenAt`. Created by an admin.

**Admin.** Name, phone (unique within `admins`), hashed password, `isSuperAdmin`, active flag, `lastSeenAt`. Seeded super admin at deployment.

**Session.** `_id`, `audience`, `subjectId`, `createdAt`, `expiresAt`. TTL index on `expiresAt`.

**City.** Name, active flag, list of partner agencies, linked drivers.

**Agency.** Belongs to one city. Name, contact, active flag.

**Order.**
- Type: local or inter-city.
- Inter-city form: delivery to the receiver's address, or receiver collects at the agency.
- Nature: sale delivery or simple parcel.
- Parcel size: envelope, small, medium, large, bulky.
- Origin city and destination city.
- Source: web or admin-entered.
- Sender: name, phone. Linked user only if logged in at booking.
- Recipient: name, phone. **Plain name+phone; recipient needs no account.** Order-level validation: `senderPhone !== recipientPhone`.
- Pickup and drop-off: coordinates when provided, landmark or free-text address.
- Parcel: description, optional declared value.
- Price: agreed price (gross, as entered by admin), discount rate applied, discount amount, net total shown to user, who set it, approval time, agency fee (admin only).
- Delivery fee payment: payer and timing (sender at pickup, or receiver on arrival; inter-city always sender at pickup), receiver-confirmed flag, paid flag, `paidTo` (collecting driver), `paidAt`.
- Goods money (sale only): amount, status (already paid, or receiver pays on arrival), collected flag and collecting driver, handed-to-seller flag with who handed.
- Delivery code (4 digits, sender + admin only; none for collect-at-agency).
- Tracking code (public, long random string).
- Current status, issue flag and note.
- Cancellation and failure reasons.

**Assignment.** Order, driver, role (origin or destination), assigned time, confirmed time, declined or timed-out state. Delivery to an address between cities = two assignments, both created before the drop at the agency. Collect-at-agency = one.

**Inter-city handover.** Order, agency, agency vehicle number, agency driver's phone, the name and phone the parcel is registered under, ETA (entered by origin driver from the agency driver), actual arrival time, admin-recorded photo-check flags (origin confirmed, destination confirmed).

**StatusChangeLog.** Order, from-status, to-status, actor, timestamp, reason.

**ActivityLog.** Order, actor, action type, details (old/new price, reassignment, note, etc.), timestamp. Covers everything that is not a plain status change. Also used for **admin-side operations audit** (account changes, settings changes, resets).

---

## 6. Order statuses

**Local:** Requested, Approved, Assigned (awaiting driver), Driver confirmed, Picked up, Delivered.

**Inter-city:** Requested, Approved, Assigned (origin and destination drivers, both before the drop), Driver confirmed, Picked up, Dropped at agency, In transit, Arrived at agency B, Collected at destination, Delivered.

**Inter-city, receiver collects at agency:** Requested, Approved, Assigned (origin driver), Driver confirmed, Picked up, Dropped at agency, In transit, Arrived at agency B, Delivered (set by admin after phoning the receiver).

In transit starts when the admin confirms the drop at the agency. Arrived at agency B is set by the admin after phoning the agency or agency driver.

**Exits:** Cancelled (before pickup, with reason; includes declining the price on the call). Failed (after pickup).

**Issue flag:** overlay, not a status. Can be raised on any active order, highlights it for the admin, does not change the flow.

---

## 7. Business rules

### 7.1 Requests

- Created by a guest, a registered user, or the admin on behalf of a caller.
- Required: pickup, drop-off, recipient name and phone, parcel description, sender phone and name, and the form answers (same city or another town, delivery to address or collect at agency, sale or not, goods money status and amount, who pays the delivery fee and when, parcel size).
- `senderPhone !== recipientPhone` is validated at the backend.
- Pickup and drop-off: map pin, pasted location link, or free text. Coordinates stored when available.
- Inter-city requires an active destination city. The form is dynamic: collect-at-agency hides receiver-pays-goods-money; inter-city locks delivery fee to sender at pickup. The admin sees a plain-language summary and a "confirm with receiver first" flag when the request is not a sale and the receiver is to pay the delivery fee.

### 7.2 Price and approval

- Only the admin sets prices. Drivers cannot.
- Every price set or change is written to the activity log with who, when, old and new value.
- No separate quote or acceptance step. The admin calls the customer, agrees the price, enters the amount and approves in one action. Only approved requests can be assigned.
- **Discount:** the admin enters the **gross** price (what the customer was told). If the customer is a registered user **and** the configured discount rate is greater than 0, the backend computes `discount = round(gross * rate)` and `net = gross − discount`, and displays the discount line to the user. If the rate is 0, no discount line is shown and the total equals the gross. The discount rate and minimum fare are admin-configurable.
- For inter-city orders, the total includes the agency fee. The agency fee is stored separately and never exposed to users or drivers.
- The user is never asked to accept or decline in the app. If the customer declines on the call, the admin cancels with a reason.

### 7.3 Assignment

- Only the admin assigns drivers. Based on a phone check, not live location.
- The driver sees sender and recipient details only after assignment.
- The driver must confirm. Until then the order shows Assigned (awaiting driver) in the admin view.
- If the driver declines or does not respond, the admin reassigns. All reassignments are logged.
- A driver can be assigned a new job while still on another if the admin decides.
- Inter-city to an address: the destination driver must be assigned before Dropped at agency is allowed. Replacing that driver later is logged, and the admin tells the agency. Collect-at-agency has no destination driver.
- A driver is linked to one city. Origin and destination drivers must belong to the respective cities.

### 7.4 Execution

- The driver may only update status: Picked up, Dropped at agency (origin driver, with agency details), Collected at destination (destination driver), Delivered.
- Delivery requires the 4-digit code. The recipient tells it to the final-leg driver, who types it. The driver never sees the code; the backend checks it.
- Money handling follows the Payments rules: collection is recorded when the driver sets Picked up or Delivered, depending on timing.
- If anything changes (price, address, recipient), the driver informs the admin by phone. The admin edits the order.
- Photo checks (origin, and destination for deliveries to an address) happen on WhatsApp outside the platform. Photos kept only as legal backing. The admin ticks a confirmation, which is logged.
- Dropped at agency requires the agency, vehicle number, agency driver's phone and the ETA. ETA is entered by the origin driver from the agency driver. No default; action blocked without it.
- The admin drop-confirmation button is labelled "Confirming a drop-off at agency puts the delivery in transit". It moves the order to In transit and records the origin photo check.
- The admin sets Arrived at agency B after phoning the agency or agency driver. Admin queue has an "In transit, ETA passed" filter; overdue parcels are highlighted.
- For collect-at-agency, the admin sets Delivered after phoning the receiver. The system does not wait for the receiver to collect.

### 7.5 Payments

- No payment gateway. Cash or mobile money outside the platform.
- Each order has up to two money items: the delivery fee and, in a sale, the goods money.
- Delivery fee: sender at pickup, or receiver on arrival (local only). Inter-city is always sender at pickup. The sender chooses on the request form.
- Goods money (sale only): already paid, or paid by the receiver on arrival. Receiver-pays is not available for collect-at-agency.
- No cash caps in V1. All amounts and collecting drivers recorded.
- Sale: admin accepts the sender's statement of who pays and when.
- Not a sale, sender pays: nothing more to confirm.
- Not a sale, receiver pays the fee: request is flagged. The admin confirms with the receiver by phone, ticks "receiver confirmed", activity log records it. Approval is blocked until the tick is set.
- Payment at pickup: driver's job shows a prominent message with the amount to collect. When the driver sets Picked up, backend sets `paid=true` and `paidTo=that driver`.
- Payment on arrival (local only): driver's job shows the amount to collect before handover. On Delivered, backend sets `paid=true` and `paidTo=that driver` for the fee, and records goods money as collected by the same driver.
- Inter-city sale to an address: goods money, if the receiver pays it, is collected by the destination driver at final delivery.
- Goods money handed to the seller: admin ticks yes/no and who handed it. A record, not a control.
- `paid` and `paidTo` visible to admins, assigned drivers, sender and receiver. Public tracking shows only `paid yes/no`, no amounts.
- Corrections are made by an admin and logged in the activity log.

### 7.6 Delivery code and tracking link

- Code generated with the order and shown to the sender when tracking starts (Driver confirmed), together with a copyable tracking link.
- A logged-in sender can reopen the code at any time. A guest sees it once on screen and must copy it.
- The sender passes the link and code to the recipient.
- The code is always visible to admins. Admin shares it with the recipient only at the sender's request, or when the sender cannot be reached.
- A wrong code does not complete the delivery. Driver calls admin.
- No delivery code exists for collect-at-agency.

### 7.7 Tracking

- Public page per order at `domain.com/t/<tracking code>`, no login. A route in the user app reading one public API endpoint.
- Tracking codes are long random strings (≥ 12 chars, no look-alike characters), not sequential and not derived from order number or phone.
- Unknown or malformed codes → neutral not-found response; app shows a friendly not-found screen with a Call us button.
- Tracking expires when the delivery ends. Final status (Delivered, Cancelled, Failed) → public endpoint returns only "expired"; app shows "Tracking expired, this delivery is complete". Simple status lookup; nothing else loaded.
- Registered users still see finished orders in their account. Guests do not get the page back.
- While active, the endpoint returns a reduced public view: status steps with times, `paid yes/no`, city and area names, and for inter-city the agency name, vehicle number, and In transit / Arrived at agency B steps (for collect-at-agency: "Ready for collection at agency B"). Never returns phone numbers, full addresses, coordinates, price, delivery code, agency fee, internal notes or admin-only fields.
- Each step has a lightweight SVG illustration bundled with the user app.
- Page refreshes itself while open.

### 7.8 Notifications

- **Admin only.** New request and issue flag → Ably message **and** SMTP email. Every other status update → Ably message only.
- **No automated notifications to users or drivers.** Communication is by phone and WhatsApp.
- The admin app can open prefilled WhatsApp message links (quote, tracking link) with one tap.

---

## 8. Application requirements

### 8.1 User app (`domain.com`)

- Request a delivery as guest or with an account.
- Dynamic request form: same city or another town, delivery to address or collect at agency, sale or not, goods money status, who pays the delivery fee and when, parcel size.
- Pending screen telling the customer the admin will call, with a prominent Call us button.
- View agreed price (with discount line if applicable), order status. When tracking starts, show the delivery code and copyable tracking link; guests told to copy the code because they see it once.
- Optional account creation encouraged: saved details, prefilled forms, discount. Email required to register, used for PIN reset.
- Order history and reorder for registered users.
- Public tracking page and shareable tracking link.
- French and English.

### 8.2 Driver app (`driver.domain.com`)

- Login by phone and PIN.
- Availability toggle.
- List of assigned jobs with accept or decline.
- Job details (sender, recipient, addresses, tap-to-call, tap-to-navigate), including a prominent payment message whenever money must be collected at the next step.
- Status buttons appropriate to the current step.
- Delivery code entry at handover.
- Inter-city: at drop-off, see who the parcel must be registered under and record agency details and ETA. Drop action locked until destination driver is assigned. View agency details at collection.
- Short history of completed jobs.

### 8.3 Admin app (`panel.domain.com`)

- Live request queue with sound and badge (via Ably) for new requests.
- Request approval: enter the agreed (gross) price, review the sender's answers, tick "receiver confirmed" where flagged, approve in one action. Later price edits require a reason.
- Quick order entry for phone callers, designed for about 20 seconds.
- Assignment screen showing drivers, city, availability, current job.
- Order detail with full status and activity history, issue flags, photo-check confirmation.
- Plain-language summary of the sender's form answers at the top of each request, with the confirm-with-receiver-first flag where needed.
- Inter-city follow-up: drop confirmation (puts delivery in transit), "In transit, ETA passed" filter with highlighting, one-tap Arrived at agency B, Delivered for collect-at-agency.
- Goods money handed to seller: tick, with who handed.
- Management of drivers (including PIN resets), cities, agencies, pricing settings (discount rate, minimum fare).
- Admin account management (create/edit/delete, password reset), **restricted to super admins**.
- Reports: deliveries and revenue per day/week/month, top routes and areas, top customers and repeat rate, request-to-delivery time, time at agencies, failures and reasons, agency fee and margin per route.

---

## 9. Non-functional requirements

- **Performance:** pages usable on 3G, small payloads, no heavy libraries or large images.
- **Availability:** admin app and tracking page are the critical paths. Admin app is run by a dedicated person whose browser stays open. Daily database backups. Vercel serverless handles scale; Ably holds the admin's real-time connection, so no always-on server is needed.
- **Security:** HTTPS everywhere, hashed PINs/passwords, rate limiting, input validation, server-side checks on every action, unguessable session IDs, unguessable tracking codes, no sensitive data in tracking pages.
- **Privacy:** phone numbers and addresses visible only to roles that need them.
- **Auditability:** nothing is deleted. Changes are logged (`StatusChangeLog`, `ActivityLog`). Orders are never hard-deleted.
- **Localization:** French and English across all user-facing screens. Currency XAF. Time zone Africa/Douala.
- **Reliability on weak networks:** driver app handles failed requests gracefully and retries status updates.

---

## 10. Data to capture from day one

- Pickup and drop-off coordinates when provided, plus landmark text.
- Final price (gross), discount rate and amount applied, net shown, who set it, all changes.
- Timestamps for every status transition and assignment.
- Cancellation and failure reasons.
- Order source (web or admin-entered).
- Delivery nature, payer, timing, paid flag and `paidTo`, COD amounts and collecting driver.
- Request form answers, ETA and actual arrival time for inter-city, and whether goods money was handed to the seller.
- Inter-city handover details and agency fee.

---

## 11. Out of scope for V1

- Automatic distance or price calculation.
- Online payment.
- Live GPS tracking.
- Photo or file upload.
- In-app chat or counter-offers.
- Notifications to users and drivers.
- Ratings, referrals, loyalty programs.
- Cash on delivery limits or controls.
- Waybill handling, and linking guest orders to accounts later.
- Super-admin analytics UI (data is captured; the UI comes later).

---

## 12. Open items

- Pick the SMTP provider (credentials via env). Confirm HTML template approach is sufficient.
- Confirm the seeded super-admin creation mechanism (env var at deploy vs. one-shot CLI script).
- Define the liability and prohibited items text shown at booking.
- Decide the Ably plan tier.
- Confirm the exact `next-intl` routing strategy (locale in path vs. cookie).