// mailer.js
import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";

// 1. Your Credentials
const TOKEN = "556675116843ef710f731c3c3f65a81e"; // Rotate this token!
const INBOX_ID = 4298683; // Your Inbox ID

// 2. Initialize Nodemailer with the Mailtrap Transport
// This wrapper sends via API (HTTPS), bypassing Render's SMTP blocks.
const transport = nodemailer.createTransport(
  MailtrapTransport({
    token: TOKEN,
    sandbox: true, // This forces it to use the Sandbox API
    testInboxId: INBOX_ID,
  })
);

const sender = {
  address: "admin@attendx.com",
  name: "Attendx Admin",
};

export const sendMail = async (email, otp) => {
  try {
    const info = await transport.sendMail({
      from: sender,
      to: email, // Nodemailer accepts a simple string here
      subject: "Your Attendx Login OTP",
      text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>Login OTP for Attendx</h2>
          <p>Your one-time password (OTP) is:</p>
          <h3 style="color: #2e86de;">${otp}</h3>
          <p>This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
          <p>– Attendx Team</p>
        </div>
      `,
      category: "OTP",
    });

    console.log("OTP email sent successfully. Message ID:", info.messageId);
    return true;
  } catch (err) {
    console.error("Error sending email:", err);
    return false;
  }
};
