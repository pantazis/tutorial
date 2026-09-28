import { z } from "zod";

export const registrationSchema = z
  .object({
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    password: z.string().min(12).max(128),
    preferredLanguage: z.enum(["EL", "EN"]),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128),
  })
  .strict();

export const passwordSchema = z.string().min(12).max(128);
export const emailSchema = z.string().trim().email().max(320).transform((value) => value.toLowerCase());
