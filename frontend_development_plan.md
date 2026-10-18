# Parkwise Frontend Development Plan

## Overview

This document is the master plan for building the Parkwise frontend UI in modular phases. Each phase is self-contained and maps directly to existing backend APIs. We build the **Operator Dashboard first** (the control center), layer in **Admin (SuperAdmin) features** on top, then build the **Member Portal** as a separate authenticated experience.

> [!IMPORTANT]
> **Design principle**: Functional-first. Every page must be a working interface that sends real API requests and displays real responses. No placeholder/mock data — everything talks to the backend.

---

## Progress Tracker

| #  | Task | Phase | Status |
|:---|:-----|:------|:-------|
| 1  | Shared layout shell (sidebar, topbar, auth context) | Foundation | ⬜ TODO |
| 2  | Login page | Foundation | ⬜ TODO |
| 3  | Auth context provider + `/api/auth/me` integration | Foundation | ⬜ TODO |
| 4  | API fetch utilities (`lib/client-api.ts`) | Foundation | ⬜ TODO |
| 5  | Toast/notification system | Foundation | ⬜ TODO |
| 6  | Dashboard overview (upgrade existing `page.tsx` to client-aware) | Phase 1 | ⬜ TODO |
| 7  | Live slot map / parking layout page | Phase 1 | ⬜ TODO |
| 8  | Bookings list page (with status filter tabs) | Phase 1 | ⬜ TODO |
| 9  | Vehicle entry form (gate kiosk) | Phase 1 | ⬜ TODO |
| 10 | Vehicle exit form | Phase 1 | ⬜ TODO |
| 11 | Slot override form | Phase 2 | ⬜ TODO |
| 12 | Mark maintenance form | Phase 2 | ⬜ TODO |
| 13 | Manual booking reassignment form | Phase 2 | ⬜ TODO |
| 14 | Overstay alerts panel (bookings past expectedExit) | Phase 2 | ⬜ TODO |
| 15 | Revenue & finance dashboard (admin) | Phase 3 | ⬜ TODO |
| 16 | User management page (admin) | Phase 3 | ⬜ TODO |
| 17 | Create staff account form (admin) | Phase 3 | ⬜ TODO |
| 18 | Zone management page (admin) | Phase 3 | ⬜ TODO |
| 19 | Audit log viewer (new backend endpoint) | Phase 3 | ⬜ TODO |
| 20 | Member registration page | Phase 4 | ⬜ TODO |
| 21 | Member dashboard (my bookings, my vehicles) | Phase 4 | ⬜ TODO |
| 22 | Vehicle registration form (member) | Phase 4 | ⬜ TODO |
| 23 | Reservation form (member) | Phase 4 | ⬜ TODO |
| 24 | Cancel reservation action (member) | Phase 4 | ⬜ TODO |
| 25 | Wallet page + recharge form (member, dev only) | Phase 4 | ⬜ TODO |

**Completed: 0 / 25**

---

## Color Theme

Using the **"Evergreen Slate"** palette — a modern dark-sidebar + light-content design inspired by Linear, Vercel, and Notion dashboards. Already partially established in the existing `globals.css`.

| Token | Value | Usage |
|:------|:------|:------|
| `--green` | `#197b57` | Primary accent, brand, active states |
| `--green-light` | `#eaf6ef` | Selected nav items, success backgrounds |
| `--ink` | `#1b2824` | Primary text |
| `--canvas` | `#f7f9f7` | Page background |
| `--surface` | `#ffffff` | Cards, panels |
| `--line` | `#e9edeb` | Borders, dividers |
| `--amber` | `#d09c40` | Warnings, pending states |
| `--blue` | `#5e8ec4` | Info, occupancy |
| `--lavender` | `#8372bc` | Active sessions, accents |
| `--red` | `#d14343` | Errors, destructive, overstay |

---

## Architecture Decisions

