import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const registerSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(7).max(30),
  password: z.string().min(8),
  isParent: z.enum(['yes', 'no']),
  dueDate: z.string().optional(),
  childrenExpected: z.string().optional(),
  acceptTerms: z.literal('on'),
}).refine((data) => {
  if (data.isParent === 'yes') return !!data.dueDate && !!data.childrenExpected;
  return true;
}, { message: 'Due date and children expected are required for parents', path: ['dueDate'] });

export function normalizePhone(input: string): string {
  console.log("INPUT:", typeof input);
  const phone = parsePhoneNumberFromString(input, 'US');
  console.log('PHONE:::', phone);
  if (!phone || !phone.isValid()) throw new Error('Invalid phone number');
  return phone.number; // E.164
}

