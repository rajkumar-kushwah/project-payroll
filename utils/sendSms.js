// utils/sendSms.js
import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendOtpSms = async (to, otp) => {
  try {
    console.log("Sending OTP:", otp, "to:", to);
    const response = await client.messages.create({
      body: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
      from: process.env.TWILIO_PHONE,
      to,
    });
    console.log("Twilio Response:", response.sid);
  } catch (err) {
    console.error("SMS sending failed:", err.message);
  }
};

