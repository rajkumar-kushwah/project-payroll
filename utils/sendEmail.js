// import nodemailer from 'nodemailer';

// export const sendOtpEmail = async (to, otp) => {
//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const mailOptions = {
//     from: `"NabuTech" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: 'Your OTP Code',
//     text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
//   };

//   await transporter.sendMail(mailOptions);
// };


// export const sendOtpEmail = async (to, otp, userId, ip, userAgent, autoVerified = false) => {
//   const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

//   const mailOptions = {
//     from: `"NabuTech" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: autoVerified
//       ? 'Registration Successful & Verified'
//       : 'OTP & Registration Info',
//     html: `
//       <p>Hi ${to},</p>
//       ${
//         autoVerified
//           ? `<p>Your registration is successful and your email is automatically verified.</p>`
//           : `<p>Your OTP code is <b>${otp}</b>. It will expire in 10 minutes.</p>
//              <a href="${frontendBaseUrl}/verify?userId=${userId}">Verify Email</a>`
//       }
//       <hr/>
//       <p>Registration Details:</p>
//       <ul>
//         <li>IP Address: ${ip}</li>
//         <li>Device/Browser: ${userAgent}</li>
//         <li>Registered At: ${new Date().toLocaleString('en-IN')}</li>
//       </ul>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };



import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
   tls: {
    rejectUnauthorized: false // ignore self-signed cert in dev
  }
});

export const sendVerificationEmail = async (name, email, token, ip, userAgent) => {
  try {
    const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; text-align: center; background-color: #f9f9f9;">
        <h2 style="color: #333; font-size: 20px; margin-bottom:10px; font-family: 'Times New Roman', Times, serif; font-weight: bold; text-align:left; ">Hi ${name}!</h2>
        <h2 style="color: #333;">Welcome to NabuTech!</h2>
        <p style="font-size: 16px; color: #555;">Click the button below to verify your email address.</p>
        <a href="${link}" style="
          display: inline-block;
          padding: 12px 25px;
          margin: 20px 0;
          font-size: 16px;
          color: #fff;
          background-color: #4CAF50;
          text-decoration: none;
          border-radius: 5px;
        ">Verify Email</a>
        <p style="font-size: 14px; color: #888;">This link will expire in 10 minutes.</p>
        <hr/>
    <p style="font-size: 14px; color: #555;">Registration Details:</p>
         <ul style="text-align: left; display: inline-block;">
      <li>Name: ${name}</li>
      <li>IP Address: ${ip}</li>
      <li>Device/Browser: ${userAgent}</li>
      <li>Registered At: ${new Date().toLocaleString()}</li>
    </ul>
      </div>
    `;

    await transporter.sendMail({
      from: `"NabuTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify Your Email",
      html: htmlContent
    });

    console.log(`Verification email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("Email sending failed:", err);
    throw err;
  }
};


// Login notification email
export const sendLoginEmail = async (name, email, ip, userAgent) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #333; font-size: 20px; margin-bottom:10px;">Hi ${name}!</h2>
        <p style="font-size: 16px; color: #555;">You have successfully logged in to your NabuTech account.</p>
        <hr/>
        <p style="font-size: 14px; color: #555;">Login Details:</p>
        <ul style="text-align: left; display: inline-block;">
          <li>Name: ${name}</li>
          <li>IP Address: ${ip}</li>
          <li>Device/Browser: ${userAgent}</li>
          <li>Login At: ${new Date().toLocaleString()}</li>
        </ul>
      </div>
    `;

    await transporter.sendMail({
      from: `"NabuTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Login Notification",
      html: htmlContent
    });

    console.log(`Login notification email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("Login email sending failed:", err);
    throw err;
  }
};

// Logout notification email
export const sendLogoutEmail = async (name, email, ip, userAgent) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #333; font-size: 20px; margin-bottom:10px;">Hi ${name}!</h2>
        <p style="font-size: 16px; color: #555;">You have successfully logged out of your NabuTech account.</p>
        <hr/>
        <p style="font-size: 14px; color: #555;">Logout Details:</p>
        <ul style="text-align: left; display: inline-block;">
          <li>Name: ${name}</li>
          <li>IP Address: ${ip}</li>
          <li>Device/Browser: ${userAgent}</li>
          <li>Logout At: ${new Date().toLocaleString()}</li>
        </ul>
      </div>
    `;

    await transporter.sendMail({
      from: `"NabuTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Logout Notification",
      html: htmlContent
    });

    console.log(`Logout notification email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("Logout email sending failed:", err);
    throw err;
  }
};


export const sendDeleteEmail = async (name, email, ip, userAgent) => {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
        <h2 style="color: #333; font-size: 20px; margin-bottom:10px;">Hi ${name}!</h2>
        <p style="font-size: 16px; color: #555;">Your NabuTech account has been successfully deleted.</p>
        <hr/>
        <p style="font-size: 14px; color: #555;">Deletion Details:</p>
        <ul style="text-align: left; display: inline-block;">
          <li>Name: ${name}</li>
          <li>IP Address: ${ip}</li>
          <li>Device/Browser: ${userAgent}</li>
          <li>Deleted At: ${new Date().toLocaleString()}</li>
        </ul>
        <p style="font-size: 14px; color: #888;">If you did not perform this action, please contact our support immediately.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"NabuTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Account Deletion Confirmation",
      html: htmlContent
    });

    console.log(`Account deletion email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("Account deletion email sending failed:", err);
    throw err;
  }
};

