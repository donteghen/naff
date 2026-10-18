# Manual Process Flow: Delivery Operations (V1)

This document describes what people do by phone and WhatsApp, and what the platform records. Principle: the platform records and organizes; humans communicate and decide. No user or driver notifications. Only the admin gets alerts.

## 1. Roles

- **User (sender):** books as guest or with an account (5% off the agreed price). Accounts use phone and PIN, with an email address for PIN resets. Guest orders are never linked to an account later. The sender fills in as much as possible about the delivery, so the admin has less to do.
- **Admin:** a dedicated person who sits in one place and manages orders: receives requests, verifies them, calls the customer to agree the price, approves, assigns, follows deliveries in transit, edits orders, enters orders for callers. Never a driver. Admins have permission groups, and admins with the right permission create, edit and delete other admin accounts.
- **Driver:** linked to one city. Sees sender and receiver details only after assignment. Updates delivery status only. Drivers focus on driving and never manage orders or prices.

## 2. The request form (filled in by the sender)

The form is dynamic and asks one question at a time. Admins entering an order for a phone caller use the same form.

1. **Same city, or another town?**
2. **For another town:** deliver to the receiver's address, or does the receiver collect at the agency in the other town?
3. **Is this a sale?** If yes: is the goods money already paid (for example by mobile money), or does the receiver pay it on arrival (with the amount)? The "receiver pays on arrival" option is not offered when the receiver collects at the agency.
4. **Who pays the delivery fee, and when?** Sender at pickup, or receiver on arrival (local deliveries only). For another town it is always the sender at pickup.
5. **Parcel size:** envelope, small, medium, large or bulky.
6. **Pickup and drop-off:** map pin, WhatsApp location, or address with landmark. Receiver name and phone, and a description of the parcel. For another town, an optional preferred agency.

The admin sees a plain-language summary at the top of each request, for example "Local sale. Receiver pays 15,000 for the goods plus the delivery fee on arrival." If the request is not a sale and the receiver is to pay the fee, the request is marked **confirm with receiver first**.

The pending screen after submitting shows a **Call us** button.

## 3. Local delivery (same city)

1. **Request.** The sender submits the form above.
2. **Admin alert.** Email and websocket push with sound, admin only. After that, every status update on any delivery (accepted, picked up, dropped at agency, and so on) also sounds an alert on the admin screen. The admin is a dedicated person whose browser stays open during working hours.
3. **Price and approval.** The admin reads the summary and calls the customer to confirm the request and agree the price. If the request is marked confirm with receiver first, the admin calls the receiver before approving, and ticks "receiver confirmed". The admin enters the amount and approves (status: Approved). The system logs who set the price and when. The customer takes no further step.
4. **Assignment.** The admin phones drivers to find who is closest, based on their ongoing or last delivery, and assigns. Status: Assigned, awaiting driver.
5. **Driver confirms.** The driver sees sender and receiver details and accepts. Tracking starts ("Driver coming for pickup"), and the sender sees the delivery code and a tracking link (section 10).
6. **Pickup.** If the delivery fee is paid at pickup, the job screen shows a loud message telling the driver to collect it from the sender. When the driver taps Picked up, the system sets paid to true and paidTo to this driver.
7. **Delivery.** The driver calls the receiver on arrival. If money is due at delivery (the delivery fee, the goods money of a sale, or both), the job screen shows a loud message with the amounts to collect before handing over. The driver asks for the 4-digit delivery code, types it in, hands over and taps Delivered. The system then sets paid to true and paidTo to this driver for the fee, and records the goods money as collected by this driver.
8. **Problems.** The driver phones the admin. The admin edits the order (price, address, etc.). Every change goes into the activityLog.

## 4. Inter-city delivery to the receiver's address (e.g. Douala to Buea)

The delivery fee is always paid by the sender at pickup. The price agreed by the admin includes the agency fee, which is recorded in an admin-only field. Users see only the total. Only partner agencies registered for the cities are used.

1. **Request, alert, approval.** Same as local steps 1 to 3. The admin's summary also shows the destination city and the preferred agency, if any.
2. **Assignment of both drivers.** The admin assigns the origin-city driver and also the destination-city driver, phoning both. The destination driver must be assigned before the parcel is dropped at the agency, because the agency registers the parcel under that driver. The Dropped at agency button stays locked until then. If the admin later replaces the destination driver, the agency is told, and the change is logged. Each driver confirms in their own app.
3. **Pickup.** Same as local step 6. The sender pays the whole delivery fee at pickup, so the driver does not advance the agency fee. The loud message and paid rule apply.
4. **Drop at agency (origin driver).**
   - Agency staff register and wrap the parcel under the **destination driver's name and phone**, not the receiver's.
   - The driver takes a photo of the wrapped, registered parcel and sends it to the admin on WhatsApp.
   - The driver records in the platform: agency, agency vehicle number, agency driver's phone, and the expected travel time (ETA). The driver gets the ETA by asking the agency driver of that vehicle, because only he can estimate it on our damaged roads. There is no default value, and the system does not allow Dropped at agency without an ETA. Status: Dropped at agency.
   - The admin checks the photo and taps the confirmation button, labelled "Confirming a drop-off at agency puts the delivery in transit". Status: In transit.
