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



// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: process.env.EMAIL_PORT || 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   },
//    tls: {
//     rejectUnauthorized: false // ignore self-signed cert in dev
//   }
// });

// export const sendVerificationEmail = async (name, email, token, ip, userAgent) => {
//   try {
//     const link = `${process.env.FRONTEND_URL}/verify-email?token=${token}&email=${email}`;

//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; text-align: center; background-color: #f9f9f9;">
//         <h2 style="color: #333; font-size: 20px; margin-bottom:10px; font-family: 'Times New Roman', Times, serif; font-weight: bold; text-align:left; ">Hi ${name}!</h2>
//         <h2 style="color: #333;">Welcome to NabuTech!</h2>
//         <p style="font-size: 16px; color: #555;">Click the button below to verify your email address.</p>
//         <a href="${link}" style="
//           display: inline-block;
//           padding: 12px 25px;
//           margin: 20px 0;
//           font-size: 16px;
//           color: #fff;
//           background-color: #4CAF50;
//           text-decoration: none;
//           border-radius: 5px;
//         ">Verify Email</a>
//         <p style="font-size: 14px; color: #888;">This link will expire in 10 minutes.</p>
//         <hr/>
//     <p style="font-size: 14px; color: #555;">Registration Details:</p>
//          <ul style="text-align: left; display: inline-block;">
//       <li>Name: ${name}</li>
//       <li>IP Address: ${ip}</li>
//       <li>Device/Browser: ${userAgent}</li>
//       <li>Registered At: ${new Date().toLocaleString()}</li>
//     </ul>
//       </div>
//     `;

//     await transporter.sendMail({
//       from: `"NabuTech" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Verify Your Email",
//       html: htmlContent
//     });

//     console.log(`Verification email sent to ${email}`);
//     return true;
//   } catch (err) {
//     console.error("Email sending failed:", err);
//     throw err;
//   }
// };


// // Login notification email
// export const sendLoginEmail = async (name, email, ip, userAgent) => {
//   try {
//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
//         <h2 style="color: #333; font-size: 20px; margin-bottom:10px;">Hi ${name}!</h2>
//         <p style="font-size: 16px; color: #555;">You have successfully logged in to your NabuTech account.</p>
//         <hr/>
//         <p style="font-size: 14px; color: #555;">Login Details:</p>
//         <ul style="text-align: left; display: inline-block;">
//           <li>Name: ${name}</li>
//           <li>IP Address: ${ip}</li>
//           <li>Device/Browser: ${userAgent}</li>
//           <li>Login At: ${new Date().toLocaleString()}</li>
//         </ul>
//       </div>
//     `;

//     await transporter.sendMail({
//       from: `"NabuTech" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Login Notification",
//       html: htmlContent
//     });

//     console.log(`Login notification email sent to ${email}`);
//     return true;
//   } catch (err) {
//     console.error("Login email sending failed:", err);
//     throw err;
//   }
// };

// // Logout notification email
// export const sendLogoutEmail = async (name, email, ip, userAgent) => {
//   try {
//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
//         <h2 style="color: #333; font-size: 20px; margin-bottom:10px;">Hi ${name}!</h2>
//         <p style="font-size: 16px; color: #555;">You have successfully logged out of your NabuTech account.</p>
//         <hr/>
//         <p style="font-size: 14px; color: #555;">Logout Details:</p>
//         <ul style="text-align: left; display: inline-block;">
//           <li>Name: ${name}</li>
//           <li>IP Address: ${ip}</li>
//           <li>Device/Browser: ${userAgent}</li>
//           <li>Logout At: ${new Date().toLocaleString()}</li>
//         </ul>
//       </div>
//     `;

//     await transporter.sendMail({
//       from: `"NabuTech" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Logout Notification",
//       html: htmlContent
//     });

//     console.log(`Logout notification email sent to ${email}`);
//     return true;
//   } catch (err) {
//     console.error("Logout email sending failed:", err);
//     throw err;
//   }
// };


// export const sendDeleteEmail = async (name, email, ip, userAgent) => {
//   try {
//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px; background-color: #f9f9f9;">
//         <h2 style="color: #333; font-size: 20px; margin-bottom:10px;">Hi ${name}!</h2>
//         <p style="font-size: 16px; color: #555;">Your NabuTech account has been successfully deleted.</p>
//         <hr/>
//         <p style="font-size: 14px; color: #555;">Deletion Details:</p>
//         <ul style="text-align: left; display: inline-block;">
//           <li>Name: ${name}</li>
//           <li>IP Address: ${ip}</li>
//           <li>Device/Browser: ${userAgent}</li>
//           <li>Deleted At: ${new Date().toLocaleString()}</li>
//         </ul>
//         <p style="font-size: 14px; color: #888;">If you did not perform this action, please contact our support immediately.</p>
//       </div>
//     `;

