# 🏟️ TurfSpot — Comprehensive Project Report

---

## 1. Executive Summary & Problem Statement

### 1.1 Project Objective
The objective of **TurfSpot** is to provide a complete, production-grade sports facility booking and inventory management platform for multi-sport complexes. The platform bridges the communication gap between sports enthusiasts (seeking Box Cricket, Football, Pickleball, and Badminton grounds) and arena managers by offering dynamic pricing, real-time slot synchronization, automated conflict prevention, and full administrative autonomy.

### 1.2 Problem Statement
Traditional sports arena booking is fraught with operational challenges:
- **Rigid Pricing**: Ground rates vary dramatically based on demand, day of the week, and time of day (e.g., peak evening floodlight hours vs. midday weekday slots). Hard-coded pricing models fail to capture this real-world demand.
- **Double Booking & Overlaps**: Manual booking via phone calls or spreadsheets frequently leads to overlapping slot reservations, customer friction, and financial loss.
- **Operational Inflexibility**: Changes to turf details, maintenance shutdowns, rate revisions, or rental equipment offerings require code deployments rather than immediate business administration.
- **Payment Reconciliation**: Venues struggle to track uncollected cash payments from "Pay at Venue" customers alongside card and online payments.

### 1.3 The TurfSpot Solution
TurfSpot solves these issues through a **Zero Hard-Coding Architecture**:
1. Every turf specification, price tier, peak-hour rule, weekend multiplier, equipment add-on, coupon code, and promotional banner is dynamically driven by a centralized MongoDB database.
2. An **Atomic Slot Reservation Engine** holds slots exclusively for 15 minutes during checkout, preventing race conditions and double bookings.
3. Facility owners manage everything through an **Admin Management Console** with real-time KPI metrics, slot blocking, and booking lifecycle controls.

---

## 2. Main Features & User Roles

The platform enforces strict domain separation between two primary user roles: **Customer** and **Administrator**.

```
                           ┌──────────────────────────────┐
                           │      TurfSpot Ecosystem      │
                           └──────────────┬───────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  ▼                                               ▼
     ┌─────────────────────────┐                     ┌─────────────────────────┐
     │     Customer Portal     │                     │   Admin Control Panel   │
     └────────────┬────────────┘                     └────────────┬────────────┘
                  │                                               │
         • Turf Discovery & Search                       • Executive KPI Dashboard
         • Sport & Facility Filters                      • Onboarding Tour Guide
         • Real-Time Slot Calendar                       • Arena Inventory (CRUD)
         • Live Dynamic Price Engine                     • Custom Slot Rates & Surcharges
         • Equipment Add-On Selection                    • Slot Blocker (Maintenance)
         • Promotional Coupons                           • Equipment & Sports Manager
         • Dual Checkout (Venue / Stripe)                • Booking Lifecycle & Status
         • Booking History & Receipts                    • Tax (GST) & Business Rules
```

### 2.1 Customer Role Capabilities
- **Landing & Discovery**: Browse curated marketing banners, supported sports, and available venues.
- **Advanced Filtering & Search**: Filter turfs by sport category, geographic location/area, price range, and amenities (floodlights, locker rooms, parking, cafeteria).
- **Live Conflict-Free Calendar**: View real-time availability for any selected date with hourly slots labeled as *Available*, *Booked*, or *Blocked*.
- **Dynamic Price Breakdown**: Inspect exact price calculations with live updates when toggling peak hours, weekend days, equipment add-ons, and coupon codes.
- **Checkout & Payment**: Complete reservations using either offline **Pay at Venue** or online **Stripe Card Checkout** with automated webhook verification.
- **My Bookings**: Track past and upcoming match schedules, payment realization status, and booking invoices.
- **Favourites**: Save preferred arenas for quick access.

