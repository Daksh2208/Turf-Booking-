# 🏟️ TurfSpot — Sports Turf Booking & Facility Management Platform

A production-grade, full-stack **MERN** (MongoDB, Express.js, React, Node.js) web application designed for sports turf discovery, real-time slot scheduling, dynamic pricing, and comprehensive facility administration.

Built for multi-sport arenas catering to **Box Cricket**, **Football**, **Pickleball**, and **Badminton**, TurfSpot eliminates all hard-coded business logic by synchronizing every price, slot rule, banner, amenity, and reservation through a centralized MongoDB engine.

---

## 📑 Table of Contents

- [Key Highlights](#-key-highlights)
- [System Architecture](#-system-architecture)
- [Core Features](#-core-features)
  - [Customer Portal](#-customer-portal)
  - [Admin Management Panel](#-admin-management-panel)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Environment Configuration](#-environment-configuration)
- [Installation & Quickstart](#-installation--quickstart)
- [Database Seeding & Test Credentials](#-database-seeding--test-credentials)
- [Stripe Payment Integration Guide](#-stripe-payment-integration-guide)
- [API Endpoints Overview](#-api-endpoints-overview)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [License](#-license)

---

## 🌟 Key Highlights

- **Zero Hard-Coding Architecture**: Turfs, slot rates, peak hours, weekend multipliers, promotional banners, equipment add-ons, and tax percentages are managed dynamically from the Admin Panel in real time.
- **Dynamic Pricing Engine**: Formula: `Total = (Slot Base/Peak/Weekend Rate × Hours) + Equipment Add-Ons - Coupon Discount + GST`.
- **Atomic Slot Reservation System**: Real-time slot locking with a 15-minute expiration window during checkout to prevent double-booking. Slots are automatically released upon cancellation, expiration, or checkout abandonment.
- **Dual Payment Options**: Supports instant online checkout via **Stripe** (with automated webhook processing) and offline **Pay at Venue**.
- **Interactive Admin Onboarding Tour**: Built-in step-by-step guided walkthrough to onboard new turf managers across the dashboard, calendar, pricing, and bookings.
- **Strict Role-Based Access Control (RBAC)**: Secure separation between customer endpoints and administrative routes with JWT access/refresh tokens and signed cookies.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client (React + Vite)                 │
│   ┌──────────────────────────────┬──────────────────────┐   │
│   │   Customer Facing Portal     │ Admin Control Panel  │   │
│   │   (Discovery, Booking, Pay)  │ (Dashboard, Rates)   │   │
│   └──────────────┬───────────────┴──────────┬───────────┘   │
└──────────────────┼──────────────────────────┼───────────────┘
                   │ HTTP / REST              │ HTTP / REST
                   ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express.js RESTful API Server               │
│   ├── Auth Guard & RBAC Middleware (JWT / Signed Cookies)   │
│   ├── Dynamic Pricing & Slot Availability Engine            │
│   ├── Stripe Webhook Processor & Checkout Service           │
│   └── Zod Input Validation & Error Handling Layer           │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Database                       │
│   ├── Users (Customers & Admins)    ├── Sports & Turfs      │
│   ├── Slot Rates & Blocked Slots    ├── Add-Ons & Coupons   │
│   ├── Bookings & Reservations       └── Business Settings   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Core Features

### 👤 Customer Portal
- **Hero & Promotional Banners**: Dynamic carousel featuring real-time announcements and tournaments configured by admins.
- **Sports Categorization**: Direct filters for Box Cricket, Football, Pickleball, and Badminton with min/max player recommendations.
- **Advanced Turf Discovery**: Search by name or area, filter by sport, facilities (floodlights, parking, locker rooms), and sort by price or rating with pagination.
- **Interactive Slot Calendar**: Visual date-picker showing hourly slots categorized in real time as **Available**, **Booked**, or **Blocked**.
- **Live Transparent Price Calculator**: Instant breakdown showing base rates, peak hour adjustments, weekend surges, equipment rentals, coupon savings, and 18% GST.
- **Equipment Add-Ons**: Rental equipment selection (Cricket bats/balls, FIFA footballs, badminton rackets, pickleball paddles, team bibs).
- **Promotional Coupon System**: Apply coupon codes (e.g., `SUPER3000`, `MATCHDAY15`, `FLAT100`, `WEEKEND500`) with minimum spend and maximum discount constraints.
- **Checkout & Payment**: Dual checkout support with **Pay at Venue** or **Stripe** card payments.
- **My Bookings & History**: Review past and upcoming bookings, payment status, slot timing, and invoice breakdown.
- **Saved Favourites**: One-click bookmarking of preferred sports turfs.

### 🛡️ Admin Management Panel
- **Executive Analytics Dashboard**: Real-time metrics tracking today's total revenue, active bookings, registered customers, and free slot counts.
- **Interactive Onboarding Tour**: Guided feature walkthrough for new administrators highlighting all essential management tools.
- **Turf Management (CRUD)**: Add, edit, and delete turf facilities with specs (dimensions, surface type, opening/closing hours, amenities, and photos).
- **Slot Rate Customization**: Define custom base rates, peak-hour surcharges (with custom start/end times), and weekend pricing per turf.
- **Slot Blocker (Maintenance & Tournaments)**: Lock out specific date/time slots for grounds maintenance or external tournaments; reflects instantaneously on customer calendars.
- **Sports & Add-on Management**: Configure supported sports and rental equipment catalog with custom per-booking pricing.
- **Promotional Banner Controller**: Upload and order marketing banners and call-to-actions directly from the admin interface.
- **Coupon Code Management**: Issue percentage or flat-discount coupons with validity limits, user quotas, and expiry dates.
- **Booking Management**: Inspect complete booking logs, change order status (`Pending`, `Confirmed`, `Completed`, `Cancelled`), and view player contact details. Cancelling any booking automatically releases the reserved slot back to the public pool.
- **Business & Tax Settings**: Centralized configuration of business name, contact info, cancellation cut-off window (hours), and GST tax percentage.

---

## 💻 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Blazing fast client with modern modular component structure |
| **Styling** | Tailwind CSS v4 + Lucide Icons | Responsive UI with smooth transitions and theme palettes |
| **Backend** | Node.js + Express.js | Scalable REST API with MVC + Service layer pattern |
| **Database** | MongoDB + Mongoose ODM | Flexible document database with indexing and validation |
| **Authentication** | JWT + Bcrypt + Signed Cookies | Secure stateless authentication with refresh token rotation |
| **Validation** | Zod | Robust schema validation for runtime request payloads |
| **Payments** | Stripe API + Stripe Webhooks | Secure card payments with atomic slot expiration safety |
| **Testing** | Vitest + Supertest | Unit, integration, and endpoint health testing |

---

## 📁 Project Structure

```
Turf-Booking-/
├── turf-booking-platform/
│   ├── client/                          # Frontend Application (React + Vite)
│   │   ├── src/
│   │   │   ├── assets/                  # Static assets & brand media
│   │   │   ├── components/
│   │   │   │   ├── admin/               # Admin components (StatsCard, TurfForm, etc.)
│   │   │   │   ├── customer/            # Customer components (SlotPicker, Filters, etc.)
│   │   │   │   └── common/              # Reusable UI primitives (Modals, Badges, Buttons)
│   │   │   ├── context/                 # AuthContext, NotificationContext
│   │   │   ├── features/                # Domain logic, admin tour steps
│   │   │   ├── layouts/                 # CustomerLayout, AdminLayout, AuthLayout
│   │   │   ├── pages/                   # Application pages (Customer, Admin, Auth)
│   │   │   ├── services/                # Axios API service clients
│   │   │   └── utils/                   # Formatting, currency, and date helpers
│   │   ├── package.json
│   │   └── vite.config.js
│   │
│   ├── server/                          # Backend API Server (Node.js + Express)
│   │   ├── src/
│   │   │   ├── config/                  # DB connection, env validation, logger
│   │   │   ├── controllers/             # Customer and Admin route controllers
│   │   │   ├── middleware/              # Auth guard, RBAC, error handling, rate limiting
│   │   │   ├── models/                  # Mongoose schemas (Turf, Booking, User, Rate, etc.)
│   │   │   ├── routes/                  # API route declarations (/api/v1/...)
│   │   │   ├── scripts/                 # Seeding scripts (seedInitialData, seedAdmin)
│   │   │   ├── services/                # Pricing calculation, slot availability, Stripe
│   │   │   ├── validators/              # Zod input schemas
│   │   │   ├── app.js                   # Express application setup
│   │   │   └── server.js                # Server entry point
│   │   ├── tests/                       # Automated test suites
│   │   ├── .env.example                 # Backend environment variable template
│   │   └── package.json
│   │
│   └── docs/                            # Project specifications & PRD
│       └── PRD/
│           └── prd.txt
├── .gitignore
├── LICENSE
└── README.md                            # Comprehensive project guide (this file)
```

---

## ⚙️ Prerequisites

Make sure you have the following installed on your machine:
- **Node.js**: `v20.x` or `v22.x` (recommended)
- **npm**: `v10.x` or higher
- **MongoDB**: Local MongoDB instance (`v6.0+`) or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) connection URI
- **Git** & **GitHub Desktop** (for version control)

---

## 🔧 Environment Configuration

### 1. Server Configuration
Navigate to `turf-booking-platform/server/` and copy the example environment file:
```bash
cd turf-booking-platform/server
cp .env.example .env
```

Configure the following variables in `server/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB Connection String (Local or Atlas)
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/turf_booking?retryWrites=true&w=majority

# JWT Authentication Secrets (Use 32+ character random strings)
JWT_ACCESS_SECRET=your_jwt_access_secret_min_32_chars_random
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars_random
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=your_cookie_signing_secret_random

# Administrator Provisioning
ADMIN_NAME=Platform Administrator
ADMIN_EMAIL=admin@turfbooking.com
ADMIN_PASSWORD=AdminPassword@123

# Stripe Payment Gateway (Optional / Test Mode)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CURRENCY=inr
STRIPE_PAYMENT_ENABLED=false
```

### 2. Client Configuration
Navigate to `turf-booking-platform/client/` and create or verify `.env`:
```bash
cd ../client
```

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 📦 Installation & Quickstart

### Step 1: Install Dependencies
Open two terminal windows (or tabs):

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
Before launching the platform, populate MongoDB with initial sports, turfs, rental equipment, promotional banners, coupons, business settings, and the administrator account:

In `turf-booking-platform/server/`:
```bash
# 1. Seed Sports, Turfs, Add-Ons, Coupons, and Banners
npm run seed:initial

# 2. Seed Administrator Account (using ADMIN_EMAIL and ADMIN_PASSWORD from .env)
npm run seed:admin
```

---

### Step 3: Run the Application

**Run Server:**
```bash
cd turf-booking-platform/server
npm run dev
```
> The API server starts at: **`http://localhost:5000`**

**Run Frontend:**
```bash
cd turf-booking-platform/client
npm run dev
```
> The customer web app launches at: **`http://localhost:5173`**

---

## 🔐 Database Seeding & Test Credentials

After running the seed scripts, the following default accounts and data are available:

### 🔑 Test Accounts
| Role | Email | Password | Access Area |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@turfbooking.com` | `AdminPassword@123` | `/admin` (Full Admin Panel) |
| **Customer** | Register via `/register` or login | User-defined | `/` (Booking & Profile) |

### 🏟️ Pre-Seeded Venues & Sports
- **Sports**: Box Cricket, Football, Pickleball, Badminton
- **Turfs**:
  - *Apex Thunder Arena* (Andheri West, Mumbai) — High-density floodlit astro-turf
  - *Champions Turf Ground* (Malad West, Mumbai) — FIFA-standard multi-sport arena
  - *Smash Point Sports Hub* (Powai, Mumbai) — Acrylic cushion courts for Pickleball & Badminton
- **Promotional Coupons**:
  - `SUPER3000`: 20% OFF on bookings above ₹3,000 (Max ₹1,000 off)
  - `MATCHDAY15`: 15% OFF on bookings above ₹1,500 (Max ₹500 off)
  - `FLAT100`: Flat ₹100 OFF on bookings above ₹800
  - `WEEKEND500`: Flat ₹500 OFF on group bookings above ₹4,000

---

## 💳 Stripe Payment Integration Guide

Online payments can be activated at any time without code changes:

### 1. Default Safe Mode
- By default, `STRIPE_PAYMENT_ENABLED=false`.
- The platform functions out-of-the-box using the **Pay at Venue** method.
- Customers selecting Stripe while unconfigured receive an informative notice instructing them to choose Pay at Venue.

### 2. How to Enable Stripe
1. Obtain your API keys from the [Stripe Dashboard](https://dashboard.stripe.com/) in **Test Mode**.
2. Fill in `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `server/.env`.
3. Set `STRIPE_PAYMENT_ENABLED=true`.

### 3. Local Webhook Forwarding with Stripe CLI
To test end-to-end payment confirmations on localhost:
```bash
# 1. Login with Stripe CLI
stripe login

# 2. Forward events to local backend
stripe listen --forward-to localhost:5000/api/v1/payments/stripe/webhook

# 3. Copy the printed webhook signing secret (whsec_...) into server/.env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx

# 4. Trigger a simulated test completion
stripe trigger checkout.session.completed
```

### 4. Slot Hold & Atomic Release Protection
- **15-Minute Hold Window**: When an online booking begins, the slot is locked with a 15-minute countdown (`paymentExpiresAt`).
- **Automatic Expiration**: If the customer abandons the Stripe session or fails payment, the slot lock expires and is made immediately available for other users.
- **Double-Booking Shield**: If a delayed payment arrives after a slot has already expired and been rebooked by another customer, the booking is safely marked `cancelled` with an audit flag for an administrative refund rather than causing a double booking.

---

## 📡 API Endpoints Overview

### Public & Customer Endpoints (`/api/v1/customer/*`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Server health and uptime status |
| `POST` | `/customer/auth/register` | Customer account registration |
| `POST` | `/customer/auth/login` | Customer login (sets JWT cookies) |
| `POST` | `/customer/auth/logout` | Customer session logout |
| `GET` | `/customer/turfs` | Search and filter turfs with pagination |
| `GET` | `/customer/turfs/:slug` | Detailed turf view with amenities & images |
| `GET` | `/customer/turfs/:id/availability` | Query slot availability for a specified date |
| `POST` | `/customer/pricing/calculate` | Calculate dynamic price with peak/weekend/add-ons |
| `POST` | `/customer/coupons/validate` | Verify coupon code and compute discount |
| `POST` | `/customer/bookings` | Create new slot booking (Pay at Venue or Stripe) |
| `GET` | `/customer/bookings/my` | Retrieve booking history for authenticated user |
| `GET` | `/customer/favourites` | List user's bookmarked turfs |

### Admin Endpoints (`/api/v1/admin/*` — Requires Admin Role)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/admin/auth/login` | Administrator authentication |
| `GET` | `/admin/dashboard/stats` | Dashboard KPIs (revenue, bookings, slots) |
| `GET / POST` | `/admin/turfs` | List all turfs / Create new turf |
| `PUT / DELETE`| `/admin/turfs/:id` | Update turf details / Delete turf |
| `GET / POST` | `/admin/rates` | List / Define custom slot rates per turf |
| `GET / POST` | `/admin/blocked-slots` | Manage slot blocks (maintenance/tournaments) |
| `GET / POST` | `/admin/sports` | List and configure supported sports |
| `GET / POST` | `/admin/add-ons` | Manage equipment rental items and rates |
| `GET / POST` | `/admin/banners` | Manage promotional home page banners |
| `GET / POST` | `/admin/coupons` | Manage discount codes and limits |
| `GET` | `/admin/bookings` | View all customer bookings across all turfs |
| `PATCH` | `/admin/bookings/:id/status`| Update status (`Confirmed`, `Cancelled`, etc.) |
| `GET / PUT` | `/admin/settings` | View / Update tax rate, business details, rules |

---

## 🧪 Testing & Quality Assurance

Run backend automated test suites with Vitest:
```bash
cd turf-booking-platform/server
npm test
```

Verify backend health check endpoint:
```bash
curl http://localhost:5000/api/v1/health
```
Expected response:
```json
{
  "success": true,
  "message": "Turf Booking Platform API is operational",
  "data": {
    "status": "healthy",
    "uptime": 12.4,
    "version": "1.0.0"
  }
}
```

Verify frontend production build:
```bash
cd turf-booking-platform/client
npm run build
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).