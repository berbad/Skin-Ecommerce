import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.sendgrid.net",
  port: 587,
  secure: false,
  auth: {
    user: "apikey",
    pass: process.env.SENDGRID_API_KEY,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter verification failed:", error);
  } else {
    console.log("✅ Email transporter is ready");
  }
});

export const sendReceiptEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  try {
    const fromEmail = process.env.EMAIL_USER || "noreply@eternalbotanic.com";

    console.log("📧 Sending email:", { to, subject, from: fromEmail });

    const info = await transporter.sendMail({
      from: `"Eternal Botanic" <${fromEmail}>`,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent to ${to}:`, info.messageId);
    return info;
  } catch (error: any) {
    console.error(`❌ Email failed to ${to}:`, error.message);
    console.error("Full error:", error);
    throw error;
  }
};