### 2.2 Administrator Role Capabilities
- **Executive Operations Dashboard**: Track today's gross revenue, confirmed bookings, registered customer count, available slot totals, and today's chronological schedule.
- **Guided Onboarding Tour**: Integrated step-by-step feature walkthrough designed to train new facility administrators.
- **Turf Inventory Management**: Full CRUD capabilities for turf venues (dimensions, surface material, player capacity, opening/closing hours, amenities, and image gallery).
- **Custom Slot Rates Engine**: Set individual base rates, peak-hour surcharges (with configurable start and end times), and weekend rates per turf.
- **Slot Blocker**: Lock out specific time slots across dates for turf maintenance, rain delays, or private tournaments; instantly reflected on customer calendars.
- **Equipment & Add-ons**: Manage rentable sports gear (bats, balls, bibs, rackets) and custom per-booking fees.
- **Coupons & Promotions**: Create, edit, and deactivate percentage or fixed-amount discount codes with validity rules and usage quotas.
- **Booking Management**: Change booking statuses (`Confirmed`, `Pending`, `Completed`, `Cancelled`); cancelling any reservation atomically frees the slot.
- **Business & Tax Settings**: Centralized management of business branding, contact channels, cancellation cut-off window, and GST tax percentage.

---

## 3. Technology Stack & System Architecture

### 3.1 Technology Matrix
| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.1.0` | Declarative, component-based user interface |
| **Build Tool** | Vite | `^7.0.0` | Ultra-fast HMR and optimized production bundling |
| **Styling** | Tailwind CSS | `^4.1.0` | Utility-first responsive styling and animations |
| **Icons** | Lucide React | `^1.16.0` | Modern, consistent SVG iconography |
| **Tour Library** | Driver.js | `^1.10.2` | Interactive, step-by-step admin onboarding tour |
| **Backend Runtime** | Node.js | `v20.x` / `v22.x` | High-throughput asynchronous JavaScript runtime |
| **Server Framework** | Express.js | `^4.21.2` | RESTful API routing, middleware pipeline |
| **Database** | MongoDB | `v6.0+` / Atlas | High-performance document database |
| **ODM** | Mongoose | `^8.12.0` | Schema validation, business modeling, indexes |
| **Security** | Helmet + CORS | `^8.0.0` / `^2.8.5`| HTTP header protection and cross-origin access control |
| **Authentication** | JWT + Bcrypt | `^9.0.3` / `^3.0.2`| Stateless token rotation and salted password hashing |
| **Validation** | Zod + Express-Validator | `^3.24.0` | Runtime request payload validation |
| **Payment Gateway** | Stripe API | `^17.7.0` | Secure card payments, webhooks, and hold management |
| **Real-Time Engine** | Socket.IO | `^4.8.4` | WebSocket synchronization of slot reservations |

### 3.2 Architectural Pattern
The backend adheres to a **Modular MVC + Service Layer Architecture**:
- **Controllers (`controllers/`)**: Handle HTTP requests, parse query parameters, invoke appropriate services, and return standardized JSON responses.
- **Service Layer (`services/`)**: Encapsulates core business logic (dynamic pricing algorithms, atomic slot hold management, coupon validation, Stripe checkout sessions).
- **Data Access Layer (`models/`)**: Mongoose schemas defining collection structures, data validation, compound indexes, and lifecycle hooks.
- **Middleware Pipeline (`middleware/`)**: Authentication guards (`requireAuth`), role-based access control (`requireAdmin`, `requireCustomer`), request logging, and global error handling.

---

## 4. Database Models & Entity Relationships

```
┌──────────────┐          1:N          ┌──────────────────┐
│     User     ├──────────────────────►│     Booking      │
└──────────────┘                       └─────────┬────────┘
                                                 │
                                                 │ N:1
                                                 ▼
┌──────────────┐          1:N          ┌──────────────────┐
│    Sport     ├──────────────────────►│       Turf       │
└──────────────┘                       └─────────┬────────┘
                                                 │
                                                 │ 1:N
                                                 ▼
