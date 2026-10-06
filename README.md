# Parkwise Parking Management

API-first parking operations for a three-level facility. The project currently runs on SQLite for local development and uses Prisma 7, Next.js App Router, TypeScript, and Zod.

## Requirements

- Node.js 24 (`.nvmrc` is included). Prisma 7 does not support Node 23.
- npm
- Python 3 for the prepared ANPR service environment

## First run

```sh
cp .env.example .env
npm install
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

Copy `.env.example` to `.env` first if you are setting up another checkout. The local `.env` includes a JWT signing secret, ANPR gate secret, and generated seed account passwords. Keep it private. Seed account emails are `admin@pms.local` and `operator@pms.local`; their local passwords are in `.env`.

The seed command creates three zones and 100 slots: 97 regular capacity slots plus three hidden shadow slots, with EV, VIP, and accessibility bays represented. New members can register through `POST /api/auth/register`.

## Main features

- JWT session cookies are HttpOnly, SameSite=Lax, and Secure in production. Each JWT references a database session, so logout revokes that session immediately. Passwords use bcrypt.
- Roles are `SUPERADMIN`, `OPERATOR`, and `MEMBER`. API handlers enforce role access; Zod validates and normalizes request bodies.
- Slot assignment is done in a Prisma transaction after writing a shared SQLite allocation-lock row. Entry uses compatible available bays, nearest-gate ordering, upcoming-reservation protection, surge pricing, and an idempotency key. Emergency reassignment tries ordinary capacity before the hidden shadow pool.
- Reservations check `PENDING` and `ACTIVE` bookings with a 30 minute buffer. Cancelled and completed bookings no longer block a time window.
- Exit billing stores integer paise, applies a five minute normal billing grace, and charges a three-times total hourly rate from the expected exit minute for every overstay minute. UPI responses are payment intents; they do not verify a payment.
- Members have vehicle records and a wallet ledger. Wallet debits are transactional. Wallet top-ups are simulated only outside production until a real payment provider is integrated.
- Operator slot overrides, maintenance marking, and manual reassignment write audit records.
- The root page is a live facility overview. `public/api-reference.md` documents the endpoint contract and examples.
- `services/anpr` contains a Python virtual-environment scaffold and a secure service-key endpoint. A plate submission adapter is included; camera capture and OCR are intentionally left for a selected model.

## API map

See [the API reference](public/api-reference.md) for methods, access roles, examples, allocation rules, and billing behavior.

## Development commands

```sh
npm run dev            # Next.js development server
npm run build          # Production build
npm run lint           # ESLint
npm run db:generate    # Generate Prisma Client
npm run db:migrate     # Create and apply a local migration
npm run db:deploy      # Apply committed migrations in deployment
npm run db:seed        # Seed facility and staff accounts
npm run db:studio      # Inspect local data
```

Create the Python environment with:

```sh
python3 -m venv services/anpr/venv
services/anpr/venv/bin/python -m pip install -r services/anpr/requirements.txt
```

## Database and deployment boundary

SQLite keeps setup quick and is appropriate for local development and a small single-process deployment. It serializes database writes and is not the target for multi-instance production traffic or the 50-request concurrency stress scenario. The later production phase should move this schema to PostgreSQL, run concurrency tests there, and deploy with a managed database or the planned Docker setup.

Redis is not installed. This app does not need a distributed cache for its current local SQLite shape: live occupancy should stay fresh, and SQLite already serializes writes. Add Redis when the app scales to multiple instances and needs shared rate limits, short-lived cross-process locks, or cache invalidation. PostgreSQL transactions and row-level locking should remain the final authority for slot allocation.

Before internet-facing production, configure HTTPS, rotate all local secrets, add login and ANPR rate limits, connect a verified UPI/payment provider, choose and evaluate an OCR model, and migrate SQLite to PostgreSQL. The development-only wallet recharge endpoint rejects production requests by design.
