import { z } from "zod";

export const loginSendCodeSchema = z.object({
  phone: z.string().trim().min(6, "Phone is required"),
});

export const loginVerifySchema = z.object({
  phone: z.string().trim().min(6, "Phone is required"),
  verificationCode: z.string().trim().min(4, "Verification code is required"),
});

export type LoginVerifyInput = z.infer<typeof loginVerifySchema>;
