import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db.js';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const email = String(form.get('email') || '').toLowerCase();
  const code = String(form.get('code') || '');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.phoneOtp || !user.phoneOtpExpires) {
    return new Response(JSON.stringify({ error: 'Invalid code' }), { status: 400 });
  }
  if (user.phoneOtp !== code || user.phoneOtpExpires.getTime() < Date.now()) {
    return new Response(JSON.stringify({ error: 'Invalid or expired code' }), { status: 400 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerifiedAt: new Date(), phoneOtp: null, phoneOtpExpires: null },
  });
  return new Response(null, { status: 204 });
};

