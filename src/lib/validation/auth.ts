import { z } from "zod";

export const loginSendCodeSchema = z.object({
  phone: z.string().trim().min(10, "Phone number must be at least 10 digits"),
});

export const loginVerifySchema = z.object({
  phone: z.string().trim().min(10, "Phone number must be at least 10 digits"),
  verificationCode: z.string().trim().min(4, "Verification code is required"),
});

export type LoginVerifyInput = z.infer<typeof loginVerifySchema>;