1. **Route structure**: All dashboard pages under `/dashboard/*` with a shared layout. Member portal under `/member/*`. Login at `/login`, register at `/register`.
2. **Client components for interactivity**: Forms, tables with filters, toast notifications are `"use client"` components.
3. **Server components for data**: Pages that only need to display fetched data use server components where possible. For authenticated pages calling our own API, we use client-side `fetch()` to our API routes (cookie-based auth flows naturally).
4. **No external state library**: React `useState` + `useContext` for auth. Form state via controlled inputs. No Redux/Zustand overhead.
5. **Existing UI primitives**: Use the existing `components/ui/*` (Button, Input, Badge, Table, Dialog, Tabs, Card) from shadcn.

---

## Phase 0 — Foundation

### Task 1: Shared Dashboard Layout Shell

**File**: `app/dashboard/layout.tsx`

A `"use client"` layout with:
- Left sidebar (reusing/evolving the current sidebar design)
- Top bar with breadcrumb, user avatar, logout button
- Auth guard: redirect to `/login` if not authenticated
- Navigation links for all dashboard pages

**Navigation structure** (role-aware — some links hidden for operators vs admins):

```
WORKSPACE
├── Overview          → /dashboard
├── Parking Layout    → /dashboard/slots
├── Bookings          → /dashboard/bookings
├── Entry Gate        → /dashboard/entry
├── Exit Gate         → /dashboard/exit

OPERATIONS
├── Slot Override     → /dashboard/override
├── Maintenance       → /dashboard/maintenance
├── Reassign Booking  → /dashboard/reassign
├── Overstay Alerts   → /dashboard/overstay

ADMIN (SUPERADMIN only)
├── Revenue           → /dashboard/revenue
├── Users             → /dashboard/users
├── Zones             → /dashboard/zones
├── Audit Log         → /dashboard/audit
```

---

### Task 2: Login Page

**File**: `app/login/page.tsx`

| Field | Type | Validation |
|:------|:-----|:-----------|
| Email | `<input type="email">` | Required |
| Password | `<input type="password">` | Required, min 1 char |

**API call**:
```
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@parking.io", "password": "long-password-123" }
```

**Success response** (sets `pms_session` cookie automatically):
```json
{
  "user": { "id": "clx...", "name": "Admin", "email": "admin@parking.io", "role": "SUPERADMIN" },
  "expiresAt": "2026-10-19T05:08:00.000Z"
}
```

**Error**: `401 { "error": "Invalid email or password" }`

**On success**: Store user in auth context, redirect to `/dashboard`.

---

### Task 3: Auth Context Provider

**File**: `components/auth-provider.tsx`

- React context holding `{ user, loading, logout, refresh }`
- On mount: `GET /api/auth/me` to check if session cookie is valid
- `logout()`: calls `POST /api/auth/logout`, clears context, redirects to `/login`
- Wraps the entire app in `layout.tsx`

**GET /api/auth/me response**:
```json
{ "id": "clx...", "email": "admin@parking.io", "name": "Admin", "role": "SUPERADMIN", "sessionId": "uuid..." }
```

---

### Task 4: Client-side API Fetch Utilities

**File**: `lib/client-api.ts`

Helpers for all client-side API calls:
```typescript
async function api<T>(url: string, options?: RequestInit): Promise<{ data?: T; error?: string }>
async function apiGet<T>(url: string): Promise<{ data?: T; error?: string }>
async function apiPost<T>(url: string, body: unknown): Promise<{ data?: T; error?: string }>
```
- Automatically includes `Content-Type: application/json`
- Parses JSON response
- Returns `{ error }` on non-2xx status
- Handles network errors gracefully

---

### Task 5: Toast/Notification System

**File**: `components/toast.tsx`

Minimal toast component using React portal:
- Success (green), Error (red), Info (blue) variants
- Auto-dismiss after 4 seconds
- Stackable
- Context-based: `useToast()` hook → `{ toast(msg, type) }`

---

## Phase 1 — Core Operator Dashboard

### Task 6: Dashboard Overview

**File**: `app/dashboard/page.tsx`

