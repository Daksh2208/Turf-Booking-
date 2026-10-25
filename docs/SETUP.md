# 🛠️ TurfSpot — Local Setup & Installation Guide

This guide walks you step-by-step through setting up, configuring, seeding, running, and troubleshooting the **TurfSpot** sports facility booking platform on your local machine.

---

## 📑 Table of Contents

- [1. Prerequisites](#1-prerequisites)
- [2. Clone & Folder Organization](#2-clone--folder-organization)
- [3. Dependency Installation](#3-dependency-installation)
- [4. Environment Configuration](#4-environment-configuration)
  - [4.1 Backend Environment Setup](#41-backend-environment-setup)
  - [4.2 Frontend Environment Setup](#42-frontend-environment-setup)
- [5. Database Initialization & Seeding](#5-database-initialization--seeding)
- [6. Running the Application](#6-running-the-application)
- [7. Verified Test Logins](#7-verified-test-logins)
- [8. Optional: Stripe Online Payments Setup](#8-optional-stripe-online-payments-setup)
- [9. Automated Health & Test Verification](#9-automated-health--test-verification)
- [10. Common Troubleshooting & FAQs](#10-common-troubleshooting--faqs)

---

## 1. Prerequisites

Before installing the application, ensure the following software is installed on your system:

| Tool | Recommended Version | Minimum Version | Installation Link |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v22.x` | `v18.18.0` | [nodejs.org](https://nodejs.org/) |
| **npm** | `v10.x` or higher | `v9.x` | Bundled with Node.js |
| **MongoDB** | `v6.0+` or MongoDB Atlas | `v5.0` | [mongodb.com](https://www.mongodb.com/try/download/community) |
| **Git** | Latest | Latest | [git-scm.com](https://git-scm.com/) |

To verify your installations in terminal/PowerShell:
```bash
node -v   # Should output v20.x.x or v22.x.x
npm -v    # Should output 10.x.x or higher
git --version
```

---

## 2. Clone & Folder Organization

Clone the repository to your local directory:
```bash
git clone https://github.com/Daksh2208/Turf-Booking-.git
cd Turf-Booking-
```

The repository structure contains the full-stack MERN codebase under `turf-booking-platform/`:
```
Turf-Booking-/
├── docs/                                # Technical reports, setup & security guides
│   ├── PROJECT_REPORT.md
│   ├── SETUP.md
│   └── SECURITY.md
├── screenshots/                         # Live application showcase screenshots
├── turf-booking-platform/
│   ├── client/                          # React + Vite frontend application
│   └── server/                          # Express.js + MongoDB backend API
├── .gitignore
├── LICENSE
├── prd.txt                              # Practical Round PRD & project requirements
└── README.md
```

---

## 3. Dependency Installation

The frontend and backend maintain separate dependency trees for role isolation and clean modularization.

### Step 3.1: Install Backend Dependencies
In your root terminal:
```bash
cd turf-booking-platform/server
npm install
```

### Step 3.2: Install Frontend Dependencies
In another terminal (or navigate to client):
```bash
cd ../client
npm install
```

---

## 4. Environment Configuration

### 4.1 Backend Environment Setup
Navigate to `turf-booking-platform/server/` and create your `.env` file by copying the provided example:
```bash
cd turf-booking-platform/server
cp .env.example .env
```
*(On Windows PowerShell, use `Copy-Item .env.example .env`)*

Open `server/.env` and configure the following variables:

```env
# Application Server Port & Environment
PORT=5000
NODE_ENV=development

# Allowed Client Origin (CORS)
CLIENT_URL=http://localhost:5173

# MongoDB Connection String (Local MongoDB or MongoDB Atlas)
# Example Local: mongodb://127.0.0.1:27017/turf_booking
# Example Atlas: mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/turf_booking?retryWrites=true&w=majority
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/turf_booking?retryWrites=true&w=majority

# JWT Authentication Secrets (Must be random strings, min 32 characters)
JWT_ACCESS_SECRET=your_super_secret_jwt_access_token_min_32_characters_long
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_token_min_32_characters_long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_SECRET=your_cookie_signing_secret_random_string_here

# Initial Admin Account Provisioning (Used by seed:admin)
ADMIN_NAME=Daksh Admin
ADMIN_EMAIL=admin@turfbooking.com
ADMIN_PASSWORD=Admin@2026

# Stripe Online Payment Gateway (Disabled by default; Pay at Venue works out of the box)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CURRENCY=inr
STRIPE_PAYMENT_ENABLED=false
```

### 4.2 Frontend Environment Setup
Navigate to `turf-booking-platform/client/` and create or verify `.env`:
```bash
cd ../client
```

Create `.env` with:
```env
# URL pointing to the Express REST API
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 5. Database Initialization & Seeding

TurfSpot includes automated database seeding scripts to instantly populate your MongoDB database with sports, arenas, equipment, promotional coupons, business tax settings, and accounts.

Open your terminal in `turf-booking-platform/server/`:

### Step 5.1: Seed Sports, Venues, Add-Ons & Coupons
```bash
npm run seed:initial
```
**Output should indicate:**
- Created 4 Sports: Box Cricket, Football, Pickleball, Badminton
- Created 3 Turfs: Aplha Box Cricket, Champions Turf Ground, Smash Point Sports Hub
- Created 5 Equipment Add-Ons (Cricket kit, FIFA footballs, Rackets, Paddles, Team bibs)
- Created 4 Promotional Coupons (`SUPER3000`, `MATCHDAY15`, `FLAT100`, `WEEKEND500`)
- Provisioned Singleton Business Settings (18% GST, 6h cancellation cutoff)
- Created Verified Demo Customer: `customer@turfbooking.com`

### Step 5.2: Seed Administrator Account
```bash
npm run seed:admin
```
**Output should indicate:**
- Provisions the administrator defined by `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`.

---

## 6. Running the Application

Open two separate terminal windows for parallel execution:

### Terminal 1: Start Backend API Server
```bash
cd turf-booking-platform/server
npm run dev
```
> Server runs at: **`http://localhost:5000`**  
> REST API health check at: **`http://localhost:5000/api/v1/health`**

### Terminal 2: Start Frontend Client
```bash
cd turf-booking-platform/client
npm run dev
```
> Client launches at: **`http://localhost:5173`**

Open `http://localhost:5173` in your browser.

---

## 7. Verified Test Logins

The database seed scripts create pre-verified accounts for immediate evaluation:

| Role | Email Address | Password | Permissions & URL |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@turfbooking.com` | `Admin@2026` | Complete Admin Panel access at `/admin` |
| **Customer** | `customer@turfbooking.com` | `Customer@123` | Customer discovery & bookings at `/turfs` |

> [!TIP]
> You can also register any new customer account directly on `/register`. Password must be at least 8 characters with at least 1 letter and 1 number.

---

## 8. Optional: Stripe Online Payments Setup

Online payments via Stripe are completely optional. By default, **Pay at Venue** is active and fully functional.

If you wish to test real card transactions in Stripe Test Mode:

1. Obtain test API keys from [Stripe Dashboard](https://dashboard.stripe.com/) (`sk_test_...` and `pk_test_...`).
2. Add keys to `turf-booking-platform/server/.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_PAYMENT_ENABLED=true
   ```
3. Forward webhooks using the [Stripe CLI](https://stripe.com/docs/stripe-cli):
   ```bash
   stripe login
   stripe listen --forward-to localhost:5000/api/v1/payments/stripe/webhook
   ```
4. Copy the printed webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in `server/.env`.
5. Restart your backend server (`npm run dev`).

---

## 9. Automated Health & Test Verification

### Verify Backend Health Endpoint:
```bash
curl http://localhost:5000/api/v1/health
```
Expected JSON Response:
```json
{
  "success": true,
  "message": "Turf Booking Platform API is operational",
  "data": {
    "status": "healthy",
    "uptime": 14.5,
    "version": "1.0.0"
  }
}
```

### Run Backend Unit & Integration Tests:
In `turf-booking-platform/server/`:
```bash
npm test
```

### Validate Frontend Production Build:
In `turf-booking-platform/client/`:
```bash
npm run build
```

---

## 10. Common Troubleshooting & FAQs

### Issue 1: `MongooseServerSelectionError: connect ECONNREFUSED`
- **Cause**: MongoDB is not running or the connection string in `server/.env` is incorrect.
- **Solution**:
  - If using local MongoDB: Ensure MongoDB service is started (`net start MongoDB` on Windows, or `brew services start mongodb-community` on macOS).
  - If using MongoDB Atlas: Verify your IP address is whitelisted under **Network Access** in the MongoDB Atlas dashboard, and that the database user credentials in `MONGODB_URI` are correct.

### Issue 2: `CORS Error: Access to XMLHttpRequest has been blocked by CORS policy`
- **Cause**: The frontend client port does not match `CLIENT_URL` in `server/.env`.
- **Solution**: Check the URL where Vite started (usually `http://localhost:5173`). Ensure `CLIENT_URL=http://localhost:5173` in `server/.env` without trailing slashes.

### Issue 3: `EADDRINUSE: address already in use :::5000`
- **Cause**: Another process is occupying port 5000.
- **Solution**:
  - Windows: Run `netstat -ano | findstr :5000` and kill the PID with `taskkill /PID <PID> /F`.
  - Alternatively, change `PORT=5001` in `server/.env` and update `VITE_API_BASE_URL=http://localhost:5001/api/v1` in `client/.env`.

### Issue 4: `401 Unauthorized` or Token Expired
- **Cause**: Access token expired after 15 minutes.
- **Solution**: The frontend automatically calls the refresh token endpoint. If logged out, simply log back in via `/login`.
