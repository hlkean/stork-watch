export function normalizeUSPhone(input: string) {
  const trimmed = input.trim();

  if (trimmed.startsWith("+")) {
    // Assume already in E.164; ensure it starts with +1 for US-only support.
    if (!trimmed.startsWith("+1")) {
      throw new Error("Only US phone numbers (+1) are supported");
    }
    return trimmed;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  throw new Error("Enter a valid US phone number");
}