Upgrade the current read-only dashboard to be auth-aware and interactive. Instead of direct Prisma queries, this page will use client-side fetches so it respects the cookie auth session.

**Data sources**:

| Data | API | Method |
|:-----|:----|:-------|
| Occupancy & capacity | `GET /api/finance/revenue` | Requires SUPERADMIN. For OPERATOR, use `GET /api/slots` to compute counts client-side. |
| Active bookings count | `GET /api/bookings?status=ACTIVE&take=1` | Count from response |
| Zone info | `GET /api/zones` | Public |

For operators who can't access `/api/finance/revenue`, we compute stats from the slots endpoint.

---

### Task 7: Live Slot Map / Parking Layout

**File**: `app/dashboard/slots/page.tsx`

**API**: `GET /api/slots` (public, optionally `?zoneId=xxx&includeShadow=true` for staff)

**Response shape**:
```json
{
  "slots": [
    {
      "id": "clx...",
      "code": "B1-001",
      "zoneId": "clx...",
      "slotType": "REGULAR",
      "allowedVehicleType": "ANY",
      "distanceToGate": 10,
      "isShadowPool": false,
      "status": "AVAILABLE",
      "dedicatedUserId": null,
      "zone": { "id": "clx...", "name": "Basement 1", "level": -1 }
    }
  ]
}
```

**UI**:
- Tab per zone (Basement 1 / Ground Floor / Level 1)
- Grid of slot cards, color-coded by status:
  - 🟢 Green → AVAILABLE
  - 🔴 Red → OCCUPIED
  - 🟡 Amber → MAINTENANCE
- Each card shows: slot code, type icon, allowed vehicle type
- Click a slot → detail panel or quick-action (override, mark maintenance)
- Staff toggle to show shadow pool slots
- Zone summary bar: X available / Y occupied / Z maintenance

---

### Task 8: Bookings List

**File**: `app/dashboard/bookings/page.tsx`

**API**: `GET /api/bookings?status=ACTIVE&take=100`

**Query params**:
- `status`: `PENDING` | `ACTIVE` | `COMPLETED` | `CANCELLED` (or omit for all)
- `take`: 1–100

**Response shape**:
```json
{
  "bookings": [
    {
      "id": "clx...",
      "status": "ACTIVE",
      "userId": "clx...",
      "licensePlate": "MH12AB1234",
      "slotId": "clx...",
      "expectedEntry": "2026-10-18T10:00:00.000Z",
      "expectedExit": "2026-10-18T12:00:00.000Z",
      "actualEntry": "2026-10-18T10:05:00.000Z",
      "actualExit": null,
      "hourlyRatePaise": 10000,
      "baseFeePaise": 0,
      "penaltyFeePaise": 0,
      "totalPaidPaise": 0,
      "paymentStatus": "UNPAID",
      "slot": {
        "code": "B1-003",
        "zone": { "name": "Basement 1", "level": -1 }
      },
      "vehicle": { "licensePlate": "MH12AB1234", "type": "FOUR_WHEELER" }
    }
  ]
}
```

**UI**:
- Tab bar: All / Pending / Active / Completed / Cancelled
- Table with columns: License Plate, Vehicle Type, Slot, Zone, Entry Time, Expected Exit, Status, Payment
- Status badges color-coded: PENDING=amber, ACTIVE=green, COMPLETED=blue, CANCELLED=gray
- Row highlighting for overstay (actual time > expectedExit)
- Click row → expand details with billing info

---

### Task 9: Vehicle Entry Form (Gate Kiosk)

**File**: `app/dashboard/entry/page.tsx`

This is the primary interface an operator uses when a vehicle arrives at the gate.

**Form fields**:

| Field | Input Type | Required | Notes |
|:------|:-----------|:---------|:------|
| License Plate | Text input | ✅ | Auto-uppercase, strip spaces/hyphens |
| Vehicle Type | Select dropdown | Conditional | Required if vehicle not registered |
| Reservation ID | Text input | ❌ | If driver has a booking confirmation |
| Duration (minutes) | Number input | ❌ | 15–10080 (1 week) |
| Expected Exit | Datetime picker | ❌ | ISO datetime |

