import { z } from "zod";

export const loginSendCodeSchema = z.object({
  phone: z.string().trim().min(6, "Phone must be at least 6 characters"),
});

export const loginVerifySchema = z.object({
  phone: z.string().trim().min(6, "Phone must be at least 6 characters"),
  verificationCode: z.string().trim().min(4, "Verification code is required"),
});

export type LoginVerifyInput = z.infer<typeof loginVerifySchema>;
