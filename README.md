# TransitOps 🚚

A production-ready fleet management system for tracking vehicles, drivers, trips, maintenance, fuel, and operational costs — with role-based access, live dashboards, and automated business-rule enforcement.

Built solo, architecture-first: every feature was scoped in a spec document before a line of code was written, and every state-changing operation is wrapped in a database transaction so concurrent actions (like two dispatch requests hitting at once) can't corrupt fleet state.

---

## Features

### Auth & Roles
Email/password login with 4 distinct roles, each scoped to their actual job:

| Role | Can do |
|---|---|
| **Fleet Manager** | Full access — vehicles, drivers, trip dispatch/complete/cancel, maintenance, reports, exports |
| **Driver** | View their own assigned trips only ("My Trips") |
| **Safety Officer** | Manage drivers, open/close maintenance logs |
| **Financial Analyst** | Log fuel & expenses, view all reports, export all data |

Every screen, menu item, and API route is gated by role — not just hidden in the UI, enforced server-side too.

### Core Entities
Vehicle, Driver, Trip, Maintenance Log, Fuel Log, Expense — each with full CRUD where applicable.

### Business Rules (enforced inside DB transactions, not just app logic)
- Vehicle registration numbers and driver license numbers are unique
- Retired or in-shop vehicles never appear in the dispatch dropdown
- Drivers with expired licenses or suspended status can't be assigned to trips
- A vehicle or driver already on a trip can't be double-booked — even under concurrent requests
- Cargo weight can't exceed a vehicle's max load capacity
- Dispatching a trip atomically flips both vehicle and driver to "On Trip"
- Completing or cancelling a trip reverts both back to "Available"
- Opening a maintenance log automatically puts the vehicle "In Shop"; closing it reverts to "Available" (unless the vehicle is retired)

### Dashboard
Live fleet metrics — active/available vehicles, vehicles in maintenance, active/pending trips, drivers on duty, and fleet utilization % — auto-refreshing every 30 seconds, with cache invalidation on every mutation so numbers update instantly after any dispatch, completion, or maintenance action.

### Reports
- **Fuel Efficiency** — distance driven per liter, by vehicle
- **Fleet Utilization** — broken down by vehicle type
- **Operational Cost** — fuel + maintenance spend per vehicle
- **Vehicle ROI** — (revenue − costs) / acquisition cost

### CSV Export
Every entity exportable to CSV, scoped by role (e.g. Safety Officer can export drivers and maintenance logs; Financial Analyst can export everything).

### Search & Filter
Every list screen supports live search plus contextual filters (status, type, date range) — all client-side, no extra network calls.

### Dark Mode
Full light/dark theme toggle, persisted across sessions.

---

## Tech Stack

**Backend:** Express + TypeScript + Prisma + PostgreSQL, cookie-based JWT auth, AES-256-GCM encryption for sensitive fields, Vitest for unit tests

**Frontend:** React + Vite + TypeScript + Tailwind CSS + shadcn/ui + TanStack Query + Recharts, React Hook Form + Zod for validation

**Architecture:** Layered (routes → controllers → services), all business logic lives in the service layer, all status-changing operations use `prisma.$transaction` with checks performed *inside* the transaction to close race conditions.

---

## Project Structure

```
/
├── shared/          # Shared TypeScript types & Zod schemas (used by both client and server)
├── server/          # Express API
│   ├── prisma/       # Schema, migrations, seed script
│   └── src/
│       ├── routes/       # Route definitions + RBAC gating
│       ├── controllers/  # Request/response handling
│       ├── services/     # Business logic + DB transactions
│       ├── middleware/   # Auth, error handling
│       └── tests/        # Vitest unit tests
└── client/          # React frontend
    └── src/
        ├── pages/         # One component per screen
        ├── components/    # Shared UI (Sidebar, RoleGate, etc.)
        └── context/       # Auth & Theme context
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (local or hosted)
- npm

### Setup

```bash
# Clone and install (npm workspaces — installs client, server, and shared in one go)
git clone <your-repo-url>
cd transitops
npm install
```

### Environment Variables

Create `server/.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/transitops"
JWT_SECRET="<generate a real random string>"
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
```

### Database

```bash
cd server
npx prisma db push
npx prisma db seed
```

This creates a clean dataset: 3 vehicles, 3 drivers, and 4 user accounts (one per role — see your seed script for exact credentials).

### Run

```bash
# From project root, in separate terminals:
cd server && npm run dev     # API on :3000
cd client && npm run dev     # App on :5173
```

Open `http://localhost:5173`.

---

## Testing

```bash
cd server
npx vitest run
```

54 unit tests covering every business rule, transaction boundary, and edge case (zero-division guards, expired licenses, double-booking, etc.).

---

## Demo Flow

1. Log in as Fleet Manager → register a vehicle → register a driver
2. Create a trip within the vehicle's cargo capacity → dispatch it (watch vehicle & driver flip to "On Trip" live on the Dashboard)
3. Complete the trip with an odometer reading → both revert to "Available" automatically
4. Open a maintenance record on a vehicle → it disappears from the dispatch dropdown and shows "In Shop" everywhere
5. Close the maintenance record → vehicle returns to "Available"
6. Check Reports → Fuel Efficiency and Operational Cost reflect the completed trip and any logged fuel/expenses
7. Log in as Driver → confirm they only see their own assigned trips, nothing else
8. Export any screen to CSV

---

## Notes

- All money fields use plain `Float` (not `Decimal`) — confirmed safe for arithmetic across reports and exports.
- Cache invalidation is wired so that dispatch/complete/cancel/maintenance actions immediately update the Dashboard and Reports without waiting for the 30s poll.
- RBAC is enforced at both the UI layer (hidden menu items/buttons) and the API layer (403 on direct requests) — verified role-by-role.
