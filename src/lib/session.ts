import type { APIContext } from 'astro';
import { prisma } from './db.js';
import { randomBytes } from 'crypto';

const SESSION_COOKIE = 'stork_session';
const SESSION_IDLE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const SESSION_ACTIVE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function createSession(userId: string) {
  const id = randomBytes(20).toString('hex');
  const now = Date.now();
  await prisma.session.create({
    data: {
      id,
      userId,
      idleExpires: BigInt(now + SESSION_IDLE_MS),
      activeExpires: BigInt(now + SESSION_ACTIVE_MS),
    },
  });
  return id;
}

export async function getSession(sessionId: string | undefined) {
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!session) return null;
  const now = BigInt(Date.now());
  if (session.idleExpires < now || session.activeExpires < now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session;
}

export function setSessionCookie(ctx: APIContext, sessionId: string) {
  const secure = ctx.url.protocol === 'https:' || process.env.NODE_ENV === 'production';
  ctx.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure,
    maxAge: SESSION_ACTIVE_MS / 1000,
  });
}

export function clearSessionCookie(ctx: APIContext) {
  ctx.cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getSessionIdFromContext(ctx: APIContext): string | undefined {
  return ctx.cookies.get(SESSION_COOKIE)?.value;
}

