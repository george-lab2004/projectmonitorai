import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
import { htmlCode, otpCode } from "./htmlCode.js";

// ✅ Create transporter ONCE (not inside function)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER!,
        pass: process.env.EMAIL_PASS!,
    },
});

// ✅ Optional: verify connection once at startup
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ Email server error:", error);
    } else {
        console.log("✅ Email server is ready");
    }
});

export const sendEmail = async (email: string, name: string) => {
    try {
        // ✅ Basic validation
        if (!email) throw new Error("Email is required");

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Confirm your email - Project Monitor AI",

            // ✅ Fallback for email clients that don't support HTML
            text: `Hi ${name}, please confirm your email: ${process.env.FRONTEND_URL}/verify-email/${email}`,

            html: htmlCode(email, name),
        };

        const info = await transporter.sendMail(mailOptions);

        console.log("📩 Email sent:", info.messageId);

        return info;
    } catch (error) {
        console.error("❌ Failed to send email:", error);
        throw new Error("Email could not be sent");
    }
};

export const sendResetPasswordEmail = async (email: string, name: string, otp: string) => {
    try {
        if (!email) throw new Error("Email is required");

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM}" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Password Reset OTP - Project Monitor AI",
            text: `Hi ${name}, your OTP for password reset is: ${otp}. It will expire in 10 minutes.`,
            html: otpCode(name, otp),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("📩 Reset Email sent:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Failed to send reset email:", error);
        throw new Error("Reset email could not be sent");
    }
};