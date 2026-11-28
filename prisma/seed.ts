import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });
const DEMO_MEMBER_WALLET_BALANCE_PAISE = 100_000;

async function ensureUser(input: {
  email: string;
  name: string;
  role: "SUPERADMIN" | "OPERATOR" | "MEMBER";
  password: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.upsert({
    where: { email: input.email },
    create: { email: input.email, name: input.name, role: input.role, passwordHash },
    update: { name: input.name, role: input.role, passwordHash },
  });
  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      currency: "INR",
      ...(input.role === "MEMBER" ? { balancePaise: DEMO_MEMBER_WALLET_BALANCE_PAISE } : {}),
    },
    update: input.role === "MEMBER" ? { balancePaise: DEMO_MEMBER_WALLET_BALANCE_PAISE } : {},
  });
  return user;
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const operatorPassword = process.env.SEED_OPERATOR_PASSWORD;
  const memberPassword = process.env.SEED_MEMBER_PASSWORD;
  if (!adminPassword || !operatorPassword || !memberPassword) {
    throw new Error(
      "Set SEED_ADMIN_PASSWORD, SEED_OPERATOR_PASSWORD, and SEED_MEMBER_PASSWORD before seeding",
    );
  }

  const admin = await ensureUser({
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@pms.local",
    name: "Parking Super Admin",
    role: "SUPERADMIN",
    password: adminPassword,
  });
  await ensureUser({
    email: process.env.SEED_OPERATOR_EMAIL ?? "operator@pms.local",
    name: "Parking Operator",
    role: "OPERATOR",
    password: operatorPassword,
  });
  const member = await ensureUser({
    email: process.env.SEED_MEMBER_EMAIL ?? "member@pms.local",
    name: "Parking Member",
    role: "MEMBER",
    password: memberPassword,
  });
  await prisma.wallet.updateMany({
    where: { user: { role: "MEMBER" } },
    data: { balancePaise: DEMO_MEMBER_WALLET_BALANCE_PAISE },
  });

  const zones = [
    { name: "Basement 1", level: -1, count: 34 },
    { name: "Ground Floor", level: 0, count: 33 },
    { name: "Level 1", level: 1, count: 33 },
  ];
  let globalIndex = 0;
  for (const zoneSeed of zones) {
    const zone = await prisma.zone.upsert({
      where: { name_level: { name: zoneSeed.name, level: zoneSeed.level } },
      create: { name: zoneSeed.name, level: zoneSeed.level, isCovered: zoneSeed.level !== 1, clearanceHeight: zoneSeed.level === -1 ? 2.1 : null },
      update: { isCovered: zoneSeed.level !== 1 },
    });

    for (let localIndex = 1; localIndex <= zoneSeed.count; localIndex += 1) {
      globalIndex += 1;
      const shadow = localIndex === zoneSeed.count;
      const vip = !shadow && localIndex <= 2;
      const accessible = !shadow && localIndex === 3;
      const ev = !shadow && (localIndex === 4 || localIndex === 5);
      const prefix = zoneSeed.level === -1 ? "B1" : zoneSeed.level === 0 ? "G" : "L1";
      const code = `${prefix}-${shadow ? "S" : "A"}${String(localIndex).padStart(2, "0")}`;
      const allowedVehicleType = ev ? "EV" : "ANY";
      await prisma.slot.upsert({
        where: { code },
        create: {
          code,
          zoneId: zone.id,
          slotType: shadow ? "REGULAR" : vip ? "VIP" : accessible ? "HANDICAPPED" : ev ? "EV" : "REGULAR",
          allowedVehicleType,
          distanceToGate: (zoneSeed.level === -1 ? 80 : zoneSeed.level === 0 ? 10 : 40) + localIndex * 3,
          isShadowPool: shadow,
          status: "AVAILABLE",
          ...(vip && localIndex === 1 ? { dedicatedUserId: admin.id } : {}),
        },
        update: {
          zoneId: zone.id,
          slotType: shadow ? "REGULAR" : vip ? "VIP" : accessible ? "HANDICAPPED" : ev ? "EV" : "REGULAR",
          distanceToGate: (zoneSeed.level === -1 ? 80 : zoneSeed.level === 0 ? 10 : 40) + localIndex * 3,
          isShadowPool: shadow,
          allowedVehicleType,
        },
      });
    }
  }

  await prisma.allocationLock.upsert({
    where: { id: "parking-allocation" },
    create: { id: "parking-allocation" },
    update: {},
  });

  const demoVehicles = [
    { licensePlate: "GJ01DEMO1", type: "FOUR_WHEELER" },
    { licensePlate: "GJ01DEMO2", type: "SUV" },
    { licensePlate: "GJ01LIVE1", type: "FOUR_WHEELER" },
    { licensePlate: "GJ01LIVE2", type: "EV" },
    { licensePlate: "GJ01BOOK1", type: "TWO_WHEELER" },
  ];
  for (const vehicle of demoVehicles) {
    await prisma.vehicle.upsert({
      where: { licensePlate: vehicle.licensePlate },
      create: { ...vehicle, ownerId: member.id },
      update: { type: vehicle.type, ownerId: member.id },
    });
  }

  const now = new Date();
  const hour = 60 * 60 * 1000;
  const slotByCode = new Map(
    await Promise.all(
      ["B1-A06", "G-A06", "G-A07", "L1-A06", "L1-A07"].map(async (code) => {
        const slot = await prisma.slot.findUniqueOrThrow({ where: { code } });
        return [code, slot] as const;
      }),
    ),
  );
  const demoBookings = [
    {
      key: "demo-completed-001",
      vehicle: "GJ01DEMO1",
      slotCode: "G-A06",
      status: "COMPLETED",
      expectedEntry: new Date(now.getTime() - 30 * hour),
      expectedExit: new Date(now.getTime() - 27 * hour),
      actualEntry: new Date(now.getTime() - 30 * hour),
      actualExit: new Date(now.getTime() - 27 * hour),
      totalPaidPaise: 15_000,
      paymentStatus: "PAID",
    },
    {
      key: "demo-completed-002",
      vehicle: "GJ01DEMO2",
      slotCode: "G-A07",
      status: "COMPLETED",
      expectedEntry: new Date(now.getTime() - 12 * hour),
      expectedExit: new Date(now.getTime() - 8 * hour),
      actualEntry: new Date(now.getTime() - 12 * hour),
      actualExit: new Date(now.getTime() - 8 * hour),
      totalPaidPaise: 17_500,
      paymentStatus: "PAID",
    },
    {
      key: "demo-active-001",
      vehicle: "GJ01LIVE1",
      slotCode: "B1-A06",
      status: "ACTIVE",
      expectedEntry: new Date(now.getTime() - hour),
      expectedExit: new Date(now.getTime() + hour),
      actualEntry: new Date(now.getTime() - hour),
      actualExit: null,
      totalPaidPaise: 0,
      paymentStatus: "UNPAID",
    },
    {
      key: "demo-active-002",
      vehicle: "GJ01LIVE2",
      slotCode: "L1-A06",
      status: "ACTIVE",
      expectedEntry: new Date(now.getTime() - 2 * hour),
      expectedExit: new Date(now.getTime() + 30 * 60 * 1000),
      actualEntry: new Date(now.getTime() - 2 * hour),
      actualExit: null,
      totalPaidPaise: 0,
      paymentStatus: "UNPAID",
    },
    {
      key: "demo-pending-001",
      vehicle: "GJ01BOOK1",
      slotCode: "L1-A07",
      status: "PENDING",
      expectedEntry: new Date(now.getTime() + 2 * hour),
      expectedExit: new Date(now.getTime() + 4 * hour),
      actualEntry: null,
      actualExit: null,
      totalPaidPaise: 0,
      paymentStatus: "UNPAID",
    },
  ] as const;
  for (const booking of demoBookings) {
    const slot = slotByCode.get(booking.slotCode);
    if (!slot) throw new Error(`Missing demo slot ${booking.slotCode}`);
    await prisma.booking.upsert({
      where: { idempotencyKey: booking.key },
      create: {
        userId: member.id,
        licensePlate: booking.vehicle,
        slotId: slot.id,
        status: booking.status,
        expectedEntry: booking.expectedEntry,
        expectedExit: booking.expectedExit,
        actualEntry: booking.actualEntry,
        actualExit: booking.actualExit,
        hourlyRatePaise: 5_000,
        baseFeePaise: booking.totalPaidPaise,
        totalPaidPaise: booking.totalPaidPaise,
        paymentStatus: booking.paymentStatus,
        idempotencyKey: booking.key,
      },
      update: {},
    });
    if (booking.status === "ACTIVE") {
      await prisma.slot.update({ where: { id: slot.id }, data: { status: "OCCUPIED" } });
    }
  }

  console.log(`Seeded ${zones.length} zones, ${globalIndex} slots, demo bookings, and initial admin/operator/member accounts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
