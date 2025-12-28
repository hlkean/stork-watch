import { z } from "zod";

/**
 * Maps Zod validation errors to a field error object
 * @param error - Zod validation error
 * @returns Object mapping field names to error messages
 */
export function mapZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  error.issues.forEach((issue) => {
    if (issue.path[0]) {
      errors[issue.path[0].toString()] = issue.message;
    }
  });
  return errors;
}