//     await transporter.sendMail({
//       from: `"NabuTech" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Account Deletion Confirmation",
//       html: htmlContent
//     });

//     console.log(`Account deletion email sent to ${email}`);
//     return true;
//   } catch (err) {
//     console.error("Account deletion email sending failed:", err);
//     throw err;
//   }
// };



// utils/sendEmail.js
// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: Number(process.env.EMAIL_PORT),
//    secure: Number(process.env.EMAIL_PORT) === 465,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   tls: { rejectUnauthorized: false },
// });

// export const sendVerificationEmail = async (name, email, ip, userAgent, userId) => {
//   try {
//     const loginLink = `${process.env.FRONTEND_URL}/login`;
//     const auditLink = `${process.env.FRONTEND_URL}/admin/user-details?id=${userId}`;

//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px; text-align:center; background-color:#f9f9f9;">
//         <h2>Hi ${name},</h2>
//         <p>Welcome to NabuTech! Your account has been created and email auto-verified.</p>
//         <p>You can login directly:</p>
//         <a href="${loginLink}" style="display:inline-block; padding:12px 25px; background:#4CAF50; color:#fff; border-radius:5px; text-decoration:none;">Go to Login</a>
//         <hr/>
//         <p><strong>Registration Details:</strong></p>
//         <ul style="text-align:left; display:inline-block;">
//           <li>Name: ${name}</li>
//           <li>Email: ${email}</li>
//           <li>IP Address: ${ip}</li>
//           <li>Device/Browser: ${userAgent}</li>
//           <li>Registered At: ${new Date().toLocaleString()}</li>
//           <li style="margin-top:10px; font-weight:bold; color:#555; font-size:14px; text-align:left; width:100%;">Audit Link: <a href="${auditLink}">View Registration Info</a></li>
//         </ul>
//       </div>
//     `;

//     const info = await transporter.sendMail({
//       from: `"NabuTech" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Welcome to NabuTech - Email Verified",
//       html: htmlContent,
//     });

//     console.log("Welcome/info email sent:", info.response);
//     return true;

//   } catch (err) {
//     console.error("sendVerificationEmail error:", err.message);
//     throw err;
//   }
// };


// utils/sendEmail.js
// import sgMail from "@sendgrid/mail";
// import dotenv from "dotenv";

// dotenv.config();

// // Set SendGrid API Key
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// export const sendVerificationEmail = async (name, email, ip, userAgent, userId) => {
//   try {
//     const loginLink = `${process.env.FRONTEND_URL}/login`;
//     const auditLink = `${process.env.FRONTEND_URL}/admin/user-details?id=${userId}`;

//     const htmlContent = `
//       <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px; text-align:center; background-color:#f9f9f9;">
//         <h2>Hi ${name},</h2>
//         <p>Welcome to NabuTech! Your account has been created and email auto-verified.</p>
//         <p>You can login directly:</p>
//         <a href="${loginLink}" style="display:inline-block; padding:12px 25px; background:#4CAF50; color:#fff; border-radius:5px; text-decoration:none;">Go to Login</a>
//         <hr/>
//         <p><strong>Registration Details:</strong></p>
//         <ul style="text-align:left; display:inline-block;">
//           <li>Name: ${name}</li>
//           <li>Email: ${email}</li>
//           <li>IP Address: ${ip}</li>
//           <li>Device/Browser: ${userAgent}</li>
//           <li>Registered At: ${new Date().toLocaleString()}</li>
//           <li style="margin-top:10px; font-weight:bold; color:#555; font-size:14px; text-align:left; width:100%;">Audit Link: <a href="${auditLink}">View Registration Info</a></li>
//         </ul>
//       </div>
//     `;

//     const msg = {
//       to: email,
//       from: process.env.SENDGRID_FROM_EMAIL, // verified sender
//       subject: "Welcome to NabuTech - Email Verified",
//       html: htmlContent,
//     };

//     const info = await sgMail.send(msg);
//     console.log("Welcome/info email sent successfully:", info);
    
//     return true;
//   } catch (err) {
//    console.error("sendVerificationEmail error:", err.response?.body || err.message);
//     throw new Error(err.response?.body?.errors?.map(e => e.message).join(", ") || err.message);
//   }
// };