┌──────────────┐                       ┌──────────────────┐
│    Coupon    │                       │   BlockedSlot    │
└──────────────┘                       └──────────────────┘
```

### 4.1 Schema Overview

#### 1. `User` Schema
- `name` (String, required): Full name.
- `email` (String, required, unique, indexed): Normalized email address.
- `passwordHash` (String, required, private): Salted bcrypt hash (`select: false`).
- `role` (String, enum: `['customer', 'admin']`, default: `'customer'`): User authorization role.
- `phone` (String): Contact phone number.
- `favorites` (Array of ObjectId referencing `Turf`): Bookmarked venues.
- `isActive` (Boolean, default: `true`): Account status flag.

#### 2. `Turf` Schema
- `name` (String, required), `slug` (String, unique, indexed): Human-readable name and URL slug.
- `sports` (Array of ObjectId referencing `Sport`): Supported sports at this venue.
- `address` (Object): Street, City, State, ZipCode.
- `images` (Array of String): URLs of venue photographs.
- `facilities` (Array of String): Available amenities (e.g., Floodlights, Parking).
- `size` (String), `surface` (String): Dimensions and turf material.
- `openingHours` (`{ open: '06:00', close: '23:00' }`): Daily operational window.
- `pricing` (Object):
  - `baseRate` (Number in paise): Standard hourly weekday rate.
  - `peakRate` (Number in paise): Surcharge hourly rate during high-demand hours.
  - `weekendRate` (Number in paise): Surcharge hourly rate on weekends.
  - `peakHours` (`{ start: '18:00', end: '23:00' }`): Time window for peak charges.
  - `weekendDays` (Array of Number, default: `[0, 6]`): Days classified as weekends.
- `isActive` (Boolean, default: `true`).

#### 3. `Booking` Schema
- `bookingReference` (String, unique, indexed): e.g., `TB-261025-8580`.
- `customer` (ObjectId referencing `User`): Associated customer.
- `turf` (ObjectId referencing `Turf`): Reserved turf ground.
- `sport` (ObjectId referencing `Sport`): Selected sport.
- `date` (String, format `YYYY-MM-DD`, indexed): Match date.
- `timeSlots` (Array of `{ start: '08:00', end: '09:00', rate: 90000 }`): Booked intervals.
- `addOns` (Array of `{ addOn: ObjectId, quantity: Number, price: Number }`): Rented gear.
- `pricingSnapshot` (Object): Immutable copy of base rate, peak charges, weekend charges, add-on costs, coupon discount, GST percentage, and grand total.
- `paymentMethod` (String, enum: `['pay_at_venue', 'stripe']`).
- `paymentStatus` (String, enum: `['unpaid', 'pending', 'paid', 'refunded']`).
- `status` (String, enum: `['pending', 'confirmed', 'completed', 'cancelled']`).
- `stripeSessionId`, `paymentExpiresAt` (Date): For online checkout lock tracking.

#### 4. `BlockedSlot` Schema
- `turf` (ObjectId referencing `Turf`, indexed): The locked arena.
- `date` (String, format `YYYY-MM-DD`, indexed): Date of the closure.
- `timeSlots` (Array of String, e.g. `['14:00', '15:00']`): Hourly slots under closure.
- `reason` (String, enum: `['maintenance', 'tournament', 'weather', 'private_event']`).
- `notes` (String): Administrative details.

#### 5. `AddOn` & `Coupon` Schemas
- `AddOn`: Equipment catalog items (bats, footballs, rackets) with pricing in paise and active status.
- `Coupon`: Discount rules (percentage or fixed amount), minimum spend requirement, usage caps, and per-user limits.

#### 6. `BusinessSettings` Schema (Singleton)
- `businessName`, `contactEmail`, `contactPhone`, `currency` (`INR`).
- `taxSettings`: `{ taxEnabled: true, taxName: 'GST', taxRatePercentage: 18 }`.
- `bookingRules`: `{ slotDurationMinutes: 60, maxAdvanceBookingDays: 30, cancellationCutoffHours: 6 }`.

---

## 5. Critical Core Workflows

### 5.1 Dynamic Pricing Calculation Algorithm
When a customer selects a turf, date, and time slots, the pricing engine computes the total using the following deterministic formula:

$$\text{Grand Total} = (\text{Subtotal} + \text{AddOns} - \text{Coupon Discount}) \times (1 + \text{GST})$$

```
                   Slot Requested (e.g. 19:00 - 20:00 on Saturday)
                                      │
                   Is the date a Weekend Day (Sat/Sun)?
                                      │
                     ├── YES ──► Use Weekend Rate (e.g. ₹1,200/hr)
                     └── NO  ──► Is time within Peak Hours (18:00 - 23:00)?
                                   ├── YES ──► Use Peak Rate (e.g. ₹1,400/hr)
                                   └── NO  ──► Use Base Rate (e.g. ₹900/hr)
                                      │
                                      ▼
                        Calculate Slot Charges for All Hours
                                      │
                                      ▼
                        Add Selected Equipment Add-Ons
                                      │
                                      ▼
                        Apply Validated Coupon Discount
                                      │
                                      ▼
                        Compute 18% GST (Tax Settings)
                                      │
                                      ▼
                          Immutable Pricing Snapshot
