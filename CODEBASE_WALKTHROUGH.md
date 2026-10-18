# Parkwise Parking Management — Codebase Walkthrough

This document is a guided map of the Parkwise codebase as it exists today. It describes the application boundary, the data model, every implemented HTTP endpoint, the important business rules, and how the pieces work together. It is intended for someone taking over the project or integrating with its API.

## 1. What has been built

Parkwise is an API-first parking-management application for a three-level parking facility. The root page is a live operations dashboard, while the main product surface is a set of Next.js App Router API endpoints.

Implemented capabilities include:

- Member registration, password login, JWT session cookies, logout, and session revocation.
- Three application roles: `SUPERADMIN`, `OPERATOR`, and `MEMBER`.
- A seeded three-level facility with 100 slots: 97 normal-capacity slots and 3 hidden emergency/shadow slots.
- Vehicle registration and plate normalization.
- Walk-in entry allocation, reservation entry, trusted ANPR entry, and request idempotency.
- Timed reservations with a 30-minute conflict buffer.
- Slot compatibility, VIP ownership, EV bays, vehicle-height checks, and protected accessibility bays.
- Exit calculation, normal five-minute grace, overstay penalties, wallet settlement, and generated UPI payment intents.
- Wallet balances and a transaction ledger; local-development simulated recharge only.
- Operator override, maintenance, and manual active-booking reassignment, all with audit records.
- Super-admin facility/user management and finance/occupancy reporting.
- A Python ANPR adapter scaffold for forwarding OCR results to the web API.

