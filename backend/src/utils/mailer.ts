import nodemailer from "nodemailer";
let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;
export async function sendReceiptEmail(
  to: string,
  subject: string,
  html: string,
  text: string,
) {
  if (!transporter)
    transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      requireTLS: true,
      connectionTimeout: 20000,
      greetingTimeout: 20000,
      socketTimeout: 60000,
      auth: { user: "apikey", pass: process.env.SENDGRID_API_KEY },
    });
  return transporter.sendMail({
    from: `"Eternal Botanic" <${process.env.EMAIL_USER || "noreply@eternalbotanic.com"}>`,
    to,
    subject,
    html,
    text,
  });
}
