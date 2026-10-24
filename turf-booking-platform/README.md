# Turf Booking Platform (MERN)

A production-grade sports turf booking and facility management platform built with MongoDB, Express.js, React, and Node.js.

The platform provides an end-to-end booking experience for customers (box cricket, football, pickleball, badminton) with real-time dynamic pricing and complete control from an administrative panel.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (tested on Node v22.18.0)
- **npm**: `v10.x` or `v11.x`
- **MongoDB**: `v6.0+` (for future database integration in Step 2)

---

## 2. Project Folder Structure

```
turf-booking-platform/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── assets/             # Images, static media
│   │   ├── components/
│   │   │   ├── admin/          # Dedicated Admin UI components
│   │   │   ├── customer/       # Dedicated Customer UI components
│   │   │   └── common/         # Shared UI primitives (buttons, inputs)
│   │   ├── features/
│   │   │   ├── admin/          # Admin-specific logic & feature slices
│   │   │   └── customer/       # Customer-specific logic & feature slices
│   │   ├── hooks/              # Custom React hooks
│   │   ├── layouts/            # Layout wrappers (CustomerLayout, AdminLayout)
│   │   ├── pages/
│   │   │   ├── admin/          # Admin views (dashboard, turfs, rates, etc.)
│   │   │   ├── customer/       # Customer views (booking, discovery, profile)
│   │   │   └── public/         # Landing, login, registration
│   │   ├── services/
│   │   │   ├── admin/          # Admin API communication
│   │   │   └── customer/       # Customer API communication
│   │   ├── utils/              # Shared helper functions
│   │   ├── App.jsx             # Starter app shell
│   │   └── index.css           # Tailwind CSS v4 entry
│   ├── vite.config.js          # Vite + Tailwind v4 + Vitest config
│   └── package.json
│
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── config/             # Zod environment validation, logger
│   │   ├── controllers/
│   │   │   ├── admin/          # Dedicated Admin controllers
│   │   │   └── customer/       # Dedicated Customer controllers
│   │   ├── middleware/         # Error handler, 404 handler, auth guards
│   │   ├── models/             # Mongoose schemas (turfs, rates, bookings)
│   │   ├── routes/
│   │   │   ├── admin/          # Admin endpoints (/api/v1/admin/*)
│   │   │   ├── customer/       # Customer endpoints (/api/v1/customer/*)
│   │   │   └── health.routes.js# Health check endpoint (/api/v1/health)
│   │   ├── services/           # Pricing engine, slot availability logic
│   │   ├── validators/         # Zod request validators
│   │   ├── utils/              # Calculation helpers & response wrappers
│   │   ├── app.js              # Express app setup (helmet, cors, routes)
│   │   └── server.js           # Server listen & lifecycle entry
│   ├── tests/                  # Backend unit/integration tests
│   └── package.json
│
├── docs/                       # Project documentation & requirements
├── tests/                      # End-to-end test suites (Playwright/Vitest)
├── .env.example                # Root environment template (no secrets)
├── .gitignore                  # Git ignore rules
└── README.md                   # This setup guide
```

---

## 3. Dependency Installation

### Step A: Install Frontend Dependencies
```bash
cd client
npm install
```

### Step B: Install Backend Dependencies
```bash
cd ../server
npm install
```

---

## 4. Environment Setup

1. Copy the example environment files:
   - For backend:
     ```bash
     cd server
     cp .env.example .env
     ```
   - For frontend:
     ```bash
     cd ../client
     cp .env.example .env
     ```
2. Check the configuration:
   - `PORT`: Server port (default: `5000`)
   - `CORS_ORIGIN`: Allowed frontend client origin (default: `http://localhost:5173`)
   - `VITE_API_BASE_URL`: Frontend API base URL (default: `http://localhost:5000/api/v1`)

---

## 5. Running the Application

### Running the Backend
In the `server/` directory:
```bash
# Start in development mode with nodemon
npm run dev

# Or start in standard production mode
npm start
```
The server will start at: `http://localhost:5000`

### Running the Frontend
In the `client/` directory:
```bash
# Start Vite development server
npm run dev
```
The client will start at: `http://localhost:5173`

---

## 6. Testing

### Test the Backend Health Endpoint
You can run automated tests using Vitest:
```bash
cd server
npm test
```

Or make a direct curl / browser request:
```bash
curl http://localhost:5000/api/v1/health
```

Expected JSON response:
```json
{
  "success": true,
  "message": "Turf Booking Platform API is operational",
  "data": {
    "status": "healthy",
    "timestamp": "2026-10-24T07:15:00.000Z",
    "uptime": 3.42,
    "version": "1.0.0"
  }
}
```

### Test the Frontend
In the `client/` directory:
```bash
# Run frontend unit tests
npm test

# Test frontend production build
npm run build
```