The app deliberately does **not** yet include a real payment confirmation provider, OCR model/camera capture, rate limiting, or a production database topology. See [Production boundaries](#11-production-boundaries-and-next-steps).

## 2. Technology and runtime

| Area | Choice | Why it is used here |
| --- | --- | --- |
| Web framework | Next.js 16.3, App Router | Server-rendered dashboard and route handlers in one TypeScript application. |
| UI | React 19, Tailwind CSS 4, Lucide | Dashboard composition and component styling. |
| Validation | Zod 4 | Validates and normalizes every JSON write payload. |
| Database access | Prisma 7 + `@prisma/adapter-better-sqlite3` | Type-safe persistence against the local SQLite database. |
| Authentication | `jose` + `bcryptjs` | HS256 JWT session cookies plus bcrypt password hashes. |
| ANPR adapter | Python 3, Requests, OpenCV/Numpy dependencies | A future camera/OCR service can securely submit detected plates. |

Node.js 24 or newer is required. The repository includes `.nvmrc`; Prisma 7 is not supported by Node 23.

## 3. Repository tree

Generated build artifacts (`.next/`), installed packages (`node_modules/`), generated Prisma client files, and the local SQLite database are intentionally omitted from this conceptual tree.

```text
PMS/
├── app/
│   ├── api/
│   │   ├── admin/users/route.ts                # Super-admin user list/create
│   │   ├── anpr/entry/route.ts                 # Service-key ANPR entry adapter
│   │   ├── auth/{login,logout,me,register}/    # Session APIs
│   │   ├── bookings/route.ts                   # Role-scoped booking list
│   │   ├── finance/revenue/route.ts            # Super-admin reporting
│   │   ├── health/route.ts                     # Database health check
│   │   ├── member/register-vehicle/route.ts    # Member vehicles
│   │   ├── operator/{manual-assign,mark-maintenance,override}/
│   │   ├── parking/{entry,exit,reserve}/       # Core parking lifecycle
│   │   ├── slots/[slotId]/route.ts             # Slot read/update
│   │   ├── slots/route.ts                      # Slot list/create
│   │   ├── wallet/{route,recharge/route}.ts    # Wallet and local recharge
│   │   └── zones/route.ts                      # Zone list/create
│   ├── globals.css                             # Dashboard and base styles
│   ├── layout.tsx                              # Root HTML layout and metadata
│   └── page.tsx                                # Live operations dashboard
├── components/ui/                              # Reusable shadcn-style UI primitives
├── lib/
│   ├── api.ts                                  # JSON validation/error helpers
│   ├── auth.ts                                 # Session/JWT logic and role guard
│   ├── domain.ts                               # Shared enums, plate normalization, money helper
│   ├── env.ts                                  # Validated server environment configuration
│   ├── parking.ts                              # Allocation lock, slot selection, pricing rules
│   ├── prisma.ts                               # Singleton Prisma client
│   └── validations/                            # Zod schemas grouped by concern
├── prisma/
│   ├── schema.prisma                           # Relational data model
│   ├── seed.ts                                 # Initial facility and staff data
│   └── migrations/                             # Committed SQLite migration history
├── public/
│   └── api-reference.md                        # Concise, browser-served API quick reference
├── services/anpr/
│   ├── main.py                                 # Camera/OCR placeholder
│   ├── submit_plate.py                         # Secure API submission adapter
│   └── requirements.txt                        # Python dependencies
├── .env.example                                # Required and optional configuration names
├── package.json                                # Scripts and JavaScript dependencies
├── README.md                                   # Setup and product summary
└── CODEBASE_WALKTHROUGH.md                     # This detailed guide
```

## 4. Application shape and request flow

```text
Browser / gate / ANPR adapter
             |
             v
 Next.js route handler (app/api/**/route.ts)
             |
       authentication + role check
             |
       Zod request validation
             |
       domain services in lib/parking.ts
             |
 Prisma transaction / SQLite allocation lock
             |
 SQLite models + audit / wallet ledger records
```

The `/` page is a dynamic server component. It queries Prisma directly for live counts and paid wallet revenue, then renders a dashboard. It is not a client-side operations console yet; many navigation links intentionally point to the underlying JSON APIs.

### Shared request conventions

- Write endpoints expect JSON and return `400` for malformed JSON or `422` for schema validation errors.
- General errors are returned as `{ "error": "..." }`; validation errors additionally expose Zod's flattened `details` object.
- Monetary columns ending in `Paise` are integer INR paise. Convenience response fields such as `balance`, `totalDue`, and `liveRevenue` are INR rupees.
- Plates are trimmed, uppercased, and have spaces/hyphens removed. For example, `DL 8C-AF 5030` becomes `DL8CAF5030`.
- The booking lifecycle is `PENDING → ACTIVE → COMPLETED`; a pending booking can instead become `CANCELLED`.

## 5. Authentication and authorization

### Sessions

`lib/auth.ts` implements a hybrid JWT/database-session design:

1. Registration or login verifies/creates a user.
2. `createSession` creates a UUID-backed `Session` record expiring after 12 hours.
3. The signed HS256 JWT includes the user ID as subject, the session UUID as JWT ID, and the user role.
4. The `pms_session` cookie is HTTP-only, `SameSite=Lax`, scoped to `/`, and marked `Secure` in production.
5. Each authenticated request verifies both the JWT signature and the non-revoked, unexpired database session.
6. Logout sets `revokedAt` on the session and clears the cookie, making the token unusable immediately.

`requirePrincipal(request, roles?)` is used by protected handlers. It returns `401` if unauthenticated and `403` if the authenticated role is not permitted.

### Roles

| Role | Main capabilities |
| --- | --- |
| `MEMBER` | Own vehicles, reservations, own bookings, wallet, and wallet-paid exits. |
| `OPERATOR` | Facility bookings, hidden slots, slot override, maintenance, manual active-booking reassignment, and exits. |
| `SUPERADMIN` | Everything operator-facing plus zones, slots, staff accounts, and finance reporting. |

## 6. Data model

The full source of truth is [prisma/schema.prisma](prisma/schema.prisma). SQLite stores enum-like fields as strings, and Zod enums in `lib/domain.ts` validate values before writes.

| Model | Purpose and important relationships |
| --- | --- |
| `User` | Identity, bcrypt password hash, role, optional phone, one wallet, many sessions/vehicles/bookings/audit logs. A user can own dedicated VIP slots. |
| `Session` | Server-side record backing a JWT. `revokedAt` permits immediate logout. |
| `Wallet` | One INR wallet per user with integer `balancePaise`. |
| `WalletTransaction` | Immutable-style balance-event ledger; `reference` is unique for idempotent financial events. |
| `Vehicle` | Primary key is normalized `licensePlate`; optionally belongs to a user and has bookings. |
| `Zone` | Parking level metadata: name, integer level, coverage, and optional clearance height. |
| `Slot` | A unique physical code, zone, type, permitted vehicle type, gate distance, status, shadow-pool flag, and optional dedicated VIP owner. |
| `Booking` | Reservation/visit lifecycle, plate, slot, expected/actual timestamps, rates, billed values, payment state, and optional idempotency key. |
| `ReassignmentEvent` | History of a booking's automatic reassignment from one slot code to another. |
| `AuditLog` | Operator and lifecycle audit events with actor and JSON details. |
| `AllocationLock` | A single shared row updated first in allocation transactions to serialize SQLite allocation writes. |

### Domain values

| Field family | Allowed values |
| --- | --- |
| User role | `SUPERADMIN`, `OPERATOR`, `MEMBER` |
| Vehicle type | `TWO_WHEELER`, `FOUR_WHEELER`, `EV`, `SUV` |
| Slot type | `REGULAR`, `VIP`, `EV`, `HANDICAPPED` |
| Slot status | `AVAILABLE`, `OCCUPIED`, `MAINTENANCE` |
| Booking status | `PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED` |

### Seeded facility

`prisma/seed.ts` creates two staff accounts from environment variables and these facility zones:

| Zone | Level | Slots | Notes |
| --- | ---: | ---: | --- |
| Basement 1 | -1 | 34 | Covered; 2.1m clearance. |
| Ground Floor | 0 | 33 | Covered; closest gate distances. |
| Level 1 | 1 | 33 | Not covered. |

Each zone has one hidden shadow slot, two VIP bays, one accessibility bay, and two EV bays (where those positions are not the shadow slot). The first VIP bay in every zone is dedicated to the seeded super-admin. The three shadow slots are excluded from normal capacity and public slot responses.

## 7. Core parking rules

The business logic lives primarily in `lib/parking.ts` and is reused by entry, reservation, and manual reassignment routes.

### Allocation safety

SQLite allows only limited write concurrency. `withAllocationLock` wraps slot allocation in a Prisma transaction, first upserting/incrementing the shared `AllocationLock` row. It retries lock/busy conflicts up to three times with a short backoff, and sets a 15-second transaction timeout.

The final state transition is guarded with `updateMany(... status: "AVAILABLE")`. A route only claims a bay if exactly one row was updated, preventing an already-changed slot from being allocated silently.

### Compatible-slot selection

Candidate slots are sorted by dedicated ownership first, then nearest gate, then slot code. A candidate must satisfy all of the following:

- Be `AVAILABLE` unless a reservation search explicitly includes occupied slots for future time-window evaluation.
- Normally not be a shadow-pool slot.
- Accept the vehicle's type; `EV` and `SUV` can use `FOUR_WHEELER` bays, and `ANY` accepts every type.
- Not be a `HANDICAPPED` slot; accessibility-aware allocation is intentionally not implemented yet.
- Be tall enough for an SUV when the zone declares a clearance below 2.0m.
- Be either non-dedicated or dedicated to the requesting user.
- Be a VIP slot only when it is dedicated to the requesting user.
- Have no conflicting pending/active booking and, for ordinary walk-ins, no pending reservation beginning in the next two hours.

### Reservations and shadow capacity

Reservation conflicts include a 30-minute buffer before expected entry and after expected exit. Only `PENDING` and `ACTIVE` bookings block time windows. An overdue active booking with no exit is also treated as a conflict.

When a reserved bay becomes unavailable at arrival, entry first searches normal compatible capacity, then the hidden shadow pool. A successful automatic reassignment produces a `ReassignmentEvent`. Walk-in entry can also use shadow capacity only after ordinary capacity is exhausted.

### Rates and exit billing

- The base hourly rate defaults to 10,000 paise (₹100) and is configurable.
- A walk-in rate is multiplied by the configured surge multiplier only when current occupancy is **above** the configured threshold (default 85%). Reservations retain the non-surge rate.
- Visit duration is rounded up to whole minutes.
- If the vehicle exits no later than the expected exit, up to five normal minutes are free.
- Any overstay is billed from the expected exit minute: its base per-minute portion plus a penalty increment. With the default 3× multiplier, every overstay minute costs three times the normal hourly rate in total.
- The UPI output is only a `upi://` payment intent. It does not confirm payment or mark revenue paid.

## 8. HTTP API reference

The concise browser-served reference is [public/api-reference.md](public/api-reference.md). This section expands it with ownership and behavior details.

### Authentication

| Method and path | Access | Input | Behavior |
| --- | --- | --- | --- |
| `POST /api/auth/register` | Public | `name`, `email`, optional `phone`, `password` (12–128 chars) | Creates a `MEMBER`, creates its wallet, creates a session, returns public user details, and sets `pms_session`; duplicate email/phone is `409`. |
| `POST /api/auth/login` | Public | `email`, `password` | Verifies bcrypt hash, creates a new 12-hour session/cookie, and returns the public user profile; bad credentials are `401`. |
| `POST /api/auth/logout` | Signed in | None | Revokes the current session and clears its cookie. |
| `GET /api/auth/me` | Signed in | None | Returns the current principal (`id`, `email`, `name`, `role`, `sessionId`) with `Cache-Control: no-store`. |

### Entry, reservation, and exit

| Method and path | Access | Input | Behavior |
| --- | --- | --- | --- |
| `POST /api/parking/entry` | Signed in, trusted gate key, or unauthenticated local-development kiosk | `licensePlate`; plus registered vehicle or `vehicleType`; optional `reservationId`, `expectedExit` *or* `durationMinutes`, `idempotencyKey` | Allocates a compatible slot, creates/activates booking, marks the slot occupied, audits entry, and returns `201`; matching idempotent retry returns `200`. In production a user session or valid `x-anpr-gate-secret` is mandatory. |
| `POST /api/anpr/entry` | ANPR service key | Same body as parking entry | Requires a constant-time-checked `x-anpr-gate-secret`; delegates to entry as a trusted gate. |
| `POST /api/parking/reserve` | Member | `licensePlate`, `vehicleType`, future `expectedEntry`, later `expectedExit` | Requires vehicle ownership, picks a compatible non-conflicting slot with the 30-minute buffer, creates a `PENDING` booking, and audits it. |
| `DELETE /api/parking/reserve/{bookingId}` | Owner or operator/admin | None | Cancels a `PENDING` booking only and writes an audit record. |
| `POST /api/parking/exit` | Guest booking, owner, operator, or super-admin | `bookingId` or `licensePlate`; optional `paymentMethod` (`WALLET`/`UPI`) | Finds the active booking, calculates billing, completes it, releases the slot if no other active booking uses it, and audits exit. Owners default to wallet; others default to UPI. |

Important entry input details:

- `expectedExit` is an ISO datetime with an offset; `durationMinutes` is 15 through 10,080. They are mutually exclusive.
- Omission of both defaults the visit to 60 minutes.
- An unregistered vehicle must supply `vehicleType`; an existing vehicle must not contradict its recorded type.
- Registered vehicles cannot enter under another account, except via the trusted ANPR flow.
- An `idempotencyKey` is unique across bookings. Reuse for another plate/owner is rejected with `409`.

Important exit details:

- Wallet payment is allowed only for the signed-in booking owner. Insufficient funds produces `402` and leaves the booking active.
- Wallet success atomically decrements balance and writes a negative `PARKING_EXIT` ledger transaction (`exit:{bookingId}`).
- UPI leaves `paymentStatus` as `UNPAID`, sets `totalPaidPaise` to zero, and returns `upiString`; payment reconciliation remains an integration task.

### Facility, bookings, and users

| Method and path | Access | Input/query | Behavior |
| --- | --- | --- | --- |
| `GET /api/bookings` | Signed in | Optional `status`, `take` (1–100; default 30) | Members see only their own bookings; staff see facility-wide bookings. Includes vehicle, slot, and zone. |
| `GET /api/slots` | Public | Optional `zoneId`; staff-only `includeShadow=true` | Lists ordered slots and zone summary. Shadow slots are hidden unless operator/admin explicitly requests them. |
| `POST /api/slots` | Super-admin | Slot code, zone ID, type, allowed vehicle type, distance, shadow flag, optional dedicated user | Creates a physical slot; duplicate code is `409`. |
| `GET /api/slots/{slotId}` | Public except hidden slot | None | Gets one slot and its zone. A shadow slot requires operator/admin access. |
| `PATCH /api/slots/{slotId}` | Super-admin | Any non-empty allowed slot update fields | Updates code, zone, type, compatibility, distance, shadow flag, dedication, or status. |
| `GET /api/zones` | Public | None | Lists zones in level order with their slot counts. |
| `POST /api/zones` | Super-admin | `name`, `level`, optional `isCovered`, optional `clearanceHeight` | Creates a zone. |
| `GET /api/admin/users` | Super-admin | None | Returns public fields for every user, newest first. |
| `POST /api/admin/users` | Super-admin | Name, email, optional phone, 12+ char password, `SUPERADMIN` or `OPERATOR` role | Creates a staff/admin account and its wallet. |

### Member wallet and vehicles

| Method and path | Access | Input | Behavior |
| --- | --- | --- | --- |
| `GET /api/member/register-vehicle` | Member | None | Lists the member's owned vehicles. |
| `POST /api/member/register-vehicle` | Member | `licensePlate`, `type` | Creates or updates a vehicle owned by this member. A plate owned by someone else is `409`. |
| `GET /api/wallet` | Signed in | None | Returns wallet balance, currency, and 50 most recent ledger entries with rupee convenience values. |
| `POST /api/wallet/recharge` | Member, non-production only | `amountPaise`, `idempotencyKey` | Simulates a credit and records `DEV_RECHARGE`; identical retry is `200`, new recharge is `201`. It returns `501` in production. |

### Operator actions and finance

| Method and path | Access | Input | Behavior |
| --- | --- | --- | --- |
| `POST /api/operator/override` | Operator or super-admin | `slotCode`, `status`, `reason` | Changes a slot status and writes `SLOT_STATUS_OVERRIDDEN`. It cannot mark a slot available while an active booking still uses it. |
| `POST /api/operator/mark-maintenance` | Operator or super-admin | `slotCode`, `reason` | Changes an unoccupied slot to `MAINTENANCE` and audits it. |
| `POST /api/operator/manual-assign` | Operator or super-admin | `bookingId`, target `slotCode`, `reason` | Moves an active booking to a safe compatible available slot, frees the original when safe, and writes `BOOKING_MANUALLY_ASSIGNED`. |
| `GET /api/finance/revenue` | Super-admin | None | Returns normal/shadow capacity, occupancy ratio and percentage, booking-status counts, paid-wallet revenue, INR amount, and timestamp. It is non-cacheable. |
| `GET /api/health` | Public | None | Executes `SELECT 1`; returns `{status:"ok", database:"ok"}` or `503` with a degraded status. |

### Representative request examples

```http
POST /api/auth/register
Content-Type: application/json

{"name":"Asha Rao","email":"asha@example.com","password":"a-long-password-123"}
```

```http
POST /api/member/register-vehicle
Cookie: pms_session=<session token>
Content-Type: application/json

{"licensePlate":"DL 8C-AF 5030","type":"FOUR_WHEELER"}
```

```http
POST /api/parking/reserve
Cookie: pms_session=<session token>
Content-Type: application/json

{"licensePlate":"DL8CAF5030","vehicleType":"FOUR_WHEELER","expectedEntry":"2026-10-06T12:00:00.000Z","expectedExit":"2026-10-06T14:00:00.000Z"}
```

```http
POST /api/anpr/entry
x-anpr-gate-secret: <ANPR_GATE_SECRET>
Content-Type: application/json

{"licensePlate":"DL8CAF5030","vehicleType":"FOUR_WHEELER","durationMinutes":120}
```

## 9. Dashboard and UI

`app/page.tsx` uses `export const dynamic = "force-dynamic"`, so its displayed facility data is read on request rather than statically cached. It queries six live aggregates in parallel:

- Operating zones.
- Non-maintenance, non-shadow capacity.
- Occupied and available normal slots.
- Active bookings.
- Total settled `PAID` booking revenue.

If Prisma/database access fails, the page remains renderable and shows an offline/initial-migration notice. `app/globals.css` provides the responsive dashboard layout: the sidebar compacts at 820px and dashboard panels stack below 600px. `components/ui` contains reusable primitives but the current dashboard is composed directly in the page component.

## 10. Setup, database work, and configuration

### First local run

```sh
cp .env.example .env
npm install
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Do not commit `.env`: it contains the JWT secret, ANPR service secret, and local staff passwords.

### NPM scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the built production server. |
| `npm run lint` | Run ESLint. |
| `npm run db:generate` | Generate Prisma client from the schema. |
| `npm run db:migrate` | Create/apply a local development migration. |
| `npm run db:deploy` | Apply committed migrations in deployment. |
| `npm run db:seed` | Create/update the initial facility and staff accounts. |
| `npm run db:studio` | Open Prisma Studio against the local database. |

### Environment variables

| Variable | Required | Default / role |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite connection, e.g. `file:./dev.db`. |
| `JWT_SECRET` | Yes | At least 32 characters; used to sign and verify session JWTs. |
| `NODE_ENV` | Framework supplied | `development`, `test`, or `production`; enables production safeguards. |
| `ANPR_GATE_SECRET` | Optional but needed for ANPR | At least 32 characters; authenticates service-to-service gate traffic. |
| `BASE_HOURLY_RATE_PAISE` | No | `10000` (₹100/hour). |
| `SURGE_OCCUPANCY_THRESHOLD` | No | `0.85`. |
| `SURGE_MULTIPLIER` | No | `1.5`. |
| `OVERSTAY_PENALTY_MULTIPLIER` | No | `3`. |
| `UPI_PAYEE_ADDRESS` | No | `parking@bank`; used only to compose the UPI intent. |
| `UPI_PAYEE_NAME` | No | `PMS Parking`. |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Seed password required | Initial super-admin identity. |
| `SEED_OPERATOR_EMAIL` / `SEED_OPERATOR_PASSWORD` | Seed password required | Initial operator identity. |

`lib/env.ts` uses Zod to validate server configuration at the point it is read. Missing `DATABASE_URL` or a too-short `JWT_SECRET`, for example, fails fast rather than allowing insecure behavior.

## 11. ANPR service boundary

`services/anpr` is intentionally an integration scaffold rather than fake OCR:

- `main.py` explains that no camera or OCR model is configured.
- `submit_plate.py` accepts a recognized plate and vehicle type, reads `PARKING_API_URL` and `ANPR_GATE_SECRET`, and posts to `/api/anpr/entry`.
- `requirements.txt` includes `opencv-python`, `requests`, and `numpy` for the eventual service.

Create its isolated environment with:

```sh
python3 -m venv services/anpr/venv
services/anpr/venv/bin/python -m pip install -r services/anpr/requirements.txt
```

Once an OCR engine is selected, it should call the existing adapter only after it has made a confident, normalized recognition decision. OCR model selection and local plate-format evaluation are not part of this codebase yet.

## 12. Production boundaries and next steps

The implementation is a strong local/single-process foundation, with deliberate production boundaries:

1. **Database scale:** SQLite serializes writes and is suitable for development or a small single-process deployment. Migrate the schema to PostgreSQL before multi-instance/high-concurrency operation, then use row-level allocation protection and concurrency testing.
2. **Payments:** UPI results are payment intents, not verified settlement. Integrate a payment provider, verify callbacks/webhooks, make settlement idempotent, and only then mark UPI exits paid.
3. **Wallet recharge:** The present endpoint is intentionally simulation-only and returns `501` in production. Replace it with a verified top-up workflow.
4. **ANPR:** Pick a camera/OCR pipeline, add plate confidence handling, test against the target jurisdiction, and protect the service endpoint with secret rotation and request rate limiting.
5. **Internet exposure:** Configure HTTPS, rotate development secrets, add login and ANPR throttling, monitoring, structured logging, and alerting.
6. **Operations UI:** The dashboard is read-only. Add authenticated member, operator, and admin screens over the existing API for day-to-day management.
7. **Accessibility workflow:** Accessibility bays are deliberately excluded from automatic allocation and manual reassignment until an accessibility-aware policy and data model are defined.

## 13. Suggested reading order for a new contributor

1. Read [README.md](README.md) for setup and the intended deployment boundary.
2. Read [prisma/schema.prisma](prisma/schema.prisma) and [prisma/seed.ts](prisma/seed.ts) to understand persistent data and initial capacity.
3. Read [lib/domain.ts](lib/domain.ts), [lib/auth.ts](lib/auth.ts), and [lib/parking.ts](lib/parking.ts) for the shared rules.
4. Follow the main lifecycle through `app/api/parking/entry/route.ts`, `reserve/route.ts`, and `exit/route.ts`.
5. Use [public/api-reference.md](public/api-reference.md) or the API section above to exercise the service.
6. Finish with `app/page.tsx` and `app/globals.css` to understand the current dashboard presentation.
