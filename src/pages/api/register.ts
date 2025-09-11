import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db.js';
import { hashPassword, randomToken } from '../../lib/crypto.js';
import { normalizePhone, registerSchema } from '../../lib/validation.js';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { sendOtpSms } from '../../lib/sms.js';

export const POST: APIRoute = async ({ request, redirect, url }) => {
  const form = await request.formData();
  const data = Object.fromEntries(form) as Record<string, string>;

  try {
    const parsed = registerSchema.parse({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      isParent: data.isParent,
      dueDate: data.dueDate,
      childrenExpected: data.childrenExpected,
      acceptTerms: data.acceptTerms,
    });

    const phoneE164 = normalizePhone(parsed.phone);
    const passwordHash = await hashPassword(parsed.password);
    const isParent = parsed.isParent === 'yes';

    const emailVerificationToken = randomToken(20);
    const emailVerificationExpires = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h

    const phoneOtp = (Math.floor(100000 + Math.random() * 900000)).toString();
    const phoneOtpExpires = new Date(Date.now() + 1000 * 60 * 10); // 10m

    const user = await prisma.user.create({
      data: {
        email: parsed.email,
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        phone: phoneE164,
        isParent,
        dueDate: isParent && parsed.dueDate ? new Date(parsed.dueDate) : null,
        childrenExpected: isParent && parsed.childrenExpected ? parseInt(parsed.childrenExpected, 10) : null,
        emailVerificationToken,
        emailVerificationExpires,
        phoneOtp,
        phoneOtpExpires,
        keys: {
          create: {
            id: `email:${parsed.email}`,
            hashedPassword: passwordHash,
          },
        },
      },
    });

    // Send SMS OTP via Twilio if configured
    await sendOtpSms(user.phone!, phoneOtp);

    // Dev-only: write the email verification link and SMS OTP to local files
    try {
      mkdirSync('.dev-emails', { recursive: true });
      mkdirSync('.dev-sms', { recursive: true });
      const verifyUrl = `${process.env.APP_URL ?? url.origin}/api/verify-email?token=${emailVerificationToken}`;
      writeFileSync(join('.dev-emails', 'last-email.txt'), `To: ${user.email}\nVerify: ${verifyUrl}\n`, { encoding: 'utf8' });
      writeFileSync(join('.dev-sms', 'last-code.txt'), `To: ${user.phone}\nCode: ${phoneOtp}\n`, { encoding: 'utf8' });
      // Also log to server console for convenience
      console.log('[DEV] Email verify:', verifyUrl);
      console.log('[DEV] Phone OTP:', phoneOtp);
    } catch {}

    return redirect(`/profile`);
  } catch (err: any) {
    const message = err?.message ?? 'Invalid input';
    return new Response(JSON.stringify({ error: message }), { status: 400 });
  }
};
