import Twilio from "twilio";

let client = null;

function getClient() {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error("TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required");
    if (!sid.startsWith("AC")) throw new Error("TWILIO_ACCOUNT_SID must start with 'AC'. Please check your Twilio credentials.");
    client = Twilio(sid, token);
  }
  return client;
}

const fromNumber = process.env.TWILIO_PHONE_NUMBER;

export async function sendSMS(to, body) {
  const twilioClient = getClient();
  const message = await twilioClient.messages.create({
    body,
    from: fromNumber,
    to,
  });
  return { sid: message.sid, status: message.status };
}

export { getClient };
