"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

type Step = "phone" | "verify";
type FormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

// Validation schemas for each step
const phoneSchema = z.object({
  phone: z.string().trim().min(6, "Phone number must be at least 6 characters"),
});

const verifyCodeSchema = z.object({
  verificationCode: z.string().trim().min(4, "Verification code must be at least 4 characters"),
});

// Helper function to convert Zod errors to field error map
function mapZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    if (issue.path[0]) {
      errors[issue.path[0].toString()] = issue.message;
    }
  });
  return errors;
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [form, setForm] = useState({
    phone: "",
    verificationCode: "",
  });
  const [state, setState] = useState<FormState>({ status: "idle" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const sendCode = async () => {
    // Validate phone number
    const validation = phoneSchema.safeParse({
      phone: form.phone,
    });

    if (!validation.success) {
      setFieldErrors(mapZodErrors(validation.error));
      return;
    }

    setFieldErrors({});
    setState({ status: "submitting" });
    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to send code.");
      }
      setStep("verify");
      setState({ status: "idle" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      setState({ status: "error", message });
    }
  };

  const verifyCode = async () => {
    // Validate verification code
    const validation = verifyCodeSchema.safeParse({
      verificationCode: form.verificationCode,
    });

    if (!validation.success) {
      setFieldErrors(mapZodErrors(validation.error));
      return;
    }

    setFieldErrors({});
    setState({ status: "submitting" });
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: form.phone.trim(),
          verificationCode: form.verificationCode.trim(),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to verify code.");
      }
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      setState({ status: "error", message });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === "phone") {
      await sendCode();
    } else {
      await verifyCode();
    }
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-10 px-6 py-16 sm:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Login
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-2 text-lg text-zinc-600">
            Enter your phone number to receive a one-time code.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm sm:p-8"
        >
          {step === "phone" ? (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">Phone</span>
                <input
                  required
                  type="tel"
                  className={`h-11 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${
                    fieldErrors.phone
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                  placeholder="+1 (555) 555-5555"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                />
                {fieldErrors.phone && (
                  <span className="text-xs text-red-600">{fieldErrors.phone}</span>
                )}
              </label>
              <button
                type="submit"
                disabled={state.status === "submitting"}
                className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.status === "submitting" ? "Sending..." : "Send code"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                We sent a code to {form.phone || "your phone"}. Enter it below.
              </div>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">
                  Verification code
                </span>
                <input
                  required
                  type="text"
                  className={`h-11 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${
                    fieldErrors.verificationCode
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                  placeholder="Enter the code we texted you"
                  value={form.verificationCode}
                  onChange={(e) =>
                    updateField("verificationCode", e.target.value)
                  }
                />
                {fieldErrors.verificationCode && (
                  <span className="text-xs text-red-600">{fieldErrors.verificationCode}</span>
                )}
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setFieldErrors({});
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={state.status === "submitting"}
                  className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state.status === "submitting" ? "Verifying..." : "Log in"}
                </button>
              </div>
              <button
                type="button"
                onClick={sendCode}
                disabled={state.status === "submitting"}
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-700 underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resend code
              </button>
            </div>
          )}

          {state.status === "error" ? (
            <p className="mt-4 text-sm text-red-600">{state.message}</p>
          ) : null}
        </form>
      </main>
    </div>
  );
}
