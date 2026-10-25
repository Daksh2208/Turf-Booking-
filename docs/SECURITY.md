# 🔒 TurfSpot — Security Architecture & Hardening Document

This document outlines the security controls, authentication mechanisms, authorization boundaries, secret management protocols, input validation strategies, and payment security safeguards **actually implemented** in the TurfSpot codebase.

---

## 📑 Table of Contents

- [1. Authentication & Session Security](#1-authentication--session-security)
  - [1.1 Password Hashing & Salt Rounds](#11-password-hashing--salt-rounds)
  - [1.2 Dual-Token Architecture (JWT Access & Refresh)](#12-dual-token-architecture-jwt-access--refresh)
  - [1.3 Cookie Security & Storage](#13-cookie-security--storage)
- [2. Role-Based Access Control (RBAC) & Authorization](#2-role-based-access-control-rbac--authorization)
  - [2.1 Backend Middleware Guards](#21-backend-middleware-guards)
  - [2.2 Domain Isolation: Customer vs. Admin](#22-domain-isolation-customer-vs-admin)
  - [2.3 Client-Side Protected Routes](#23-client-side-protected-routes)
- [3. Secret & Credential Handling](#3-secret--credential-handling)
  - [3.1 Environment Separation](#31-environment-separation)
  - [3.2 Git Exclusion & Zero Hard-Coding](#32-git-exclusion--zero-hard-coding)
- [4. Input Validation & Defense-in-Depth](#4-input-validation--defense-in-depth)
  - [4.1 Zod Runtime Schema Validation](#41-zod-runtime-schema-validation)
  - [4.2 NoSQL Injection Prevention](#42-nosql-injection-prevention)
  - [4.3 HTTP Header Hardening (Helmet)](#43-http-header-hardening-helmet)
  - [4.4 Cross-Origin Resource Sharing (CORS) Policy](#44-cross-origin-resource-sharing-cors-policy)
- [5. Payment Security & Concurrency Defense](#5-payment-security--concurrency-defense)
  - [5.1 Safe Default Offline Mode](#51-safe-default-offline-mode)
  - [5.2 Stripe Webhook Cryptographic Verification](#52-stripe-webhook-cryptographic-verification)
  - [5.3 15-Minute Slot Hold & Double-Booking Protection](#53-15-minute-slot-hold--double-booking-protection)
- [6. Incident Response & Security Checklist](#6-incident-response--security-checklist)

---

## 1. Authentication & Session Security

### 1.1 Password Hashing & Salt Rounds
- **Algorithm**: `bcryptjs` salted hashing.
- **Cost Factor**: 10 salt rounds (`bcrypt.genSalt(10)`).
- **Schema Protection**: In the Mongoose `User` schema, `passwordHash` is configured with `{ select: false }`. Querying user records in controllers will **never** inadvertently leak password hashes into JSON responses unless explicitly selected with `.select('+passwordHash')` during authentication comparisons.
- **Client Validation**: Registration forms enforce a minimum of 8 characters, at least 1 letter, and at least 1 number with live reactive feedback.

### 1.2 Dual-Token Architecture (JWT Access & Refresh)
The platform implements a short-lived access token and long-lived refresh token rotation model:
- **Access Token**:
  - Expiration: **15 minutes** (`JWT_ACCESS_EXPIRES_IN=15m`).
  - Contains: `userId`, `role`, and token issue timestamp.
  - Used for authorising operational API requests.
- **Refresh Token**:
  - Expiration: **7 days** (`JWT_REFRESH_EXPIRES_IN=7d`).
  - Stored in the database and rotated upon re-issuance.
  - If a user is deactivated by an administrator (`isActive: false`), both access and refresh tokens are immediately rejected by the `requireAuth` middleware.

### 1.3 Cookie Security & Storage
Tokens are transmitted through HTTP cookies configured with the following hardening flags:
- `httpOnly: true`: Prevents client-side scripts from reading tokens via `document.cookie`, mitigating Cross-Site Scripting (XSS) token theft.
- `sameSite: 'lax'`: Provides CSRF protection while permitting top-level navigation.
- `secure: true` (in production): Transmitted exclusively over HTTPS/TLS connections.
- `signed: true`: Cookies are signed using `COOKIE_SECRET` to prevent tampering.

---

## 2. Role-Based Access Control (RBAC) & Authorization

### 2.1 Backend Middleware Guards
Route protection is enforced via composable middleware functions in `server/src/middleware/auth.middleware.js`:

```javascript
// 1. Authenticate user from cookie or Bearer header
requireAuth(req, res, next)

// 2. Restrict to specific roles
requireRole('admin')

// 3. Admin convenience guard
requireAdmin(req, res, next)

// 4. Customer-only guard (prevents admin from booking slots as customer)
requireCustomer(req, res, next)
```

### 2.2 Domain Isolation: Customer vs. Admin
- **Administrative Endpoints (`/api/v1/admin/*`)**:
  - Completely guarded by `requireAuth` followed by `requireAdmin`.
  - Any customer token attempting to call `/admin/*` endpoints receives an immediate `403 Forbidden` response (`code: 'FORBIDDEN'`).
- **Customer Endpoints (`/api/v1/customer/*`)**:
  - Customer booking creation is protected by `requireCustomer` to ensure proper player auditing and prevent administrative role confusion.

### 2.3 Client-Side Protected Routes
On the React frontend, routes are shielded using the `<ProtectedRoute>` wrapper:
- `requireAdmin={true}`: Checks `user?.role === 'admin'`. If unauthorized, redirects to `/login`.
- `requireCustomer={true}`: Checks user is logged in.
- Authenticated state is managed through React Context (`AuthContext`) and validated against the backend `/auth/me` endpoint on mount.

---

## 3. Secret & Credential Handling

### 3.1 Environment Separation
All secrets, keys, and connection strings are managed strictly through environment variables validated at startup by Zod (`server/src/config/env.js`):
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`
- `COOKIE_SECRET`
- `MONGODB_URI`
- `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`

If any required secret is missing or under the required entropy length (min 32 characters), the server process aborts with an informative error during boot.

### 3.2 Git Exclusion & Zero Hard-Coding
- `.env`, `.env.local`, and `*.env` are permanently excluded via the root `.gitignore`.
- Only `.env.example` templates containing non-sensitive placeholder schemas are tracked in version control.
- No database credentials, JWT secrets, or payment keys exist in source code.

---

## 4. Input Validation & Defense-in-Depth

### 4.1 Zod Runtime Schema Validation
Every incoming request body is strictly validated using Zod schemas (`server/src/validators/`):
- Type checking (e.g., verifying `timeSlots` are formatted strings `HH:mm`).
- Value constraints (e.g., ensuring rates are positive integers in paise).
- Unrecognized properties are stripped or rejected.

### 4.2 NoSQL Injection Prevention
- All user-supplied inputs destined for MongoDB queries are strictly cast and sanitized through Mongoose schema types (`mongoose.Schema.Types.ObjectId`, `String`, `Number`).
- Raw query objects like `req.body` are never passed directly to `find()` or `update()` methods without explicit field extraction.

### 4.3 HTTP Header Hardening (Helmet)
The Express app uses `helmet()` to enforce secure response headers:
- `Content-Security-Policy` (CSP)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN` (Clickjacking mitigation)
- `Strict-Transport-Security` (HSTS in production)
- `X-DNS-Prefetch-Control`

### 4.4 Cross-Origin Resource Sharing (CORS) Policy
- The CORS middleware is configured to accept requests exclusively from the designated client origin:
  ```javascript
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
  ```
- Wildcard origins (`*`) are disallowed, preventing unauthorized cross-origin credential sharing.

---

## 5. Payment Security & Concurrency Defense

### 5.1 Safe Default Offline Mode
- `STRIPE_PAYMENT_ENABLED=false` is set by default.
- Inactive mode allows the application to run fully on **Pay at Venue** without requiring live Stripe keys or risking unconfigured transaction attempts.

### 5.2 Stripe Webhook Cryptographic Verification
When online payments are active:
- The Stripe webhook endpoint (`/api/v1/payments/stripe/webhook`) uses `express.raw({ type: 'application/json' })` to retain the unparsed request payload buffer.
- The cryptographic signature header (`stripe-signature`) is validated against `STRIPE_WEBHOOK_SECRET` using `stripe.webhooks.constructEvent(rawBody, signature, secret)`.
- Fake or tampered webhook calls from external actors are rejected with `400 Bad Request`.
- Administrators cannot manually toggle an unpaid Stripe booking to `paid`; transitions occur exclusively upon verified Stripe events.

### 5.3 15-Minute Slot Hold & Double-Booking Protection
To prevent race conditions during high-demand booking sessions:
- **Atomic Lock**: Initiating a checkout session creates an atomic reservation with `paymentExpiresAt` set to `Date.now() + 15 * 60 * 1000`.
- **Automatic Expiration**: Abandoned checkouts automatically expire and release the slot back to the public pool.
- **Late Payment Recovery Policy**: If a payment clears after a reservation has expired and the slot was already reassigned to another customer, the system flags the booking as `cancelled` with an audit notice for an administrative refund rather than silently double-booking the turf.

---

## 6. Incident Response & Security Checklist

Before deploying this application to a production environment:

- [ ] Ensure `NODE_ENV=production` is set in the production environment.
- [ ] Generate high-entropy 64-character random strings for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET`.
- [ ] Verify SSL/TLS certificates are active (`https://` on both frontend and backend).
- [ ] Restrict `CLIENT_URL` to your production domain name.
- [ ] Secure MongoDB Atlas with IP access lists restricting inbound traffic to backend server IPs.
- [ ] Register the production webhook URL on the Stripe Dashboard with `checkout.session.*` events enabled.
