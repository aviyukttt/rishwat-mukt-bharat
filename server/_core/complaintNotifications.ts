import nodemailer from "nodemailer";

type ComplaintNotificationInput = {
  trackingId: string;
  agencyName: string;
  phone?: string;
  email?: string;
};

function normalizedPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
}

async function sendTextbelt(phone: string, message: string) {
  const response = await fetch("https://textbelt.com/text", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      phone: normalizedPhone(phone),
      message,
      // Textbelt's public key is a limited free/demo gateway. A paid key can be
      // added later through TEXTBELT_KEY without changing this notification flow.
      key: process.env.TEXTBELT_KEY || "textbelt",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success !== true) {
    throw new Error(typeof payload?.error === "string" ? payload.error : "Textbelt delivery failed");
  }
}

async function sendTextBee(phone: string, message: string) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  if (!apiKey) return false;
  const response = await fetch("https://api.textbee.dev/api/v1/gateway/send-sms", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({
      recipients: [normalizedPhone(phone)],
      message,
      ...(process.env.TEXTBEE_DEVICE_ID ? { deviceId: process.env.TEXTBEE_DEVICE_ID } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.data?.success === false) {
    throw new Error(typeof payload?.message === "string" ? payload.message : "TextBee delivery failed");
  }
  return true;
}

export async function sendSmsMessage(phone: string, message: string) {
  if (process.env.TEXTBEE_API_KEY) return sendTextBee(phone, message);
  await sendTextbelt(phone, message);
  return true;
}

async function sendSmtpEmail(to: string, input: ComplaintNotificationInput) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM;
  const port = Number(process.env.SMTP_PORT || "587");
  if (!host || !user || !password || !from) throw new Error("SMTP is not configured");

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass: password },
  });
  await transporter.sendMail({
    from,
    to,
    subject: `Complaint ${input.trackingId} received — Rishwat Mukt Bharat`,
    text: [
      "Your complaint has been received.",
      `Tracking ID: ${input.trackingId}`,
      `Routed toward: ${input.agencyName}`,
      "Keep this tracking ID safe. This prototype portal is not an official Government of India website.",
    ].join("\n"),
  });
}

export async function sendComplaintNotifications(input: ComplaintNotificationInput) {
  const tasks: Promise<unknown>[] = [];
  if (input.phone) {
    tasks.push(sendSmsMessage(input.phone, `Rishwat Mukt Bharat: complaint ${input.trackingId} received and routed toward ${input.agencyName}. Keep this tracking ID safe.`));
  }
  if (input.email) tasks.push(sendSmtpEmail(input.email, input));
  const results = await Promise.allSettled(tasks);
  results.forEach(result => {
    if (result.status === "rejected") console.warn("[Complaint notification] Delivery failed:", result.reason);
  });
  return {
    sms: Boolean(input.phone) && results[0]?.status === "fulfilled",
    email: Boolean(input.email) && results[input.phone ? 1 : 0]?.status === "fulfilled",
  };
}
