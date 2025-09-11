import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db.js';

export const GET: APIRoute = async ({ url, redirect }) => {
  const token = url.searchParams.get('token') || '';
  if (!token) return new Response('Missing token', { status: 400 });

  const user = await prisma.user.findFirst({ where: { emailVerificationToken: token } });
  if (!user || !user.emailVerificationExpires || user.emailVerificationExpires.getTime() < Date.now()) {
    return new Response('Invalid or expired token', { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpires: null,
    },
  });

  return redirect('/login?emailVerified=1');
};

