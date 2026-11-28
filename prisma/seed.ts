import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

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
    update: { name: input.name, role: input.role },
  });
  await prisma.wallet.upsert({
    where: { userId: user.id },
    create: { userId: user.id, currency: "INR" },
    update: {},
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
  await ensureUser({
    email: process.env.SEED_MEMBER_EMAIL ?? "member@pms.local",
    name: "Parking Member",
    role: "MEMBER",
    password: memberPassword,
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

  console.log(`Seeded ${zones.length} zones, ${globalIndex} slots, and initial admin/operator/member accounts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
