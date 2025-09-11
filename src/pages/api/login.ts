import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db.js';
import { verifyPassword } from '../../lib/crypto.js';
import { createSession, setSessionCookie } from '../../lib/session.js';

export const POST: APIRoute = async (ctx) => {
  const form = await ctx.request.formData();
  const email = String(form.get('email') || '').toLowerCase();
  const password = String(form.get('password') || '');

  const user = await prisma.user.findUnique({
    where: { email },
    include: { keys: true },
  });
  if (!user) return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 400 });

  const key = user.keys.find((k) => k.id === `email:${email}`);
  if (!key?.hashedPassword) return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 400 });

  const ok = await verifyPassword(password, key.hashedPassword);
  if (!ok) return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 400 });

  if (!user.emailVerifiedAt) {
    return new Response(JSON.stringify({ error: 'Email not verified' }), { status: 403 });
  }
  if (!user.phoneVerifiedAt) {
    return new Response(JSON.stringify({ error: 'Phone not verified' }), { status: 403 });
  }

  const sid = await createSession(user.id);
  setSessionCookie(ctx, sid);
  return ctx.redirect(`/profile`);
  // return new Response(null, { status: 204 });
};
