import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db.js';
import { getSessionIdFromContext } from '../../lib/session.js';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { sendOtpSms } from '../../lib/sms.js';

export const POST: APIRoute = async (ctx) => {
  const sid = getSessionIdFromContext(ctx);
  let userId: string | null = null;
  if (sid) {
    const session = await prisma.session.findUnique({ where: { id: sid } });
    if (session) userId = session.userId;
  }

  let email: string | null = null;
  if (!userId) {
    const form = await ctx.request.formData();
    email = String(form.get('email') || '').toLowerCase();
  }

  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : await prisma.user.findUnique({ where: { email: email ?? '' } });

  if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
  if (!user.phone) return new Response(JSON.stringify({ error: 'No phone on file' }), { status: 400 });

  const phoneOtp = (Math.floor(100000 + Math.random() * 900000)).toString();
  const phoneOtpExpires = new Date(Date.now() + 1000 * 60 * 10);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneOtp, phoneOtpExpires },
  });

  // Try Twilio first
  const sent = await sendOtpSms(updated.phone!, phoneOtp);

  // Dev convenience: write code
  try {
    mkdirSync('.dev-sms', { recursive: true });
    writeFileSync(join('.dev-sms', 'last-code.txt'), `To: ${user.phone}\nCode: ${phoneOtp}\n`, { encoding: 'utf8' });
    console.log('[DEV] Phone OTP:', phoneOtp);
  } catch {}

  return new Response(null, { status: 204 });
};
