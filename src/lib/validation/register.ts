import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: z.string().trim().min(6, "Phone number must be at least 6 characters"),
  babyBirthDate: z.string().datetime().optional(),
  babySex: z.string().trim().optional(),
  babyName: z.string().trim().optional(),
  verificationCode: z
    .string()
    .trim()
    .regex(/^\d{4,10}$/, "Verification code must be 4-10 digits"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const sendCodeSchema = z.object({
  phone: z.string().trim().min(6, "Phone number must be at least 6 characters"),
});