5. **Following the parcel.** The admin has a filter for orders that are In transit with the ETA passed. These are also highlighted. After the ETA, the admin phones the agency or the agency driver. When the parcel has arrived, one tap sets **Arrived at agency B**. The tracking page updates for everyone with the link.
6. **Collection at agency (destination driver).** The admin phones the destination driver, who goes to the agency. Before taking the parcel, the driver photographs it and sends the photo to the admin on WhatsApp. The admin compares it with the origin photo, then the driver collects it. Status: Collected at destination.
7. **Last mile.** The destination driver calls the receiver, asks for the delivery code and types it in. If goods money is due, a loud message shows the amount to collect, and the driver collects it before handing over. The driver hands over and taps Delivered. The goods money is recorded as collected by this driver.
8. **Problems.** Same as local step 8. An issue flag alerts the admin if a parcel is late, lost or sent to the wrong town.

## 5. Inter-city delivery that ends at the agency (receiver collects)

There is no destination driver, no delivery code and no goods money to collect. If the parcel is a sale, the goods money must already be paid.

1. **Request, alert, approval.** Same as local steps 1 to 3, with the destination agency chosen.
2. **Assignment.** The admin assigns the origin-city driver only.
3. **Pickup.** Same as section 4, step 3.
4. **Drop at agency.** The agency registers the parcel under the **receiver's name and phone**. The driver sends the photo to the admin, records the agency, vehicle number, agency driver's phone and ETA. The admin confirms with the same button, and the delivery goes In transit.
5. **Following the parcel.** Same as section 4, step 5. The admin sets Arrived at agency B after phoning the agency or agency driver. The tracking page then reads "Ready for collection at agency B", showing the agency name and vehicle number.
6. **Completion.** The admin phones the receiver to say the parcel is at the agency, then marks the delivery Delivered. Our job ends there. We do not wait for the receiver to collect it.

## 6. Photo evidence (manual, off-platform)

Images are not uploaded to the platform in V1. WhatsApp is the evidence store. The photos exist only as legal backing if something goes wrong.

| When | Who | Photo | Sent to |
| --- | --- | --- | --- |
| Parcel dropped at origin agency | Origin driver | Wrapped parcel as registered by agency staff | Admin, WhatsApp |
| Parcel collected at destination agency (deliveries to an address only) | Destination driver | Parcel before pickup | Admin, WhatsApp |

The admin adds a short note in the activityLog ("origin photo confirmed", "destination photo confirmed"). No image, just a record that the check happened. The origin note is made by the confirmation button.

## 7. Payments

There is no payment gateway. Money moves in cash or mobile money, outside the platform. The platform records it. Each order has two separate money items.

- **Delivery fee.** The sender pays at pickup, or the receiver pays on arrival (local deliveries only). Another town is always the sender at pickup.
- **Goods money (only in a sale).** Either already paid, or paid by the receiver on arrival to the driver (not available when the receiver collects at the agency).

How it shows up:

- **At pickup:** the driver's job record shows a loud message with the amount to collect from the sender. Tapping Picked up sets paid to true and paidTo to this driver.
- **On arrival:** the job record shows a loud message with the amounts to collect from the receiver before handing over. Tapping Delivered sets paid to true and paidTo to this driver for the fee, and records goods money as collected by this driver.
- Admins, the assigned drivers, the sender and the receiver can all see the paid status. The public tracking page shows only Paid or Not paid, never amounts.
- **Handing the goods money to the seller:** the admin ticks "goods money handed to seller: yes or no, by whom". This is a record, not a control.
- A sender who says it is a sale to skip the receiver confirmation is accepted for now. If the receiver then refuses to pay, the order ends as Failed with a reason, and we learn from the data.
- No caps or controls on cash in V1. Record the data, review the exposure, and design controls from real problems.

## 8. Exits and issues

- **Before pickup:** Cancelled, each with a reason. This includes a customer who declines the price on the call.
- **After pickup:** Failed, with a reason.
- **Issue flag:** can be raised on any active order. It overlays the current step and alerts the admin.

## 9. What the system records from day one

- Pickup and drop-off coordinates when provided, plus landmark or address text
- The answers on the request form (sale or not, who pays what and when, parcel size, delivery or collect at agency)
- Final price, who set it, and every change
- Timestamps for every status transition (statusChangeLog)
- All other actions: reassignments, price edits, notes (activityLog)
- Cancellation and failure reasons
- Source: web or admin-entered
- For inter-city: agency, vehicle number, agency driver's phone, ETA, and actual arrival time
- Whether it is paid, which driver received the money, and whether goods money was handed to the seller

## 10. Delivery code and tracking link

- When tracking starts (origin driver confirmed), the sender sees the 4-digit delivery code and a tracking link, each with a copy button. There is no delivery code when the receiver collects at the agency.
- A logged-in sender can open the code again at any time. A guest sees it once and must copy it.
- The sender sends the tracking link and the code to the receiver, for example on WhatsApp.
- The driver never sees the code. At handover the receiver says it and the driver types it in.
- The admin can always see the code. The admin tells it to the receiver only at the sender's request, or when the sender cannot be reached after handing over the parcel and paying.
- The tracking page shows each step with its own illustration, and whether the delivery is paid (yes or no). For inter-city, it shows In transit, Arrived at agency B, and for a collect-at-agency delivery "Ready for collection at agency B". It never shows phone numbers, addresses, price or the code. Once the delivery is finished (delivered, cancelled or failed), the link stops working and shows "Tracking expired, this delivery is complete". Registered users still see their finished orders in their account.
