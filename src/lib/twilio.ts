import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client =
  accountSid && authToken ? new Twilio(accountSid, authToken) : null;

export function getTwilioClient() {
  if (!client) {
    throw new Error("Twilio client is not configured");
  }
  return client;
}
