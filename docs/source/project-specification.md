# Project Specification: Delivery Coordination Platform

Business document. It describes what we are building and why, in plain language. It matches the **Manual Process Flow** document, which describes how the day-to-day operation works. Technical details are in the **Requirements Document**.

## 1. The idea in one paragraph

A small delivery business runs today on phone calls and WhatsApp messages, with one rider on a scooter. Nothing is recorded. We are building a simple, mobile-first web platform that sits around this existing way of working. Customers request a delivery from their phone, the admin calls to agree the price and approves the request, a rider is assigned, and the customer can follow progress on a simple page. Phone calls and WhatsApp stay in the process. The platform adds structure, records and visibility.

## 2. The problem today

- Every request arrives by call or message and is handled from memory.
- There are no records of what was delivered, for whom, at what price, or how long it took.
- Customers have no way to see where their parcel is, which hurts trust against informal competitors.
- The owner cannot see which routes, areas or customers bring the most business, so growth is guesswork.
- Sending parcels to another town depends on informal coordination between riders, with no trail if something goes wrong.
- The business cannot grow past one rider because nothing is organized.

## 3. What we are building

Three connected web apps and one central system behind them:

| For | What they do | Address |
| --- | --- | --- |
| **Customers** | Request a delivery, follow its progress | main website |
| **Riders** | See assigned jobs, confirm them, update delivery progress | driver site |
| **Admin (a dedicated dispatcher, not a rider)** | Receive requests, agree prices by phone and approve them, assign riders, track everything, see reports | admin site |

Everyone can be a customer. In Cameroon a person can buy and sell at the same time, so we do not separate "merchants" from "individuals". Everyone is simply a user. Guest requests stay separate: they are never attached to an account later, even if the same person registers. Riders and admins are different people with different logins: riders drive, the admin manages.

## 4. Who uses it and what they get

**Customers** get an easy way to request a delivery without phoning around, a price agreed on the phone before anything happens, a tracking page they can share, and a delivery code that protects them. Accounts use a phone number and a PIN. Registered users also give an email address, used only to send a new PIN if they forget it. Customers with an account skip retyping their details and get **5% off**.

**Riders** get a clear list of their jobs, with the sender and receiver details shown only when a job is assigned to them, and a simple way to update status. Riders never manage orders or prices, so they can focus on driving.

**The admin (a dedicated dispatcher)** gets one place to see every request and every delivery, alerts the moment a request arrives and whenever a delivery changes status, and reports on what is really happening in the business.

## 5. How it works, in simple terms

1. A customer fills in a short request form: where from and to, whether it is a sale, who pays what and when, and the parcel size. They can do this with or without an account.
2. The admin is alerted immediately. They read the summary, call the customer to agree the price, then enter the amount and approve the request.
3. The admin phones riders, decides who is best placed, and assigns the job.
4. The rider confirms. Tracking starts, and the sender receives a tracking link and the delivery code to pass on to the recipient. The tracking page shows "Driver coming for pickup".
5. The rider picks up (collecting the money first if it is paid at pickup), delivers (collecting it first if it is paid at delivery), and marks it done. The recipient gives a 4-digit delivery code at handover.

If the customer waits to be called, a **Call us** button is always visible, so nobody is stuck. The admin can also enter orders on behalf of customers who phone, so the records stay complete. Because the sender fills in the details (sale or not, who pays, parcel size), the admin only checks and approves.

## 6. Services

**Local delivery.** Pickup and delivery in the same city, for example Akwa to Makepe.

**Inter-city delivery.** Delivery to another town, for example Douala to Buea, in one of two forms:

- **To the receiver's address.** The origin rider drops the parcel at a partner travel agency, registered under the name of the destination rider. The agency carries it to the other town. The destination rider collects it from the agency and delivers it.
- **To the agency only.** The parcel is dropped at a partner agency, registered under the receiver's name. Our job ends there: when the parcel arrives, the admin phones the receiver, and the delivery is complete.

We work only with defined partner agencies. We record the agency, the agency vehicle number, the agency driver's phone number and the expected travel time (given by the agency driver of the vehicle), and the admin follows up on parcels that are late. We do not require waybills, because the market does not use them and we cannot impose paperwork on agencies.

## 7. Pricing

Prices are **set manually by the admin**. We chose this deliberately. Automated distance-based fares are often inaccurate and cause disputes between the quoted and final price. We will collect pickup and drop-off locations and delivery times from day one, so that after some months we can study real data and decide whether any pricing help is worthwhile.

- The customer sees one total price.
- For inter-city, the total includes the agency fee. The agency fee is recorded separately and is visible to the admin only.
- The admin calls the customer, agrees the price, enters it and approves the request. There is no separate quote or acceptance step.
- If something changes mid-delivery, the rider informs the admin, who updates the order. Every change is logged.
- Registered users get 5% off, applied to the agreed price and shown on their order.

## 8. Payments

There is no online payment. Money is handled in cash or mobile money outside the platform, and the platform records it.

