# 🏟️ TurfSpot — Sports Turf Booking & Facility Operating System

[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7.0.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.1.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose_8.12-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.4_Real--Time-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Payment_Gateway-008CDD?logo=stripe&logoColor=white)](https://stripe.com/)
[![Vitest](https://img.shields.io/badge/Vitest-243_Tests_Passing-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A production-grade, full-stack **MERN** (MongoDB, Express.js, React 19, Node.js) web application and real-time facility operating system engineered for sports arena discovery, atomic slot scheduling, authoritative dynamic pricing, self-service cancellations with automated Stripe refunds, and comprehensive facility administration.

Designed specifically for multi-sport complexes catering to **Box Cricket**, **Football**, **Pickleball**, and **Badminton**, TurfSpot implements a **Strict Zero-Hardcoding Architecture**: every venue specification, hourly slot price, peak-hour surcharge window, weekend multiplier, promotional banner, equipment rental add-on, slot block, coupon rule, tax percentage, and cancellation policy is controlled dynamically from the Admin Panel in real time via a unified MongoDB database.

---

## 📑 Table of Contents

- [Technical Documentation & Audit Reports](#-technical-documentation--audit-reports)
- [Key Highlights & Architectural Superpowers](#-key-highlights--architectural-superpowers)
- [Platform Showcase & UI Screenshots](#-platform-showcase--ui-screenshots)
  - [1. Customer Portal](#1-customer-portal)
  - [2. Admin Operations Panel](#2-admin-operations-panel)
- [System Architecture & Data Flows](#-system-architecture--data-flows)
  - [High-Level Tier Architecture](#high-level-tier-architecture)
  - [Real-Time Slot Hold & Concurrency Protection Flow](#real-time-slot-hold--concurrency-protection-flow)
  - [Self-Service Cancellation & Stripe Refund Flow](#self-service-cancellation--stripe-refund-flow)
- [Core Features & Modules](#-core-features--modules)
  - [Customer Booking Portal](#-customer-booking-portal)
  - [Admin Control & Operations Console](#-admin-control--operations-console)
- [Tech Stack & Engineering Standards](#-tech-stack--engineering-standards)
- [Project Directory Structure](#-project-directory-structure)
- [Prerequisites](#-prerequisites)
- [Environment Configuration](#-environment-configuration)
  - [1. Server Environment (`server/.env`)](#1-server-environment-serverenv)
  - [2. Client Environment (`client/.env`)](#2-client-environment-clientenv)
- [Installation & Quickstart Guide](#-installation--quickstart-guide)
  - [Step 1: Install Dependencies](#step-1-install-dependencies)
  - [Step 2: Seed the Database](#step-2-seed-the-database)
  - [Step 3: Run the Application](#step-3-run-the-application)
- [Database Seeding & Test Credentials](#-database-seeding--test-credentials)
- [Stripe Online Payments & Webhook Setup](#-stripe-online-payments--webhook-setup)
- [REST API Endpoints Reference](#-rest-api-endpoints-reference)
- [Socket.IO Real-Time Event Architecture](#-socketio-real-time-event-architecture)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Production Readiness Audit Summary](#-production-readiness-audit-summary)
- [License](#-license)

---

## 📚 Technical Documentation & Audit Reports

For comprehensive system diagrams, database schemas, deep-dive implementation reports, and security analyses, consult the specialized documents in the repository:

| Document | Purpose & Scope |
| :--- | :--- |
| **[Production Audit Report](PRODUCTION_AUDIT_REPORT.md)** | Multi-perspective audit (Platform Owner, Customer/Player, Software Architect), phase-by-phase implementation verification (Phases 1, 2, 3, 3.1 & 3.2), and 100% production readiness scorecard. |
| **[Project Technical Report](docs/PROJECT_REPORT.md)** | Problem statement, functional domain requirements, MERN architecture, database schemas & referential integrity, and end-to-end user journeys. |
| **[Setup & Installation Guide](docs/SETUP.md)** | Detailed step-by-step installation instructions, environment configuration reference, MongoDB seeding, Stripe CLI testing, and troubleshooting FAQs. |
| **[Security Architecture Document](docs/SECURITY.md)** | Deep technical dive into JWT rotation, bcrypt password hashing, RBAC middleware, express-validator sanitization, Helmet headers, CORS policies, and Stripe webhook HMAC-SHA256 signature verification. |

---

## 🌟 Key Highlights & Architectural Superpowers

- **Strict Zero-Hardcoding Architecture**: No pricing, sports, banners, turfs, or rules are hard-coded. Any change committed by the administrator in the Admin Panel immediately reflects across customer search, slot calendars, and checkout totals without requiring server redeployment or client page reloads.
- **Real-Time WebSocket Synchronization (Socket.IO)**: Client browsers join room-specific channels (`turf:${turfId}:${date}`). Changes made via slot holds, administrative slot blocks, cancellations, or bookings broadcast instantaneously with zero client polling load.
- **10-Minute Concurrency-Safe Temporary Slot Holds**: Prevents double-booking during checkout. Multi-slot reservations are protected with atomic locks and duplicate-key race condition handling. Abandoned sessions automatically expire after 10 minutes and are swept by a 60-second background worker.
- **Authoritative Backend Dynamic Pricing Engine**: Formula: `Total = (Base/Peak/Weekend Rate × Hours) + Equipment Add-Ons - Coupon Discount + GST`. Calculation executes strictly on the backend in integer paise (`Math.round`) to safeguard against tampering and floating-point errors.
- **State-Preserving Public Discovery & Authentication Handoff**: Customers browse turfs, filter by sport/amenities/price, pick dates, select slots, and review dynamic pricing quotes 100% publicly without mandatory upfront registration. Authenticating mid-flow retains the user's booking state seamlessly.
- **Self-Service Cancellation & Automated Stripe Refunds**: Customers can cancel eligible bookings directly from "My Bookings" with a live refund estimation modal. Integrated with Stripe's Refund API with idempotency and immediate slot inventory release.
- **Customer "My Bookings" Match Hub**: Includes 5 instant smart filters (`All`, `Upcoming`, `Today`, `Past`, `Cancelled`) with live badge counts, an interactive calendar date filter with quick clear, digital Booking Pass modal, and contextual action buttons.
- **Automated Lifecycle Reconciliation & Midnight Rollover**: 60-second periodic background worker auto-completes finished matches based on the venue timezone (`Asia/Kolkata`), accurately managing overnight matches crossing midnight (`23:00` to `01:00`).
- **Referential Integrity & Safe Deletion**: Built-in backend safeguards prevent deletion of sports, turfs, or equipment add-ons actively tied to upcoming bookings or active reservations.
- **Interactive Admin Onboarding Tour**: Integrated step-by-step guided walkthrough powered by Driver.js welcoming facility operators across the dashboard, calendar, pricing, and bookings.

---

## 📸 Platform Showcase & UI Screenshots

### 1. Customer Portal

#### 🏠 Landing Page & Hero Section
> Dynamic hero carousel featuring active promotional banners, quick sport navigation pills (Box Cricket, Football, Pickleball, Badminton), and instant registration call to action.
![Landing Page](screenshots/01_landing_page.png)

#### 📝 Interactive Real-Time Registration
> Frictionless customer onboarding featuring live password strength evaluation, interactive validation criteria, and terms consent.
![Customer Registration](screenshots/02_customer_registration.png)

#### 🔍 Turf Discovery, Sports Filtering & Amenities
> Search by arena name or area, filter by sport, price range sliders, and venue amenities (floodlights, parking, locker rooms) with pagination and sorting.
![Turf Discovery](screenshots/03_turf_discovery.png)

#### 📅 Interactive Slot Availability Grid & Live Dynamic Pricing Engine
> Real-time hourly availability grid synchronized via WebSockets. Visualizes 5 slot states (Available, Selected, Held, Booked, Blocked) alongside a live transparent price calculation breakdown.
![Slot Booking & Pricing](screenshots/04_slot_booking_pricing.png)

---

### 2. Admin Operations Panel

#### 🧭 Interactive Admin Onboarding Tour
> Step-by-step interactive walkthrough guiding arena managers through key operational workflows: dashboard analytics, turf management, slot blocker, and pricing controls.
![Admin Onboarding Tour](screenshots/05_admin_onboarding_tour.png)

#### 📊 Live Operations Tracker & Executive KPI Dashboard
> Real-time KPI monitoring displaying today's confirmed revenue, active reservations, registered customer accounts, and remaining available slot capacity.
![Admin Dashboard](screenshots/06_admin_dashboard.png)

#### 🏟️ Turf Arenas Management (Full CRUD)
> Complete facility inventory control — add arenas, assign sports, configure dimensions, surface types, opening/closing hours, amenities, and upload venue photos with live preview.
![Admin Turf Management](screenshots/07_admin_turf_management.png)

#### 📋 Bookings & Reservations Central
> Comprehensive booking ledger featuring multi-parameter search, status management (`Confirmed`, `Pending`, `Completed`, `Cancelled`), desk payment reconciliation, and admin refund overrides.
![Admin Bookings](screenshots/08_admin_bookings_calendar.png)

#### 🚫 Slot Blocker (Maintenance & Tournaments)
> Lock specific date and time slots across any arena for routine groundskeeping or external tournament fixtures; updates customer calendars immediately via Socket.IO.
![Admin Blocked Slots](screenshots/09_admin_blocked_slots.png)

#### ⚙️ Business Profile, Tax & Policy Settings
> Zero-code configuration of business identity, contact channels, dynamic GST percentage, and cancellation cutoff windows.
![Admin Settings](screenshots/10_admin_settings.png)

---

## 🏗️ System Architecture & Data Flows

### High-Level Tier Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          CLIENT TIER (React 19 + Vite 7)                   │
│   ┌───────────────────────────────────┬───────────────────────────────┐   │
│   │       Customer Web Portal         │     Admin Operations Hub      │   │
│   │   • Public Discovery & Search     │   • Real-Time Operations KPI  │   │
│   │   • Dynamic Pricing & Add-Ons     │   • Turf & Slot Rates CRUD    │   │
│   │   • 10-Min Temporary Slot Holds   │   • Maintenance Slot Blocker  │   │
│   │   • Stripe & Pay at Venue Flow    │   • Booking & Refund Controls │   │
│   │   • "My Bookings" Match Hub       │   • Business & Tax Settings   │   │
│   └─────────────────┬─────────────────┴───────────────┬───────────────┘   │
└─────────────────────┼─────────────────────────────────┼───────────────────┘
                      │ HTTP / REST                     │ HTTP / REST
                      │ Socket.IO (WebSockets)          │ Socket.IO (WebSockets)
                      ▼                                 ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                       EXPRESS.js REST API & WEBSOCKET ENGINE              │
│   ├── Security & Guard: Helmet, CORS, Rate Limiters, Cookie Parser        │
│   ├── Authentication: JWT Access (15m) / Refresh (7d) Rotation + Bcrypt   │
│   ├── Real-Time Layer: Socket.IO Server with `turf:${id}:${date}` Rooms   │
│   ├── Authoritative Business Services:                                    │
│   │   • Dynamic Pricing Engine (Integer Paise Calculation)                │
│   │   • Concurrency & Atomic Slot Hold Manager (10-min window)            │
│   │   • Stripe Webhook & Automated Refund Handler                         │
│   │   • 60s Lifecycle Scheduler (Auto-complete & Hold Sweeper)            │
│   └── Input Validation: express-validator Sanitization & Error Middleware │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ Mongoose ODM 8.12
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     MONGODB DATABASE (Single Source of Truth)              │
│   ├── Users (Customer, Admin)         ├── Turfs & Dynamic Slot Rates      │
│   ├── Sports & Equipment Add-Ons      ├── Temporary Holds (HeldSlot)      │
│   ├── Blocked Slots (Maintenance)     ├── Bookings & Invoices             │
│   ├── Promotional Banners & Coupons   └── Business Settings (Singleton)   │
└───────────────────────────────────────────────────────────────────────────┘
```

---

### Real-Time Slot Hold & Concurrency Protection Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as ⚽ Customer
    participant React as 💻 React Client
    participant Server as ⚙️ Express & Services
    participant DB as 🗄️ MongoDB Atlas
    participant Sockets as 📡 Socket.IO Engine
    participant OtherUsers as 👥 Other Customers

    Customer->>React: Selects Slot(s) and clicks "Proceed to Book"
    React->>Server: POST /api/v1/reservations/hold { turfId, date, slots }
    Server->>DB: Check active bookings & held slots for conflicts
    alt Slot Conflict Exists
        Server-->>React: 409 Conflict (SLOT_ALREADY_RESERVED)
        React-->>Customer: Shows alert: "Slot just booked by another user"
    else Slot Free
        Server->>DB: Atomic insert into HeldSlot collection (expires in 10 mins)
        Server->>Sockets: broadcastAvailabilityUpdate(turfId, date)
        Sockets-->>OtherUsers: emit('availability_update') -> Slot turns "Held"
        Server-->>React: 200 OK (Reservation Token, 10-Min Countdown)
        React-->>Customer: Opens Checkout with active 10:00 timer
    end
```

---

### Self-Service Cancellation & Stripe Refund Flow

```mermaid
sequenceDiagram
    autonumber
    actor Player as ⚽ Customer / Captain
    participant Client as 💻 React App (My Bookings)
    participant API as ⚙️ Backend API
    participant Stripe as 💳 Stripe API
    participant DB as 🗄️ MongoDB
    participant Sockets as 📡 Socket.IO

    Player->>Client: Clicks "Cancel Booking"
    Client->>API: GET /api/v1/bookings/:id/cancellation-preview
    API->>DB: Fetch booking & BusinessSettings (cutoff window)
    API-->>Client: Returns eligibility, cutoff deadline & refund estimate
    Client->>Player: Displays confirmation modal with refund preview
    Player->>Client: Confirms cancellation request
    Client->>API: POST /api/v1/bookings/:id/cancel { reason }
    API->>DB: Verify match start time > cutoff deadline
    alt Paid via Stripe
        API->>Stripe: stripe.refunds.create({ payment_intent: pi_id })
        Stripe-->>API: Refund Object (Status: succeeded / pending)
        API->>DB: Update Booking (status: 'cancelled', refundStatus: 'refunded')
    else Pay at Venue
        API->>DB: Update Booking (status: 'cancelled', refundStatus: 'not_applicable')
    end
    API->>DB: Delete held / reserved slot documents
    API->>Sockets: broadcastAvailabilityUpdate(turfId, date)
    Sockets-->>Client: Instant slot release to public pool
    API-->>Client: 200 OK (Booking Cancelled & Refund Dispatched)
    Client-->>Player: Real-time UI update with refund reference
```

---

## 🚀 Core Features & Modules

### 👤 Customer Booking Portal

- **Dynamic Hero & Promotional Banners**: Carousel displaying real-time marketing announcements, tournament banners, and CTAs managed by admins.
- **Dynamic Sports Navigation**: Direct category filters for Box Cricket, Football, Pickleball, and Badminton loaded directly from MongoDB.
- **Advanced Multi-Parameter Turf Discovery**: Search by name or area, filter by sport, price range, and amenities (floodlights, parking, changing rooms) with responsive pagination and sorting.
- **Public Access without Barriers**: Explore turfs, inspect facility specs, check real-time availability, and calculate price quotes 100% publicly before signing in.
- **State-Preserving Authentication Handoff**: Unauthenticated users are redirected to login/registration only upon checkout; original booking state, selected slots, and add-ons are preserved and restored.
- **Visual Slot Availability Grid**: Real-time hourly slot matrix showing 5 distinct visual states: **Available**, **Selected**, **Held (by another user)**, **Booked**, and **Blocked (maintenance)**.
- **Live Transparent Dynamic Pricing Breakdown**: Real-time itemized price quote detailing slot base rates, peak-hour surcharges, weekend multipliers, equipment add-ons, coupon deductions, and GST.
- **Equipment Rental Add-Ons**: Multi-item equipment selection (Cricket bats/balls, FIFA-grade footballs, badminton rackets, pickleball paddles, team bibs).
- **Promotional Coupon System**: Apply coupon codes (`SUPER3000`, `MATCHDAY15`, `FLAT100`, `WEEKEND500`) with dynamic minimum spend rules and maximum discount limits.
- **Dual Payment Integration**: Instant card checkout via **Stripe** (with automated webhook processing) or offline **Pay at Venue**.
- **Customer "My Bookings" Match Hub**:
  - 5 instant filter tabs: `All`, `Upcoming`, `Today`, `Past`, and `Cancelled` with live count badges.
  - Interactive calendar date picker to filter bookings by specific match dates with one-click quick clear.
  - Digital **Booking Pass** modal featuring venue coordinates, slot details, and payment breakdown.
  - **Self-Service Cancellation** with automated Stripe refund and instant slot inventory release.
- **Saved Favourites**: Instant bookmarking of preferred sports turfs persisted in the customer's MongoDB profile.
- **Account Management**: Update customer profile, phone number, and change password with instant bcrypt verification.

---

### 🛡️ Admin Control & Operations Console

- **Executive KPI Dashboard**: Live tracking of today's collected revenue (excluding unpaid bookings), active reservations, registered customer accounts, and real-time available slot tallies.
- **Interactive Onboarding Tour**: Step-by-step guided feature walkthrough (via Driver.js) introducing new facility operators to the platform.
- **Turf Arenas Management (Full CRUD)**: Create, edit, toggle active status, and delete turf facilities with specs: surface type, dimensions, operating hours, amenities, and photos.
- **Slot Rate Customization Engine**: Define custom base rates, peak-hour rates with custom windows (e.g., 18:00–23:00), and weekend multipliers per turf.
- **Slot Blocker (Maintenance & Tournaments)**: Lock out specific date and time slots across any arena with custom reasons (Groundskeeping, Private Tournament, Weather); updates customer calendars instantly via WebSockets.
- **Sports Catalog Management**: Add and configure supported sports, rules, icons, and descriptions with referential integrity checks blocking deletion if assigned to active turfs.
- **Equipment Add-ons Catalog**: Configure rental gear items and per-booking pricing with safety checks preventing deletion if present in upcoming bookings.
- **Promotional Banner Controller**: Upload and order marketing banners directly from the admin console with dual image support (Base64 file upload or URL) and live 16:9 preview.
- **Discount Coupon Management**: Issue percentage or flat-discount coupons with minimum spend thresholds, maximum caps, expiry dates, and usage limits.
- **Bookings & Reservations Central**: Inspect full booking logs, filter by status or date, record on-desk venue payments, manually cancel bookings, and retry failed Stripe refunds.
- **Business Profile, Tax & Policy Settings**: Zero-code configuration of business name, contact information, cancellation cut-off window (in hours), and GST percentage consumed authoritatively across the entire system.

---

## 💻 Tech Stack & Engineering Standards

| Layer / Domain | Technology | Version | Purpose & Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^19.1.0` | Modern modular component architecture with fast concurrent rendering |
| **Build Tool & Bundler** | Vite | `^7.0.0` | Sub-second Hot Module Replacement (HMR) and optimized tree-shaken builds |
| **Styling & Icons** | Tailwind CSS + Lucide Icons | `^4.1.0` / `^1.16.0` | Utility-first responsive design, theme palettes, and crisp SVG icons |
| **Onboarding & Tour** | Driver.js | `^1.10.2` | Interactive, accessible guided product tour for administrative users |
| **Celebrations** | Canvas Confetti | `^1.9.4` | Delighter confetti animation on successful slot booking completion |
| **Backend Runtime** | Node.js (ES Modules) | `v20.x` / `v22.x` | High-performance asynchronous non-blocking event-driven runtime |
| **Web Application Framework**| Express.js | `^4.21.2` | Scalable REST API with modular controllers, middlewares, and routers |
| **Database & ODM** | MongoDB + Mongoose | `^8.12.0` | Flexible NoSQL document database with strict schema validation and compound indexing |
| **Real-Time WebSockets** | Socket.IO (Server & Client) | `^4.8.4` | Bi-directional event communication for instant slot updates across browser clients |
| **Payment Processing** | Stripe API SDK | `^23.0.1` | PCI-compliant card payments, checkout sessions, webhooks, and refund management |
| **Authentication & Tokens**| JWT + Bcryptjs + Cookies | `^9.0.3` / `^3.0.2` | Stateless authentication with signed HTTP-only cookies and bcrypt password hashing |
| **Input Validation** | express-validator | `^7.3.2` | Robust request body, query parameter, and path parameter sanitization |
| **Logging & Security** | Pino + Helmet + CORS | `^9.6.0` / `^8.0.0` | Structured JSON request logging, security headers, and domain whitelisting |
| **Testing Framework** | Vitest + Testing Library | `^3.1.0` / `^16.2.0` | Fast unit, integration, and component testing across client and server |

---

## 📁 Project Directory Structure

```
Turf-Booking-/
├── docs/                                    # Architectural specifications & documentation
│   ├── PROJECT_REPORT.md                    # Technical report & system design
│   ├── SETUP.md                             # Step-by-step local setup guide
│   └── SECURITY.md                          # Security & authorization mechanisms
├── screenshots/                             # Live application UI showcase screenshots
│   ├── 01_landing_page.png
│   ├── 02_customer_registration.png
│   ├── 03_turf_discovery.png
│   ├── 04_slot_booking_pricing.png
│   ├── 05_admin_onboarding_tour.png
│   ├── 06_admin_dashboard.png
│   ├── 07_admin_turf_management.png
│   ├── 08_admin_bookings_calendar.png
│   ├── 09_admin_blocked_slots.png
│   └── 10_admin_settings.png
│
├── turf-booking-platform/
│   ├── client/                              # Frontend Application (React 19 + Vite 7)
│   │   ├── src/
│   │   │   ├── assets/                      # Static assets & brand media
│   │   │   ├── components/
│   │   │   │   ├── admin/                   # Admin UI (StatsCard, TurfModal, SlotBlocker, etc.)
│   │   │   │   ├── customer/                # Customer UI (SlotGrid, AvailabilityCalendar, Filters, etc.)
│   │   │   │   └── common/                  # Reusable primitives (Modal, Button, Badge, Skeleton)
│   │   │   ├── context/                     # AuthContext, NotificationContext
│   │   │   ├── features/                    # Domain logic & admin tour configuration
│   │   │   ├── layouts/                     # CustomerLayout, AdminLayout, AuthLayout
│   │   │   ├── lib/                         # Date and currency utilities
│   │   │   ├── pages/
│   │   │   │   ├── admin/                   # DashboardOverview, TurfsPage, BookingsPage, SettingsPage...
│   │   │   │   ├── customer/                # HomePage, TurfListingPage, TurfDetailPage, MyBookingsPage...
│   │   │   │   └── auth/                    # LoginPage, RegisterPage, ChangePasswordPage
│   │   │   ├── services/                    # Axios API client modules
│   │   │   └── utils/                       # Timezone helpers & text formatters
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   └── server/                              # Backend API & WebSocket Server (Node.js + Express)
│       ├── src/
│       │   ├── config/                      # MongoDB connection, env validation, pino logger
│       │   ├── controllers/                 # Route controllers (admin & customer)
│       │   ├── middleware/                  # Auth guard, requireAdmin, rate limiting, error handlers
│       │   ├── models/                      # Mongoose models (User, Turf, Booking, HeldSlot, Sport...)
│       │   ├── routes/                      # Express route endpoints (/api/v1/...)
│       │   ├── scripts/                     # Seeding scripts (seedInitialData.js, seedAdmin.js)
│       │   ├── services/                    # Authoritative pricing, booking lifecycle, stripe, availability
│       │   ├── utils/                       # Timezone (`Asia/Kolkata`) date manipulation utilities
│       │   ├── validators/                  # express-validator request schemas
│       │   ├── app.js                       # Express app configuration & middleware pipeline
│       │   ├── server.js                    # Server bootstrap, background schedulers & graceful shutdown
│       │   └── socket.js                    # Socket.IO room manager & availability broadcaster
│       ├── tests/                           # Vitest automated test suites (157 server tests)
│       ├── .env.example                     # Environment template
│       └── package.json
├── .gitignore
├── LICENSE                                  # MIT License
├── prd.txt                                  # Competition PRD & specification requirements
├── PRODUCTION_AUDIT_REPORT.md               # Complete multi-perspective production readiness review
└── README.md                                # Platform documentation (this file)
```

---

## ⚙️ Prerequisites

Before launching the project locally, verify that your environment satisfies the following requirements:

| Tool | Recommended Version | Minimum Version | Installation Link |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` | `v18.18.0` | [nodejs.org](https://nodejs.org/) |
| **npm** | `v10.x` or higher | `v9.x` | Bundled with Node.js |
| **MongoDB** | `v6.0+` or MongoDB Atlas | `v5.0` | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Git** | Latest | Latest | [git-scm.com](https://git-scm.com/) |

Check tool versions in PowerShell or bash:
```bash
node -v   # Should output v20.x.x or v22.x.x
npm -v    # Should output 10.x.x or higher
git --version
```

---

## 🔧 Environment Configuration

### 1. Server Environment (`server/.env`)

Navigate to `turf-booking-platform/server/` and copy the example file:
```bash
cd turf-booking-platform/server
cp .env.example .env
```

Configure the environment variables in `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB Connection String (Local or Atlas Replica Set)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/turf_booking?retryWrites=true&w=majority

# JWT Authentication Secrets (Use 32+ character random strings)
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars_random
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars_random
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=your_cookie_signing_secret_random

# Administrator Provisioning (Used by `npm run seed:admin`)
ADMIN_NAME=Platform Administrator
ADMIN_EMAIL=admin@turfbooking.com
ADMIN_PASSWORD=Admin@2026

# Stripe Payment Gateway (Optional / Test Mode)
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CURRENCY=inr
STRIPE_PAYMENT_ENABLED=false
```

### 2. Client Environment (`client/.env`)

Navigate to `turf-booking-platform/client/` and create or verify `.env`:
```bash
cd ../client
```

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 📦 Installation & Quickstart Guide

### Step 1: Install Dependencies

Open two separate terminal windows for the server and client:

**Terminal 1 — Backend:**
```bash
cd turf-booking-platform/server
npm install
```

**Terminal 2 — Frontend:**
```bash
cd turf-booking-platform/client
npm install
```

---

### Step 2: Seed the Database

Populate MongoDB with default sports, arenas, equipment add-ons, promotional banners, coupons, business settings, and demo customer/admin accounts:

In `turf-booking-platform/server/`:
```bash
# 1. Seed Sports, Turfs, Add-Ons, Coupons, Banners, Business Settings & Demo Customer
npm run seed:initial

# 2. Seed Administrator Account (using ADMIN_EMAIL and ADMIN_PASSWORD from .env)
npm run seed:admin
```

---

### Step 3: Run the Application

**Start Backend API Server:**
```bash
cd turf-booking-platform/server
npm run dev
```
> The API server and Socket.IO engine will start at: **`http://localhost:5000`**  
> Verify health check: `http://localhost:5000/api/v1/health`

**Start Frontend Client:**
```bash
cd turf-booking-platform/client
npm run dev
```
> The customer web portal will start at: **`http://localhost:5173`**

---

## 🔐 Database Seeding & Test Credentials

After running the seed scripts, the following verified demo accounts and initial business assets are ready to use:

### 🔑 Test Accounts
| Role | Email | Password | Access Area & Privileges |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@turfbooking.com` | `Admin@2026` | `/admin` (Full Operations, Pricing, Turfs, Settings) |
| **Customer** | `customer@turfbooking.com` | `Customer@123` | `/` (Booking, Discovery, Favourites, My Bookings) |

### 🏟️ Pre-Seeded Venues & Sports
- **Sports Catalog**: Box Cricket, Football, Pickleball, Badminton
- **Turfs & Arenas**:
  - *Aplha Box Cricket* (Ahmedabad, Gujarat) — All-weather floodlit box cricket arena
  - *Champions Turf Ground* (Malad West, Mumbai) — FIFA-standard multi-sport arena
  - *Smash Point Sports Hub* (Powai, Mumbai) — High-grade acrylic cushion courts for Pickleball & Badminton
- **Promotional Coupons**:
  - `SUPER3000`: 20% OFF on bookings above ₹3,000 (Max ₹1,000 off)
  - `MATCHDAY15`: 15% OFF on bookings above ₹1,500 (Max ₹500 off)
  - `FLAT100`: Flat ₹100 OFF on bookings above ₹800
  - `WEEKEND500`: Flat ₹500 OFF on group bookings above ₹4,000

---

## 💳 Stripe Online Payments & Webhook Setup

Online card payments can be enabled in test mode without altering code:

### 1. Default Safe Mode
- By default, `STRIPE_PAYMENT_ENABLED=false`.
- The platform functions out-of-the-box using the **Pay at Venue** option.
- If a customer chooses Stripe while disabled, the UI alerts the user to select Pay at Venue.

### 2. Enabling Stripe Card Checkout
1. Retrieve API test keys from your [Stripe Dashboard](https://dashboard.stripe.com/).
2. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `server/.env`.
3. Set `STRIPE_PAYMENT_ENABLED=true`.

### 3. Local Webhook Forwarding with Stripe CLI
To test automated payment and refund lifecycle events locally:
```bash
# 1. Authenticate Stripe CLI
stripe login

# 2. Forward webhook events to local backend
stripe listen --forward-to localhost:5000/api/v1/payments/stripe/webhook

# 3. Copy the printed webhook secret into server/.env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 4. Trigger test checkout session event
stripe trigger checkout.session.completed
```

---

## 📡 REST API Endpoints Reference

### 1. Authentication & User Profile (`/api/v1/auth/*`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/auth/register` | Public | Register customer account with validation |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & issue signed JWT cookies |
| `POST` | `/api/v1/auth/refresh` | Public | Rotate expired access token using refresh cookie |
| `POST` | `/api/v1/auth/logout` | Public | Invalidate cookies & terminate session |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve profile details of authenticated user |
| `PUT` | `/api/v1/auth/profile` | Authenticated | Update user name and contact number |
| `PUT` | `/api/v1/auth/password` | Authenticated | Change account password with bcrypt validation |
| `GET` | `/api/v1/auth/favorites` | Authenticated | Retrieve customer's saved turf IDs |
| `POST` | `/api/v1/auth/favorites/toggle/:turfId` | Authenticated | Toggle bookmark status for a turf |

### 2. Public & Customer Inventory (`/api/v1/*`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/sports` | Public | List all active sports from MongoDB |
| `GET` | `/api/v1/turfs` | Public | Search, multi-filter, and paginate turfs |
| `GET` | `/api/v1/turfs/:slug` | Public | Fetch comprehensive turf details & pricing rules |
| `GET` | `/api/v1/addons` | Public | List active equipment rental catalog |
| `GET` | `/api/v1/banners` | Public | Retrieve active marketing carousel banners |
| `GET` | `/api/v1/settings` | Public | Retrieve business name, contact, GST %, and policy |

### 3. Real-Time Availability & Dynamic Pricing
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/availability/:turfId` | Public | Query hourly slot availability for a specified date |
| `GET` | `/api/v1/bookings/slots` | Public | Real-time slot status query with dynamic rates |
| `POST` | `/api/v1/bookings/quote` | Public | Generate authoritative itemized dynamic price quote |
| `POST` | `/api/v1/pricing/calculate` | Public | Calculate pricing with peak/weekend/add-ons/GST |
| `POST` | `/api/v1/coupons/validate` | Authenticated | Validate coupon code and compute discount deduction |

### 4. Temporary Slot Holds & Reservations (`/api/v1/reservations/*`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/reservations/hold` | Customer | Atomically lock slot(s) for 10 minutes |
| `GET` | `/api/v1/reservations/current` | Customer | Fetch active reservation hold & remaining time |
| `POST` | `/api/v1/reservations/release` | Customer | Manually release an active slot hold |
| `POST` | `/api/v1/reservations/renew` | Customer | Extend active reservation countdown |

### 5. Customer Bookings & Self-Service Cancellation (`/api/v1/bookings/*`)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/bookings` | Customer | Create booking (Stripe or Pay at Venue) |
| `GET` | `/api/v1/bookings/my` | Customer | Retrieve booking history with smart filter counts |
| `GET` | `/api/v1/bookings/:id` | Customer | Get full booking details & digital match pass |
| `GET` | `/api/v1/bookings/:id/cancellation-preview`| Customer | Preview refund amount & cutoff eligibility |
| `POST` | `/api/v1/bookings/:id/cancel` | Customer | Self-service cancellation & Stripe refund |

### 6. Admin Control Suite (`/api/v1/admin/*` — Requires Admin Role)
| Method | Endpoint | Access | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/admin/dashboard` | Admin | Executive KPIs (Revenue, Bookings, Slots, Users) |
| `GET / POST` | `/api/v1/admin/turfs` | Admin | List all turfs / Create new arena |
| `PUT / DELETE`| `/api/v1/admin/turfs/:id` | Admin | Update arena details / Safe delete arena |
| `GET / POST` | `/api/v1/admin/sports` | Admin | List / Create sports (with file upload & preview) |
| `PUT / DELETE`| `/api/v1/admin/sports/:id` | Admin | Edit sport / Safe delete sport |
| `GET / POST` | `/api/v1/admin/addons` | Admin | Manage equipment rental items and inventory |
| `GET / POST` | `/api/v1/admin/banners` | Admin | Manage promo banners (with Base64 FileReader upload) |
| `GET / POST` | `/api/v1/admin/coupons` | Admin | Manage discount codes, caps, and validity |
| `GET` | `/api/v1/admin/bookings` | Admin | Full booking ledger with filters & pagination |
| `PATCH` | `/api/v1/admin/bookings/:id/status`| Admin | Update booking status (`Confirmed`, `Completed`, etc.) |
| `POST` | `/api/v1/admin/bookings/:id/payment`| Admin | Reconcile desk payment for Pay at Venue |
| `POST` | `/api/v1/admin/bookings/:id/cancel` | Admin | Administrative cancellation override |
| `POST` | `/api/v1/admin/bookings/:id/refund/retry` | Admin | Retry failed Stripe refund transaction |
| `GET / POST` | `/api/v1/admin/blocked-slots` | Admin | Lock arena slots for maintenance/tournaments |
| `DELETE` | `/api/v1/admin/blocked-slots/:id` | Admin | Remove slot block & release to public calendar |
| `GET` | `/api/v1/admin/calendar` | Admin | Visual calendar matrix view across all arenas |
| `GET` | `/api/v1/admin/customers` | Admin | Customer directory with booking statistics |
| `GET / PUT` | `/api/v1/admin/settings` | Admin | View / Update business info, GST %, cutoff window |

---

## 📡 Socket.IO Real-Time Event Architecture

The platform uses WebSockets to synchronize availability changes across connected clients in real time:

### Client-Side Rooms
Clients subscribe to arena-and-date rooms on the slot booking screen:
- **`join_turf_date`**: `{ turfId: "<id>", date: "YYYY-MM-DD" }`
- **`leave_turf_date`**: `{ turfId: "<id>", date: "YYYY-MM-DD" }`

### Server Broadcasts
When a slot state changes, the server emits an event to the specific room:
- **`availability_update`**:
  ```json
  {
    "turfId": "653b...",
    "date": "2026-11-05",
    "reason": "hold_created | hold_released | booking_confirmed | booking_cancelled | slot_blocked | slot_unblocked",
    "timestamp": 1730335000000
  }
  ```
All connected customer browsers immediately re-fetch the latest slot states with zero user reload required.

---

## 🧪 Testing & Quality Assurance

The codebase includes comprehensive automated test suites covering backend services, concurrency locks, cancellation refund mathematics, RBAC policies, and frontend components:

### 1. Backend Automated Test Suite (157 Tests)
Run backend tests with Vitest:
```bash
cd turf-booking-platform/server
npm test
```

Key verified test suites:
- `bookingLifecycleUnit.test.js` (**7 tests**): Smart filtering (`all`, `upcoming`, `today`, `past`, `cancelled`), automatic completion, customer isolation.
- `dateUtils.test.js` (**6 tests**): Venue timezone (`Asia/Kolkata`) epoch timestamp conversion and midnight-crossing matches (`23:00`–`01:00`).
- `cancellationRefund.test.js` (**17 tests**): Customer cancellation permissions, cutoff deadline enforcement, 100% refund calculations, Pay at Venue safety, Stripe refund retries.
- `phase3Reliability.test.js` (**26 tests**): Authoritative dynamic pricing math, duplicate-key race condition handling, 10-minute hold rollbacks, and Socket.IO broadcasts.
- `pricing.test.js` (**12 tests**): Base rates, weekday peak, weekend surge, add-ons, coupons, and GST rounding.
- `realtimeSlotReservation.test.js` (**18 tests**): Slot hold concurrency, atomic multi-slot reservations, expired hold sweeps.
- `customerBooking.test.js` (**19 tests**): Customer checkout flow, booking pass, status transitions.
- `adminBooking.test.js` (**15 tests**): Admin dashboard metrics, status updates, desk payment reconciliation.
- `stripe.test.js` (**16 tests**): Webhook signature verification, checkout completion, refund webhooks.
- `availability.test.js` (**12 tests**): Slot matrix calculation and maintenance block exclusion.

### 2. Frontend Automated Test Suite (86 Tests)
Run frontend component tests with Vitest:
```bash
cd turf-booking-platform/client
npm test
```

Key verified test modules:
- `MyBookingsPage.test.jsx` (**7 tests**): Filter tab switching, live count pills, calendar date picker, Booking Pass modal, cancellation button rules.
- `Part10BookingFlow.test.jsx` (**5 tests**): End-to-end checkout flow and pricing summary synchronization.
- `CancellationRefund.test.jsx` (**6 tests**): Refund preview calculations, modal interactions, cancellation error handling.
- `SlotGrid.test.jsx` (**7 tests**): Real-time visual states (Available, Selected, Held, Booked, Blocked).
- `CheckoutPage.test.jsx` (**10 tests**): Form validation, hold countdown timer, payment method switching.
- `TurfDetailPage.test.jsx` (**8 tests**): Date selection, add-on counter, transparent price breakdown.
- `TurfListingPage.test.jsx` (**7 tests**): Multi-sport filtering, amenity filters, search debouncing.

### 3. Frontend Production Build Verification
Verify the production build using Vite 7:
```bash
cd turf-booking-platform/client
npm run build
```
> Produces an optimized, tree-shaken production bundle in `client/dist/` with zero build warnings.

---

## 🏆 Production Readiness Audit Summary

A rigorous multi-perspective audit was conducted across the commercial, customer, and architectural layers of TurfSpot. For full details, see the **[Production Audit Report](PRODUCTION_AUDIT_REPORT.md)**.

### Production Readiness Scorecard

| Evaluation Dimension | Readiness Score | Key Architectural Achievement |
| :--- | :---: | :--- |
| **Admin Control & Authority** | **`10.0 / 10`** | Unified database, zero hardcoded content, instant block/unblock, dynamic GST & cancellation cutoff controls. |
| **Public Access & Discovery** | **`10.0 / 10`** | 100% public discovery on `/`, `/turfs`, `/turfs/:slug` without registration wall; debounced search and dynamic sport pills. |
| **Booking Journey & UX** | **`10.0 / 10`** | Real-time SlotGrid (5 visual states), dynamic price quotes in paise, equipment add-ons, 10-min temporary hold with countdown. |
| **Customer Match Hub** | **`10.0 / 10`** | My Bookings match hub with 5 smart filters, calendar date picker, digital Booking Pass, self-service cancellations & Stripe refunds. |
| **Data & Referential Integrity** | **`10.0 / 10`** | Partial unique indexes, safe deletion checks preventing orphan sports/turfs, atomic multi-slot hold rollback. |
| **UI & Customer Ergonomics** | **`10.0 / 10`** | Modern Tailwind CSS v4 design, responsive mobile navigation, status badges, and accessible modal flows. |
| **Scalability & Performance** | **`10.0 / 10`** | Room-based Socket.IO broadcasts, 60s background reconciler, zero client polling load. |
| **Security & Compliance** | **`10.0 / 10`** | JWT token rotation, bcrypt, signed HTTP-only cookies, express-validator schemas, Helmet headers, CORS policies. |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
