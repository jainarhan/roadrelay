# TransitOps — Architecture

## Layered backend structure
```
/server
  /src
    /routes          -> just wires HTTP verbs to controllers, no logic
    /controllers      -> parse req, call service, send res. no business logic here either
    /services         -> ALL business rules live here (this is the important layer)
    /middleware        -> auth.ts (verify JWT), rbac.ts (role gate), validate.ts (zod)
    /prisma           -> schema.prisma, seed.ts
    /utils
  /tests
    /services         -> unit tests per rule (dispatch.test.ts, maintenance.test.ts...)
```

**Rule of thumb**: if a route handler has an `if` statement checking a business rule, it's in the wrong layer. Controllers only orchestrate; services own the rules. This matters because judges will poke at edge cases — you want every rule testable in isolation, not buried inside an Express handler.

## RBAC — keep it dumb on purpose
Don't build a permissions table. One `role` enum column on `User`: `FLEET_MANAGER | DRIVER | SAFETY_OFFICER | FINANCIAL_ANALYST`.

- `middleware/auth.ts` — verifies JWT, attaches `req.user`
- `middleware/rbac.ts` — `requireRole(['FLEET_MANAGER', 'SAFETY_OFFICER'])` wraps routes
- Frontend: a `<RoleGate roles={[...]}>` component hides menu items/routes. Same role list duplicated frontend+backend — backend is the real gate, frontend is just UX.

Suggested route access:
| Area | Roles |
|---|---|
| Vehicle Registry CRUD | Fleet Manager |
| Driver Management CRUD | Fleet Manager, Safety Officer |
| Trip create/dispatch/complete/cancel | Fleet Manager |
| Maintenance Log | Fleet Manager, Safety Officer |
| Fuel & Expense entry | Fleet Manager, Financial Analyst |
| Dashboard | all roles |
| Reports | Fleet Manager, Financial Analyst |
| Safety Score / license view | Safety Officer (read-heavy) |

## The core pattern: status transitions are transactions
Every status-changing action (dispatch, complete, cancel, open/close maintenance) follows this shape in the service layer:

```ts
await prisma.$transaction(async (tx) => {
  const vehicle = await tx.vehicle.findUnique({ where: { id }, });
  const driver  = await tx.driver.findUnique({ where: { id }, });

  // 1. re-check every rule INSIDE the transaction (not before it) —
  //    this is what prevents double-booking race conditions
  if (vehicle.status !== 'AVAILABLE') throw new ConflictError('vehicle not available');
  if (driver.status !== 'AVAILABLE') throw new ConflictError('driver not available');
  if (driver.licenseExpiry < now || driver.status === 'SUSPENDED') throw new ConflictError('driver ineligible');
  if (cargoWeight > vehicle.maxLoadCapacity) throw new ConflictError('over capacity');

  // 2. mutate all three rows in the same transaction
  await tx.vehicle.update({ where: { id }, data: { status: 'ON_TRIP' } });
  await tx.driver.update({ where: { id }, data: { status: 'ON_TRIP' } });
  await tx.trip.update({ where: { id }, data: { status: 'DISPATCHED' } });
});
```

Why inside the transaction and not before: if you check-then-act with two separate queries, two dispatch requests in quick succession can both pass the check before either writes. Postgres row locks inside `$transaction` close that gap. This is genuinely the #1 thing judges will try to break (double-booking).

## API shape (REST, resource-based)
```
POST   /auth/login
POST   /auth/logout
GET    /vehicles            (excludes RETIRED/IN_SHOP if ?dispatchable=true)
POST   /vehicles
PATCH  /vehicles/:id
GET    /drivers             (excludes SUSPENDED/expired-license if ?dispatchable=true)
POST   /drivers
PATCH  /drivers/:id
POST   /trips
POST   /trips/:id/dispatch
POST   /trips/:id/complete   (body: odometerEnd, fuelLiters, fuelCost)
POST   /trips/:id/cancel
POST   /maintenance
POST   /maintenance/:id/close
POST   /fuel-logs
POST   /expenses
GET    /dashboard/summary
GET    /reports/fuel-efficiency
GET    /reports/fleet-utilization
GET    /reports/operational-cost
GET    /reports/vehicle-roi
GET    /reports/export.csv?type=...
```

Note the `?dispatchable=true` query param pattern for vehicles/drivers — one endpoint serves both "list all" (registry screens) and "list eligible for dispatch" (trip create dropdown), filtered server-side. Don't filter this in the frontend; a judge testing "does a retired vehicle show in dispatch" should fail server-side even if someone hits the API directly.

## Frontend structure
```
/client/src
  /pages         (VehicleRegistry, DriverManagement, Trips, Maintenance, FuelExpense, Dashboard, Reports)
  /components    (shared: DataTable, StatusBadge, RoleGate, Modal, ConfirmDialog)
  /features      (per-domain: forms + hooks, e.g. /features/trips/useDispatchTrip.ts)
  /lib           (api client, zod schemas import from /shared)
```

Design direction (frontend-design skill covers this in depth when you actually build):
- Real status badges with color semantics (green=Available, blue=On Trip, amber=In Shop, gray=Retired/Off Duty, red=Suspended) — consistent across every screen
- Dispatch dropdowns visibly show *why* something's excluded on hover, not just silently missing (helps demo + judges understand rules are enforced)
- Dashboard: number cards row + 1-2 charts, not a wall of cards
