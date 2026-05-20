import type { Request, Response } from "express";
import { asyncHandler } from "../middlewares/async-handler.middleware.js";
import { User, type IUser } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { sendEmail, sendResetPasswordEmail } from "../emails/email.js";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
    user?: IUser | null;
}

export const signUp = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 8);

    // Automatically generate a default avatar since the DB schema requires it
    const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name || 'User')}`;

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        avatar: defaultAvatar
    });

    sendEmail(email, name).catch((error) => {
        console.error("sendEmail failed:", error?.message || error);
    });

    res.status(201).json({ message: "SUCCESS", user });
});

export const signIn = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // 1. check fields exist
    if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
    }

    // 2. find user
    const user = await User.findOne({ email }).lean();
    if (!user) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
    }

    // 3. check password FIRST before doing anything else
    const match = await bcrypt.compare(password, user.password as string);
    if (!match) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
    }

    // 4. only reach here if password is correct — sign token
    const token = jwt.sign(
        { userId: user._id, name: user.name, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: "24h" }
    );

    // 5. set cookie
    const isProd = process.env.NODE_ENV !== "development";
    res.cookie("jwt", token, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "strict",
        maxAge: 1 * 24 * 60 * 60 * 1000,
    });

    // 6. send response — one single res.json, not two
    const expiresIn24h = Date.now() + 1 * 24 * 60 * 60 * 1000;
    res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role, // Adjusted to use 'role' instead of isAdmin
        avatar: user.avatar,
        expiresAt: expiresIn24h,
    });
};

export const logOut = asyncHandler(async (req: Request, res: Response) => {
    const isProd = process.env.NODE_ENV !== "development";
    res.cookie("jwt", "", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "strict",
        expires: new Date(0)
    });
    res.status(200).json({ message: "Logged out successfully" });
});

export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    // req.user is populated by protect middleware
    if (req.user) {
        res.status(200).json(req.user);
    } else {
        res.status(404);
        throw new Error("User not found");
    }
});

export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await User.findById(req.user?._id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.password) {
            user.password = await bcrypt.hash(req.body.password, 8);
        }
        if (req.body.avatar) {
            user.avatar = req.body.avatar;
        }

        const updatedUser = await user.save();

        res.status(200).json(updatedUser);
    } else {
        res.status(404);
        throw new Error("User not found");
    }
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.params.id);

    if (user) {
        if (user.role === 'manager') {
            res.status(400);
            throw new Error("Cannot delete manager user");
        }
        await User.deleteOne({ _id: user._id });
        res.status(200).json({ message: "User deleted successfully" });
    } else {
        res.status(404);
        throw new Error("User not found");
    }
});

// Forgot Password Request OTP
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error("User with this email does not exist");
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in user model with 10 minutes expiry
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    // Send reset email
    await sendResetPasswordEmail(email, user.name, otp);

    res.status(200).json({ message: "Password reset OTP sent to your email" });
});

// Verify OTP & Reset Password
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    if (!user.resetOtp || user.resetOtp !== otp || !user.resetOtpExpiry || user.resetOtpExpiry.getTime() < Date.now()) {
        res.status(400);
        throw new Error("Invalid or expired OTP");
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 8);
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
});

// Verify Email
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error("User not found");
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: "Email successfully verified", user });
});
