import type { APIRoute } from 'astro';
import { prisma } from '../../lib/db.js';
import { clearSessionCookie, getSessionIdFromContext } from '../../lib/session.js';

export const POST: APIRoute = async (ctx) => {
  const sid = getSessionIdFromContext(ctx);
  if (sid) await prisma.session.delete({ where: { id: sid } }).catch(() => {});
  clearSessionCookie(ctx);
  return ctx.redirect('/login');
};