> **Rule**: Cannot provide both Duration and Expected Exit.

**API call**:
```
POST /api/parking/entry
Content-Type: application/json

{
  "licensePlate": "MH12AB1234",
  "vehicleType": "FOUR_WHEELER",
  "durationMinutes": 120
}
```

**Success response (201)**:
```json
{
  "booking": {
    "id": "clx...",
    "status": "ACTIVE",
    "licensePlate": "MH12AB1234",
    "slot": { "code": "G0-005", "zone": { "name": "Ground Floor", "level": 0 } },
    "expectedExit": "2026-10-18T19:08:00.000Z",
    "hourlyRatePaise": 10000
  },
  "reassigned": false,
  "message": "Entry recorded"
}
```

**UI after success**: Show a confirmation card with:
- Allocated slot code + zone
- Expected exit time
- Hourly rate in ₹
- Whether reassignment happened
- Print-friendly receipt option

---

### Task 10: Vehicle Exit Form

**File**: `app/dashboard/exit/page.tsx`

**Form fields**:

| Field | Input Type | Required | Notes |
|:------|:-----------|:---------|:------|
| Booking ID | Text input | Either this or plate | From the booking record |
| License Plate | Text input | Either this or ID | |
| Payment Method | Radio: WALLET / UPI | ❌ | Default depends on context |

**API call**:
```
POST /api/parking/exit
Content-Type: application/json

{ "licensePlate": "MH12AB1234", "paymentMethod": "UPI" }
```

**Success response**:
```json
{
  "message": "Exit recorded",
  "booking": { "id": "clx...", "status": "COMPLETED", "actualExit": "...", "slot": { "code": "G0-005" } },
  "billing": {
    "actualMinutes": 135,
    "overstayMinutes": 15,
    "graceMinutes": 0,
    "baseFeePaise": 20000,
    "penaltyFeePaise": 7500,
    "totalDuePaise": 27500,
    "baseFee": 200.00,
    "penaltyFee": 75.00,
    "totalDue": 275.00,
    "currency": "INR"
  },
  "paymentMethod": "UPI",
  "upiString": "upi://pay?pa=parking%40bank&pn=PMS%20Parking&am=275.00&cu=INR&tn=Booking%20clx..."
}
```

**UI after success**: Billing breakdown card showing:
- Duration, overstay minutes, grace
- Base fee, penalty fee, total
- Payment method used
- If UPI: rendered QR code from `upiString`

---

## Phase 2 — Operator Actions

### Task 11: Slot Override Form

**File**: `app/dashboard/override/page.tsx`

**Form fields**:

| Field | Input Type | Required |
|:------|:-----------|:---------|
| Slot Code | Text input or dropdown (populated from `GET /api/slots`) | ✅ |
| New Status | Select: AVAILABLE / OCCUPIED / MAINTENANCE | ✅ |
| Reason | Textarea | ✅ (min 4 chars) |

**API call**:
```
POST /api/operator/override
Content-Type: application/json

{ "slotCode": "B1-003", "status": "MAINTENANCE", "reason": "Water leak near bay" }
```

**Response**: `{ "slot": { updated slot object } }`

---

### Task 12: Mark Maintenance Form

**File**: `app/dashboard/maintenance/page.tsx`

Simplified version of override that only sets slots to MAINTENANCE.

**Form fields**:

| Field | Input Type | Required |
|:------|:-----------|:---------|
| Slot Code | Text/dropdown | ✅ |
| Reason | Textarea | ✅ (min 4 chars) |

**API call**:
```
POST /api/operator/mark-maintenance
Content-Type: application/json

{ "slotCode": "B1-003", "reason": "Electrical wiring maintenance" }
```

---

### Task 13: Manual Booking Reassignment

**File**: `app/dashboard/reassign/page.tsx`

Moves an active booking from one slot to another.

