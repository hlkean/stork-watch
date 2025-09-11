import type { Twilio } from 'twilio';

let twilioClient: Twilio | null = null;
function getTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return null;
  if (!twilioClient) {
    // Dynamic import to avoid SSR issues when not configured
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const TwilioSdk = require('twilio');
    twilioClient = TwilioSdk(sid, token);
  }
  return twilioClient;
}

export async function sendOtpSms(to: string, code: string) {
  const from = process.env.TWILIO_FROM_NUMBER;
  const client = getTwilio();
  if (!client || !from) return false;
  try {
    await client.messages.create({ to, from, body: `Your Stork Watch verification code is ${code}` });
    return true;
  } catch (e) {
    console.error('Twilio send error', e);
    return false;
  }
}

