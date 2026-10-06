import { z } from "zod";

const ServerEnvironment = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  ANPR_GATE_SECRET: z.string().min(32).optional(),
  BASE_HOURLY_RATE_PAISE: z.coerce.number().int().positive().default(10_000),
  SURGE_OCCUPANCY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.85),
  SURGE_MULTIPLIER: z.coerce.number().min(1).max(10).default(1.5),
  OVERSTAY_PENALTY_MULTIPLIER: z.coerce.number().min(1).max(20).default(3),
  UPI_PAYEE_ADDRESS: z.string().default("parking@bank"),
  UPI_PAYEE_NAME: z.string().default("PMS Parking"),
});

export function serverEnv() {
  const parsed = ServerEnvironment.safeParse(process.env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment variables: ${keys}`);
  }
  return parsed.data;
}