**Form fields**:

| Field | Input Type | Required |
|:------|:-----------|:---------|
| Booking ID | Text input (or pick from active bookings list) | ✅ |
| Target Slot Code | Text/dropdown (only show AVAILABLE slots) | ✅ |
| Reason | Textarea | ✅ (min 4 chars) |

**API call**:
```
POST /api/operator/manual-assign
Content-Type: application/json

{ "bookingId": "clx...", "slotCode": "G0-012", "reason": "Customer requested covered parking" }
```

**Response**:
```json
{
  "booking": { "id": "clx...", "slot": { "code": "G0-012", "zone": { "name": "Ground Floor" } } },
  "slot": { "code": "G0-012", ... },
  "unchanged": false
}
```

---

### Task 14: Overstay Alerts Panel

**File**: `app/dashboard/overstay/page.tsx`

**No dedicated backend endpoint exists** — we'll derive this from bookings.

**API**: `GET /api/bookings?status=ACTIVE&take=100`

**Client-side logic**: Filter bookings where `expectedExit < now` and `actualExit === null`.

**UI**:
- Table of overstaying vehicles with:
  - License plate, slot code, zone
  - Expected exit (with "X minutes/hours overdue" badge in red)
  - Hourly rate
- Quick action buttons: "Process Exit" (→ exit form) or "Reassign" (→ reassign form)

**New backend endpoint needed**: `GET /api/bookings/overstay` — we'll add a server-side route that returns only active bookings past their `expectedExit`. This avoids pulling all active bookings to the client just to filter.

```typescript
// NEW: app/api/bookings/overstay/route.ts
// GET — Returns active bookings where expectedExit < now and actualExit is null
// Access: OPERATOR, SUPERADMIN
```

---

## Phase 3 — Admin (SuperAdmin) Features

### Task 15: Revenue & Finance Dashboard

**File**: `app/dashboard/revenue/page.tsx`

**API**: `GET /api/finance/revenue` (SUPERADMIN only)

**Response**:
```json
{
  "totalOccupancy": 0.32,
  "occupancyPercent": 32.0,
  "totalSlots": 97,
  "availableSlots": 66,
  "occupiedSlots": 31,
  "shadowSlots": 3,
  "bookings": { "ACTIVE": 31, "COMPLETED": 145, "PENDING": 3, "CANCELLED": 2 },
  "revenuePaise": 1450000,
  "liveRevenue": 14500.00,
  "currency": "INR",
  "updatedAt": "2026-10-18T11:38:00.000Z"
}
```

**UI**:
- Large occupancy ring (already exists, reuse)
- Revenue card with ₹ amount
- Booking status breakdown (pie chart or stat cards: active/pending/completed/cancelled)
- Capacity breakdown: total vs available vs occupied vs shadow
- Auto-refresh toggle (poll every 30s)

---

### Task 16: User Management Page

**File**: `app/dashboard/users/page.tsx`

**API**: `GET /api/admin/users` (SUPERADMIN only)

**Response**:
```json
{
  "users": [
    { "id": "clx...", "name": "Admin", "email": "admin@parking.io", "phone": null, "role": "SUPERADMIN", "createdAt": "..." },
    { "id": "clx...", "name": "Operator 1", "email": "operator@parking.io", "phone": null, "role": "OPERATOR", "createdAt": "..." }
  ]
}
```

**UI**:
- Table: Name, Email, Phone, Role (badge), Created At
- Role badge colors: SUPERADMIN=lavender, OPERATOR=blue, MEMBER=green
- "Create Staff Account" button → opens dialog (Task 17)

---

### Task 17: Create Staff Account Form

**File**: Dialog within `app/dashboard/users/page.tsx`

**Form fields**:

| Field | Input Type | Required |
|:------|:-----------|:---------|
| Name | Text | ✅ (2–80 chars) |
| Email | Email | ✅ |
| Phone | Tel | ❌ (8–20 chars) |
| Password | Password | ✅ (12–128 chars) |
| Role | Select: SUPERADMIN / OPERATOR | ✅ |

