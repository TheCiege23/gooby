import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ from, to, subject, html, text }) {
  const { data, error } = await resend.emails.send({
    from: from || "GOOBY <onboarding@resend.dev>",
    to: Array.isArray(to) ? to : [to],
    subject,
    ...(html && { html }),
    ...(text && { text }),
  });
  if (error) throw new Error(error.message);
  return data;
}

export default resend;
