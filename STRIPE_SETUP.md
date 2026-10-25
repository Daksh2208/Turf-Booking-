# Stripe Payment Integration Guide — Phase 13

This document outlines the setup, testing, and production activation procedures for the Stripe payment integration in the Turf Booking Platform.

---

## 1. Safety & Default Inactive Mode

By default, **online payments via Stripe are disabled** (`STRIPE_PAYMENT_ENABLED=false`) and all key placeholders are left empty.
- The platform continues to operate seamlessly using the built-in **Pay at Venue** option.
- When Stripe is disabled or unconfigured, customers are shown a clear notice:
  > *"Online payment is not configured yet. Please choose Pay at Venue."*
- Administrators cannot manually mark Stripe payments as paid; only verified webhooks and server-to-Stripe clearance can transition Stripe payments to `paid`.

---

## 2. Configuration & Environment Variables

All Stripe configuration is located in `turf-booking-platform/server/.env`:

```env
# Stripe Payment Configuration
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CURRENCY=inr
STRIPE_PAYMENT_ENABLED=false
CLIENT_URL=http://localhost:5173
```

### Where to Find Each Key in the Stripe Dashboard:
1. **Secret Key (`STRIPE_SECRET_KEY`)**:
   - Log in to [Stripe Dashboard](https://dashboard.stripe.com/).
   - Ensure the toggle in the upper right is set to **Test Mode**.
   - Navigate to **Developers** &rarr; **API keys**.
   - Copy the **Secret key** (starts with `sk_test_...`).
2. **Publishable Key (`STRIPE_PUBLISHABLE_KEY`)**:
   - In the same API keys tab, copy the **Publishable key** (starts with `pk_test_...`).
3. **Webhook Signing Secret (`STRIPE_WEBHOOK_SECRET`)**:
   - Navigate to **Developers** &rarr; **Webhooks**.
   - For local development with the Stripe CLI: Run `stripe listen` and copy the printed `whsec_...` secret.
   - For deployed environments: Click **Add endpoint**, specify `https://your-domain.com/api/v1/payments/stripe/webhook`, select the required events, and reveal the **Signing secret** (`whsec_...`).

> [!CAUTION]
> Never commit `.env` or paste real API keys into frontend code, Git repositories, issue trackers, or logs. `.env` is already included in `.gitignore`.

---

## 3. Local Webhook Testing with Stripe CLI

To test Stripe webhooks on your local machine:

1. **Install the Stripe CLI**:
   - Windows (via Scoop or Chocolatey): `scoop install stripe` or download from [Stripe CLI GitHub](https://github.com/stripe/stripe-cli/releases).
   - macOS: `brew install stripe/stripe-cli/stripe`
   - Linux: Follow the official Stripe CLI documentation.

2. **Authenticate the CLI**:
   ```bash
   stripe login
   ```

3. **Forward Webhook Events to your local backend**:
   ```bash
   stripe listen --forward-to localhost:5000/api/v1/payments/stripe/webhook
   ```
   The CLI will output a webhook signing secret:
   ```text
   > Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxx (^C to quit)
   ```

4. **Update `server/.env`**:
   Paste the printed signing secret into `STRIPE_WEBHOOK_SECRET`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxx
   ```

5. **Trigger a Test Event**:
   In another terminal:
   ```bash
   stripe trigger checkout.session.completed
   ```

---

## 4. Subscribed Webhook Events

When configuring webhooks in production, register the following events:
- `checkout.session.completed` — Triggered when checkout payment succeeds.
- `checkout.session.expired` — Triggered when the customer abandons the checkout window; releases temporary slot holds.
- `checkout.session.async_payment_succeeded` — Triggered when delayed payment methods (e.g., bank debits) clear.
- `checkout.session.async_payment_failed` — Triggered when delayed payment fails; releases reserved slot.

---

## 5. Slot Safety & Reservation Expiry Policy

- **Pending Lock Window**: When a customer clicks "Pay with Stripe", the slot is held in `pending` state with an expiration of 15 minutes (`paymentExpiresAt`).
- **Cancellation & Expiry**: If the customer abandons checkout, clicks "Back", or the session expires, the slot reservation is atomically marked `released`, allowing other customers to book the slot. Any applied coupon is released back to the user's quota.
- **Late Payment Recovery**: If a payment clears *after* a reservation expired and the slot was already reassigned to another customer, the platform **never** silently double-books the slot. The booking is marked `paid` with status `cancelled` and flagged with audit notes for an administrative refund or rescheduling.

---

## 6. How to Enable Online Payments

Only enable online payments after:
1. Valid test keys (`sk_test_...` and `pk_test_...`) are filled in.
2. Webhook forwarding is confirmed with `STRIPE_WEBHOOK_SECRET`.
3. Complete test transactions have been verified in test mode.

To enable, update `turf-booking-platform/server/.env`:
```env
STRIPE_PAYMENT_ENABLED=true
```
Restart the server:
```bash
npm run dev
```

---

## 7. Pre-Production Live Checklist

Before switching to live Stripe credentials:
- [ ] Complete business account identity verification on the Stripe Dashboard.
- [ ] Verify that your Stripe account supports Indian Rupee (`INR`) settlement and Domestic/International card acceptance.
- [ ] Update webhook endpoint URL in Stripe Dashboard to your live backend domain (`https://api.yourdomain.com/api/v1/payments/stripe/webhook`).
- [ ] Switch `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` to live keys (`sk_live_...`, `pk_live_...`, `whsec_...`).
- [ ] Ensure HTTPS/TLS certificate is active on both frontend and backend.
- [ ] Verify GST compliance and invoicing details match your registered business.