**API call**:
```
POST /api/admin/users
Content-Type: application/json

{ "name": "New Operator", "email": "op2@parking.io", "password": "secure-pass-1234", "role": "OPERATOR" }
```

---

### Task 18: Zone Management

**File**: `app/dashboard/zones/page.tsx`

**APIs**:
- `GET /api/zones` — list zones
- `POST /api/zones` — create zone (SUPERADMIN)

**GET response**:
```json
{
  "zones": [
    { "id": "clx...", "name": "Basement 1", "level": -1, "isCovered": true, "clearanceHeight": 2.1, "_count": { "slots": 34 } }
  ]
}
```

**Create form fields**:

| Field | Input Type | Required |
|:------|:-----------|:---------|
| Name | Text | ✅ |
| Level | Number | ✅ (-10 to 50) |
| Is Covered | Checkbox | ❌ (default true) |
| Clearance Height (m) | Number | ❌ |

---

### Task 19: Audit Log Viewer

**No backend endpoint exists** — we need to create one.

**New endpoint**: `GET /api/admin/audit`

```typescript
// NEW: app/api/admin/audit/route.ts
// GET — Returns audit logs, newest first
// Query: ?take=50&entityType=Booking
// Access: SUPERADMIN
// Response: { logs: [{ id, actorUserId, event, entityType, entityId, details, createdAt, actor: { name, email } }] }
```

**UI**: Table with columns: Time, Actor, Event, Entity, Details (expandable JSON)

---

## Phase 4 — Member Portal

### Task 20: Member Registration Page

**File**: `app/register/page.tsx`

**Form fields**:

| Field | Input Type | Required |
|:------|:-----------|:---------|
| Name | Text | ✅ (2–80 chars) |
| Email | Email | ✅ |
| Phone | Tel | ❌ |
| Password | Password | ✅ (12–128 chars) |

**API call**:
```
POST /api/auth/register
Content-Type: application/json

{ "name": "Asha Rao", "email": "asha@example.com", "password": "a-long-password-123" }
```

**On success (201)**: Auto-logged in (cookie set), redirect to `/member`.

---

### Task 21: Member Dashboard

**File**: `app/member/page.tsx` (with `app/member/layout.tsx` for member-specific nav)

Shows:
- Welcome header with user name
- Quick stats: Active bookings, registered vehicles, wallet balance
- Recent bookings table (from `GET /api/bookings`)
- Quick action buttons: Reserve, Register Vehicle, Recharge Wallet

---

### Task 22: Vehicle Registration Form

**File**: `app/member/vehicles/page.tsx`

**APIs**:
- `GET /api/member/register-vehicle` — list my vehicles
- `POST /api/member/register-vehicle` — register/update

**Form fields**:

| Field | Input Type | Required |
|:------|:-----------|:---------|
| License Plate | Text | ✅ |
| Vehicle Type | Select: TWO_WHEELER / FOUR_WHEELER / EV / SUV | ✅ |

**POST body**: `{ "licensePlate": "DL8CAF5030", "type": "FOUR_WHEELER" }`

---

### Task 23: Reservation Form

**File**: `app/member/reserve/page.tsx`

**Form fields**:

| Field | Input Type | Required |
|:------|:-----------|:---------|
| License Plate | Dropdown (from registered vehicles) | ✅ |
| Vehicle Type | Auto-filled from selected vehicle | ✅ |
| Expected Entry | Datetime picker | ✅ (must be future) |
| Expected Exit | Datetime picker | ✅ (must be after entry) |

**API call**:
```
POST /api/parking/reserve
Content-Type: application/json

{
  "licensePlate": "DL8CAF5030",
  "vehicleType": "FOUR_WHEELER",
  "expectedEntry": "2026-10-19T10:00:00+05:30",
  "expectedExit": "2026-10-19T14:00:00+05:30"
}
```

---

### Task 24: Cancel Reservation