import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const sendVerificationEmail = async (to, userId, ip, userAgent) => {
  try {
    const frontendBaseUrl = process.env.FRONTEND_URL;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,       // aapka verified Gmail
        pass: process.env.EMAIL_APP_PASS,   // Gmail App Password
      },
    });

    const mailOptions = {
      from: `"NabuTech Team" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Welcome to NabuTech - Registration Successful",
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px; text-align:center; background-color:#f9f9f9;">
          <h2>Hi ${to.split("@")[0]},</h2>
          <p>Welcome to <strong>NabuTech</strong>! Your account has been successfully created and verified.</p>
          <p>You can login using the button below:</p>
          <a href="${frontendBaseUrl}/login" style="display:inline-block; padding:12px 25px; background:#4CAF50; color:#fff; border-radius:5px; text-decoration:none;">Go to Login</a>
          <hr/>
          <p><strong>Registration Details:</strong></p>
          <ul style="text-align:left; display:inline-block;">
            <li>Email: ${to}</li>
            <li>IP Address: ${ip}</li>
            <li>Device/Browser: ${userAgent}</li>
            <li>Registered At: ${new Date().toLocaleString('en-IN')}</li>
          </ul>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.response);
    return true;
  } catch (err) {
    console.error("sendVerificationEmail error:", err.message);
    throw err;
  }
};






// ===== Send Login Email =====
// ===== Send Login Notification Email =====
export const sendLoginEmail = async (name, email, ip, userAgent) => {
  try {
    const loginTime = new Date().toLocaleString();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px; text-align:center; background-color:#f9f9f9;">
        <h2>Hello ${name},</h2>
        <p>Your NabuTech account was just logged in successfully.</p>
        <p>If this was you, no action is needed. If not, please secure your account immediately.</p>
        <hr/>
        <p><strong>Login Details:</strong></p>
        <ul style="text-align:left; display:inline-block;">
          <li><strong>IP Address:</strong> ${ip}</li>
          <li><strong>Device/Browser:</strong> ${userAgent}</li>
          <li><strong>Login Time:</strong> ${loginTime}</li>
        </ul>
        <p style="margin-top:15px;">Stay safe, <br/> - NabuTech Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"NabuTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: " Login Notification",
      html: htmlContent,
    });

    console.log(`Login notification email sent to ${email}`);
    return true;

  } catch (err) {
    console.error("sendLoginEmail error:", err.message);
    throw err; // optional, handle in login route
  }
};


// ===== Send Logout Email =====
// ===== Send Logout Notification Email =====
export const sendLogoutEmail = async (name, email, ip, userAgent) => {
  try {
    const logoutTime = new Date().toLocaleString();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px; text-align:center; background-color:#f9f9f9;">
        <h2>Hello ${name},</h2>
        <p>Your NabuTech account was just logged out successfully.</p>
        <p>If this wasn’t you, please secure your account immediately.</p>
        <hr/>
        <p><strong>Logout Details:</strong></p>
        <ul style="text-align:left; display:inline-block;">
          <li><strong>IP Address:</strong> ${ip}</li>
          <li><strong>Device/Browser:</strong> ${userAgent}</li>
          <li><strong>Logout Time:</strong> ${logoutTime}</li>
        </ul>
        <p style="margin-top:15px;">Stay safe, <br/> - NabuTech Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"NabuTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "🔔 Logout Notification",
      html: htmlContent,
    });

    console.log(`Logout notification email sent to ${email}`);
    return true;

  } catch (err) {
    console.error("sendLogoutEmail error:", err.message);
    throw err;
  }
};

// ===== Send Account Delete Notification Email =====
export const sendDeleteEmail = async (name, email, ip, userAgent) => {
  try {
    const deleteTime = new Date().toLocaleString();

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; padding:20px; border:1px solid #ddd; border-radius:10px; text-align:center; background-color:#f9f9f9;">
        <h2>Hello ${name},</h2>
        <p>Your NabuTech account has been <strong>deleted</strong>.</p>
        <p>If you did not request this, please contact support immediately.</p>
        <hr/>
        <p><strong>Account Details:</strong></p>
        <ul style="text-align:left; display:inline-block;">
          <li><strong>IP Address:</strong> ${ip}</li>
          <li><strong>Device/Browser:</strong> ${userAgent}</li>
          <li><strong>Time:</strong> ${deleteTime}</li>
        </ul>
        <p style="margin-top:15px;">Stay safe, <br/> - NabuTech Team</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"NabuTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "⚠️ Account Deleted Notification",
      html: htmlContent,
    });

    console.log(`Account delete notification email sent to ${email}`);
    return true;

  } catch (err) {
    console.error("sendDeleteEmail error:", err.message);
    throw err;
  }
};


// ===== Optional: Send OTP Email =====
export const sendOtpEmail = async (email, otp) => {
  try {
    const html = `
      <div>
        <h3>Your OTP is: <strong>${otp}</strong></h3>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `;
    await transporter.sendMail({
      from: `"NabuTech" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP",
      html,
    });
  } catch (err) {
    console.error("sendOtpEmail error:", err.message);
  }
};
