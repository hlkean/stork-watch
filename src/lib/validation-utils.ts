import { z } from "zod";

/**
 * Shared phone validation schema
 */
export const phoneValidation = z.string().trim().min(6, "Phone number must be at least 6 characters");

/**
 * Maps Zod validation errors to a field error object
 * @param error - Zod validation error
 * @returns Object mapping field names to error messages
 */
export function mapZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    if (issue.path.length > 0) {
      errors[String(issue.path[0])] = issue.message;
    }
  });
  return errors;
}