```

### 5.2 Atomic Slot Reservation & Concurrency Protection
To prevent simultaneous bookings of the same slot:
1. **Hold Request**: When a user proceeds to checkout, the system issues a temporary reservation document with a 15-minute countdown (`paymentExpiresAt`).
2. **Availability Check**: The calendar filters out slots that are either:
   - Part of a `Confirmed` booking.
   - Part of a `BlockedSlot` record.
   - Part of an active `Pending` booking whose `paymentExpiresAt` has not yet elapsed.
3. **Automatic Expiration**: If the customer abandons the checkout session, closes the browser, or payment fails, the pending reservation expires and is immediately available to other players.
4. **Late Payment Recovery**: If a webhook confirms a payment for an already-expired slot that was subsequently booked by another user, the platform flags the transaction as `cancelled` with an administrative audit tag for refund rather than double-booking the court.

### 5.3 Cancellation & Automatic Slot Release Workflow
1. The customer or admin initiates a cancellation request.
2. The system checks the `cancellationCutoffHours` rule from `BusinessSettings` (e.g., minimum 6 hours before slot start).
3. If valid, the booking status transitions to `Cancelled`.
4. Any active slot reservation lock associated with that booking reference is atomically deleted.
5. Socket.IO broadcasts an `inventory:slot_released` event to all active browsers, turning the slot green (*Available*) instantly.
6. If a coupon code was used, the user's redemption count is decremented to restore their discount quota.

---

## 6. Evaluation Criteria & Project Compliance

| PRD Requirement | Implementation in TurfSpot | Status |
| :--- | :--- | :--- |
| **Zero Hard-Coding** | Every turf, price, slot rate, banner, and fee is MongoDB-backed | ✅ 100% Compliant |
| **Multi-Sport Support** | Box Cricket, Football, Pickleball, Badminton with player capacities | ✅ 100% Compliant |
| **Dynamic Slot Rates** | Base rate, peak-hour surcharge, weekend rates per venue | ✅ 100% Compliant |
| **Slot Blocker** | Instant maintenance/tournament closures reflected on calendar | ✅ 100% Compliant |
| **Booking & Checkout** | Pay at Venue and Stripe Card payments with atomic slot holds | ✅ 100% Compliant |
| **Admin Control Panel** | Full CRUD for turfs, rates, banners, coupons, bookings, settings | ✅ 100% Compliant |
| **Onboarding Tour** | Built-in interactive walkthrough guiding administrators | ✅ 100% Compliant |
| **Security & RBAC** | JWT access/refresh token rotation, bcrypt hashes, httpOnly cookies | ✅ 100% Compliant |
