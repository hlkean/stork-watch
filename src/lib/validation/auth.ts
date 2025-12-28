import { z } from "zod";

export const loginSendCodeSchema = z.object({
  phone: z.string().trim().min(6, "Phone must be at least 6 characters"),
});

export const loginVerifySchema = z.object({
  phone: z.string().trim().min(6, "Phone must be at least 6 characters"),
  verificationCode: z
    .string()
    .trim()
    .regex(/^\d+$/, "Verification code must contain only digits")
    .min(4, "Verification code must be at least 4 digits")
    .max(10, "Verification code must be at most 10 digits"),
});

export type LoginVerifyInput = z.infer<typeof loginVerifySchema>;
