import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(_scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const N = 2 ** 15; // CPU/mem cost
  const r = 8;
  const p = 1;
  const keyLen = 64;
  const derived = (await scrypt(password, salt, keyLen)) as Buffer;
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algo, Nstr, rstr, pstr, saltB64, hashB64] = stored.split('$');
    if (algo !== 'scrypt') return false;
    const N = parseInt(Nstr, 10);
    const r = parseInt(rstr, 10);
    const p = parseInt(pstr, 10);
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = (await scrypt(password, salt, expected.length)) as Buffer;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

