 "use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { mapZodErrors, phoneValidation } from "@/lib/validation-utils";

type RegisterState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success" }
  | { status: "error"; message: string };

// Validation schemas for each step
const detailsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phone: phoneValidation,
  babyBirthDate: z.string().optional(),
  babySex: z.string().optional(),
  babyName: z.string().optional(),
});

const verifySchema = z.object({
  verificationCode: z.string().trim().min(4, "Verification code must be at least 4 characters"),
});

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    babyBirthDate: "",
    babySex: "",
    babyName: "",
    verificationCode: "",
  });
  const [state, setState] = useState<RegisterState>({ status: "idle" });
  const [step, setStep] = useState<"details" | "verify">("details");
  const [codeStatus, setCodeStatus] = useState<
    { status: "idle" } | { status: "sending" } | { status: "sent" } | { status: "error"; message: string }
  >({ status: "idle" });
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

  const handleSendCode = async () => {
    // Validate details step
    const validation = detailsSchema.safeParse({
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone,
      babyBirthDate: form.babyBirthDate,
      babySex: form.babySex,
      babyName: form.babyName,
    });

    if (!validation.success) {
      setFieldErrors(mapZodErrors(validation.error));
      return;
    }

    setFieldErrors({});
    setCodeStatus({ status: "sending" });
    setState({ status: "idle" });
    try {
      const response = await fetch("/api/register/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: form.phone.trim() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to send code.");
      }
      setCodeStatus({ status: "sent" });
      setStep("verify");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      setCodeStatus({ status: "error", message });
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (step === "details") {
      await handleSendCode();
      return;
    }

    // Validate verification code
    const validation = verifySchema.safeParse({
      verificationCode: form.verificationCode,
    });

    if (!validation.success) {
      setFieldErrors(mapZodErrors(validation.error));
      return;
    }

    setFieldErrors({});
    setState({ status: "submitting" });

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim(),
          babyBirthDate: form.babyBirthDate
            ? new Date(`${form.babyBirthDate}T00:00:00Z`).toISOString()
            : undefined,
          babySex: form.babySex.trim() || undefined,
          babyName: form.babyName.trim() || undefined,
          verificationCode: form.verificationCode.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to register right now.");
      }

      setState({ status: "success" });
      router.push("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unexpected error occurred.";
      setState({ status: "error", message });
    }
  };

  const disabledDetails =
    state.status === "submitting" ||
    codeStatus.status === "sending" ||
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !form.phone.trim();

  const disabledVerify =
    state.status === "submitting" || !form.verificationCode.trim();

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-6 py-16 sm:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Register
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
            Create your Stork Watch profile
          </h1>
          <p className="mt-2 text-lg text-zinc-600">
            Tell us about you and your baby so we can set up your pregnancy
            space.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm sm:p-8"
        >
          {step === "details" ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">
                  First name
                </span>
                <input
                  required
                  type="text"
                  className={`h-11 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${
                    fieldErrors.firstName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                />
                {fieldErrors.firstName && (
                  <span className="text-xs text-red-600">{fieldErrors.firstName}</span>
                )}
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">
                  Last name
                </span>
                <input
                  required
                  type="text"
                  className={`h-11 rounded-lg border px-3 text-sm outline-none transition focus:ring-2 ${
                    fieldErrors.lastName
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-zinc-200 focus:border-emerald-500 focus:ring-emerald-200"
                  }`}
                  value={form.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                />
                {fieldErrors.lastName && (
                  <span className="text-xs text-red-600">{fieldErrors.lastName}</span>
                )}
              </label>

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

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">
                  Baby birth date
                </span>
                <input
                  type="date"
                  className="h-11 rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  value={form.babyBirthDate}
                  onChange={(e) => updateField("babyBirthDate", e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">
                  Baby name (optional)
                </span>
                <input
                  type="text"
                  className="h-11 rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  value={form.babyName}
                  onChange={(e) => updateField("babyName", e.target.value)}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-zinc-800">
                  Baby sex (optional)
                </span>
                <select
                  className="h-11 rounded-lg border border-zinc-200 px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  value={form.babySex}
                  onChange={(e) => updateField("babySex", e.target.value)}
                >
                  <option value="">Prefer not to say</option>
                  <option value="FEMALE">Female</option>
                  <option value="MALE">Male</option>
                  <option value="UNKNOWN">Unknown</option>
                </select>
              </label>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                We sent a code to {form.phone || "your phone"}. Enter it to
                confirm and finish creating your account.
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
              <button
                type="button"
                onClick={handleSendCode}
                disabled={codeStatus.status === "sending"}
                className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-emerald-700 underline-offset-4 transition hover:underline disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resend code
                {codeStatus.status === "sent" ? "✓" : ""}
              </button>
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-zinc-600">
              {step === "details"
                ? "We’ll send a code to verify your phone."
                : "Enter the code to confirm and continue."}
            </div>
            <div className="flex gap-3">
              {step === "verify" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep("details");
                    setFieldErrors({});
                  }}
                  className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  Back
                </button>
              ) : null}
              <button
                type="submit"
                disabled={step === "details" ? disabledDetails : disabledVerify}
                className="inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {state.status === "submitting"
                  ? "Working..."
                  : step === "details"
                    ? "Continue"
                    : "Confirm & create"}
              </button>
            </div>
          </div>

          {state.status === "error" ? (
            <p className="mt-4 text-sm text-red-600">{state.message}</p>
          ) : null}

          {codeStatus.status === "error" ? (
            <p className="mt-4 text-sm text-red-600">{codeStatus.message}</p>
          ) : null}

          {codeStatus.status === "sent" && step === "verify" ? (
            <p className="mt-4 text-sm text-emerald-700">
              Code sent. Check your messages.
            </p>
          ) : null}
        </form>
      </main>
    </div>
  );
}
