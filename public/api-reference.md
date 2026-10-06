# API quick reference

All JSON write endpoints validate requests with Zod. Amounts named `*Paise` are integer INR paise; convenience response fields named `totalDue`, `balance`, or `liveRevenue` are rupees.

## Authentication

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Create a member account and sign in |
| POST | `/api/auth/login` | Public | Sign in; sets an HttpOnly JWT cookie |
| POST | `/api/auth/logout` | Signed in | Revoke the server-side session and clear the cookie |
| GET | `/api/auth/me` | Signed in | Return the current user |

## Parking

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/parking/entry` | Member cookie, or local development kiosk | Allocate a compatible slot for a walk-in or member |
| POST | `/api/anpr/entry` | `x-anpr-gate-secret` header | Secure server-to-server ANPR entry |
| POST | `/api/parking/exit` | Guest booking, owner, or operator | Close an active session, calculate billing, and return a UPI payload when needed |
| POST | `/api/parking/reserve` | Member | Pre-book an eligible slot with a 30 minute buffer |
| DELETE | `/api/parking/reserve/{bookingId}` | Booking owner or operator | Cancel a pending reservation |
| GET | `/api/bookings` | Signed in | List own bookings or facility bookings for staff |
| GET | `/api/slots` | Public | Read normal slots; operators can add `?includeShadow=true` |
| POST | `/api/slots` | Super admin | Add a slot |
| PATCH | `/api/slots/{slotId}` | Super admin | Update a slot, including its dedicated member assignment |
| GET/POST | `/api/zones` | Public read; super admin write | Read or create facility zones |

## Member, operator, finance

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET/POST | `/api/member/register-vehicle` | Member | List or register owned vehicles |
| GET | `/api/wallet` | Signed in | Read wallet and recent ledger entries |
| POST | `/api/wallet/recharge` | Member, development only | Simulate a top-up; production requires a verified payment provider |
| POST | `/api/operator/override` | Operator or super admin | Set a slot status with an audit reason |
| POST | `/api/operator/mark-maintenance` | Operator or super admin | Take an unoccupied slot out of service |
| POST | `/api/operator/manual-assign` | Operator or super admin | Move an active booking to a compatible available slot |
| GET | `/api/finance/revenue` | Super admin | Occupancy, booking counts, and settled wallet revenue |
| GET | `/api/health` | Public | App and database heartbeat |

## Example requests

Register and sign in (the response sets the `pms_session` cookie):

```http
POST /api/auth/register
Content-Type: application/json

{"name":"Asha Rao","email":"asha@example.com","password":"a-long-password-123"}
```

Reserve a vehicle:

```http
POST /api/parking/reserve
Content-Type: application/json

{"licensePlate":"DL8CAF5030","vehicleType":"FOUR_WHEELER","expectedEntry":"2026-10-06T12:00:00.000Z","expectedExit":"2026-10-06T14:00:00.000Z"}
```

ANPR gate event:

```http
POST /api/anpr/entry
x-anpr-gate-secret: <ANPR_GATE_SECRET>
Content-Type: application/json

{"licensePlate":"DL8CAF5030","vehicleType":"FOUR_WHEELER"}
```

## Slot allocation and billing rules

- Reservation intervals are checked with a 30 minute buffer on both sides.
- Walk-in quick-pick excludes slots with a reservation starting in the next two hours and prefers the closest compatible bay.
- Reassignment first tries normal bays, then the hidden shadow pool. Every reassignment is audited.
- Occupancy above `SURGE_OCCUPANCY_THRESHOLD` multiplies walk-in hourly rates by `SURGE_MULTIPLIER`.
- Overstay is charged from the booked exit minute at `OVERSTAY_PENALTY_MULTIPLIER` total rate. The 5 minute billing grace applies only when the vehicle exits by its booked exit; it does not delay overstay penalties.
- Wallet amounts use integer paise to avoid floating-point accounting errors. UPI output is a payment intent, not a payment confirmation callback.