- Each delivery has up to two separate money items: the **delivery fee**, and, in a sale, the **goods money**.
- The sender states on the request form whether it is a sale, whether the goods money is already paid or the receiver pays it on arrival, and who pays the delivery fee and when (the sender at pickup, or the receiver on arrival for local deliveries).
- Inter-city delivery fees are always paid by the sender at pickup, so the rider never advances the agency fee. When the parcel is delivered to an address, goods money can still be collected from the receiver at final delivery.
- Goods money cannot be collected when the receiver collects the parcel at the agency, so it must already be paid.
- A loud message on the rider's screen reminds the rider to collect money at pickup or on arrival. Tapping Picked up or Delivered records who received it.
- After a sale, the admin records whether the goods money was handed to the seller, and by whom.
- No limits are placed on cash at launch. We record who collected what, then design controls only if real problems appear.

**How it is checked.**

- **Sale:** the admin accepts what the sender says about who pays and when.
- **Simple parcel where the receiver is to pay the fee:** the request is flagged, and the admin first calls the receiver to confirm before approving.
- **Sender pays:** nothing more to confirm.

**How payment shows up.**

- Paid at pickup: the rider's job screen shows a loud message to collect the money from the sender. When the rider taps Picked up, the order is marked as paid, and the rider who received the money is recorded.
- Paid on arrival (local deliveries only): the same loud message appears at drop-off, to collect the money from the receiver before handing over. Tapping Delivered marks the order as paid, with the rider recorded.
- The sender, the receiver, the rider and the admin can all see whether the order is paid.

## 9. Trust and safety

- **Tracking page.** Anyone with the link can see the progress of an order without logging in. Each step is shown with a simple illustration. The page shows whether the delivery is paid (yes or no), but never phone numbers, addresses, prices or the delivery code. Once a delivery is finished, the link shows "Tracking expired" and no longer loads the delivery.
- **Delivery code.** The sender receives a 4-digit code when tracking starts and passes it to the recipient with the tracking link. The recipient gives the code to the rider at handover, which settles "I never received it".
- **Code access.** The rider never sees the code and only types what the recipient says. Guests see the code once, so they must copy it. The admin can always see it and shares it with the recipient only at the sender's request, or when the sender cannot be reached after handing over the parcel and paying. There is no code when the receiver collects at the agency.
- **Rider privacy.** Riders see sender and receiver details only after assignment.
- **Photo checks for inter-city.** Riders photograph the parcel at the agency when dropping and, for deliveries to an address, when collecting, and send the photos to the admin on WhatsApp. This is a manual step, not an upload on the platform. Admin notes the check in the system. The photos are kept only as legal backing.
- **Parcels in transit.** Once the admin confirms a drop at the agency, the order is In transit with an expected arrival time. The admin sees which parcels are overdue, phones the agency or agency driver, and marks the parcel as arrived, which updates the tracking page for everyone.
- **Records.** Every status change and every edit is logged with who did it and when.

## 10. Cities

Cities are configurable. Douala and Buea are the starting point. For each city the admin sets partner agencies and links riders. A city can be switched on or off, so expansion is a business decision, not a development project.

## 11. What we are deliberately leaving out for now

- Automatic price calculation
- Online payment
- Live map tracking of riders
- Photo uploads
- In-app chat or haggling (this happens on WhatsApp or by phone)
- Notifications to customers and riders (only the admin is alerted)
- Ratings and referral programs
- Limits or controls on cash on delivery

These can be added later, once real use shows which ones matter.

## 12. How we will know it is working

- Average time from request to approval
- Share of requests that end in a completed delivery
- Deliveries completed per day, week and month
- Share of delivery requests coming through the platform versus calls
- Average time from request to delivery
- Busiest routes and areas
- Repeat customers and account sign-up rate
- Failed or cancelled deliveries, with reasons
- Parcels in transit that arrive later than expected

## 13. Key risks

| Risk | Response |
| --- | --- |
| Customers wait too long for a price and call instead | Admin alerts with sound, a quick call-back to agree the price, visible Call us button |
| Cash held by riders is lost or taken | Riders are verified, all collections are recorded, controls are designed from real events |
| Lost parcels between cities | Agency details recorded, photo checks by WhatsApp, expected arrival times with follow-up on late parcels, activity log |
| Admin overloaded by manual work | Quick order entry for phone requests, learn from data before adding automation |
| Business is unregistered | Records built now make formalizing later easier |

## 14. Delivery plan

**Phase 1 (launch).** Local and inter-city delivery as described, with the three apps, admin alerts, tracking page, delivery code, status and activity logs, and basic reports.

**Phase 2 (after real data).** Based on what we learn: pricing help, rider job board, notifications, photo upload, cash controls, reporting upgrades, more cities.

## 15. Decisions still to confirm

- **Revenue arrangement** between the platform builder and the business owner: per-delivery commission, monthly fee, or share of growth.
- **Liability policy** for lost or damaged parcels, including prohibited items, and where it is shown to customers.
- **Ownership** of customer data and relationships.
- **5% discount**: whether the system applies it automatically to the amount the admin enters, or the admin enters the already discounted amount.