**API**: `DELETE /api/parking/reserve/{bookingId}`

Inline action button on each PENDING booking row in the member bookings table.

---

### Task 25: Wallet Page + Recharge

**File**: `app/member/wallet/page.tsx`

**APIs**:
- `GET /api/wallet` — balance + transaction history
- `POST /api/wallet/recharge` — dev-only simulated top-up

**GET response**:
```json
{
  "wallet": { "id": "clx...", "balancePaise": 500000, "balance": 5000.00, "currency": "INR" },
  "transactions": [
    { "id": "clx...", "amountPaise": -20000, "amount": -200.00, "type": "PARKING_EXIT", "reference": "exit:clx...", "description": "Parking fee for booking clx...", "createdAt": "..." }
  ]
}
```

**Recharge form** (dev mode only):

| Field | Input Type | Required |
|:------|:-----------|:---------|
| Amount (₹) | Number | ✅ (converted to paise) |
| Idempotency Key | Auto-generated UUID | ✅ |

**POST body**: `{ "amountPaise": 100000, "idempotencyKey": "abc123..." }`

---

## New Backend Endpoints Needed

| Endpoint | Method | Access | Purpose |
|:---------|:-------|:-------|:--------|
| `/api/admin/audit` | GET | SUPERADMIN | Paginated audit log with actor join |
| `/api/bookings/overstay` | GET | OPERATOR, SUPERADMIN | Active bookings past expectedExit |

---

## File Structure (target)

```
app/
├── login/page.tsx                        # Login form
├── register/page.tsx                     # Member registration
├── dashboard/
│   ├── layout.tsx                        # Shared shell: sidebar + topbar + auth guard
│   ├── page.tsx                          # Overview (upgraded)
│   ├── slots/page.tsx                    # Parking layout grid
│   ├── bookings/page.tsx                 # Bookings table
│   ├── entry/page.tsx                    # Entry gate form
│   ├── exit/page.tsx                     # Exit gate form
│   ├── override/page.tsx                 # Slot override (operator)
│   ├── maintenance/page.tsx              # Mark maintenance (operator)
│   ├── reassign/page.tsx                 # Manual reassignment (operator)
│   ├── overstay/page.tsx                 # Overstay alerts
│   ├── revenue/page.tsx                  # Finance dashboard (admin)
│   ├── users/page.tsx                    # User management (admin)
│   ├── zones/page.tsx                    # Zone management (admin)
│   └── audit/page.tsx                    # Audit log viewer (admin)
├── member/
│   ├── layout.tsx                        # Member portal shell
│   ├── page.tsx                          # Member dashboard
│   ├── vehicles/page.tsx                 # My vehicles
│   ├── reserve/page.tsx                  # Make a reservation
│   └── wallet/page.tsx                   # Wallet + recharge
├── api/
│   ├── admin/audit/route.ts             # NEW: Audit log endpoint
│   └── bookings/overstay/route.ts       # NEW: Overstay query
components/
├── auth-provider.tsx                     # Auth context + session management
├── toast.tsx                             # Toast notification system
├── parking/
│   ├── slot-card.tsx                     # Individual slot display
│   ├── slot-grid.tsx                     # Grid of slots for a zone
│   ├── booking-row.tsx                   # Single booking in a table
│   ├── billing-card.tsx                  # Exit billing breakdown
│   └── overstay-badge.tsx               # Time-overdue indicator
lib/
└── client-api.ts                         # Client-side fetch wrapper
```

---

## Execution Order

We'll build in this sequence, each task building on the last:

1. **Foundation** (Tasks 1–5): Auth, layout, utilities — everything needs these
2. **Phase 1** (Tasks 6–10): Core operator views — see slots, bookings, process entry/exit
3. **Phase 2** (Tasks 11–14): Operator actions — overrides, maintenance, reassignment, overstay
4. **Phase 3** (Tasks 15–19): Admin layers — revenue, users, zones, audit log
5. **Phase 4** (Tasks 20–25): Member portal — registration, reservations, wallet
