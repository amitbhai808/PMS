import { z } from "zod";

const password = z.string().min(12).max(128);

export const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(8).max(20).optional(),
  password,
});

export const LoginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});
