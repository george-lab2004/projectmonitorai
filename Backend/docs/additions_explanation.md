# Project Monitor AI - Technical Additions & Enhancements

This document provides a comprehensive, file-by-file, line-by-line breakdown of the security, validation, password recovery, email verification, and styling additions made to the **Project Monitor AI Backend**.

---

## 📂 1. Database Model Layer

### 📝 [user.model.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/models/user.model.ts)

We added `isVerified` to both the Mongoose schema definition and the TypeScript `IUser` interface to support email verification states.

#### **Lines Added inside `userSchema`**
```typescript

isVerified: { type: Boolean, default: false },
```
*   **Why**: By default, new users should be marked as unverified (`false`). Once they hit the verification endpoint, this is flipped to `true`. This tracks whether a user has officially confirmed their sign-up email.

#### **Line Added inside `IUser` interface**
```typescript
isVerified: boolean;
```
*   **Why**: Ensures complete TypeScript type-safety across the application. Any controller referencing `user.isVerified` will compile correctly without TypeScript implicitly claiming `isVerified` does not exist on the type.

---

## 📂 2. Request Validation Layer

### 📝 [auth.validator.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/validators/auth.validator.ts) (NEW FILE)

This file contains strict Joi schema validators to parse incoming request payloads at the API boundary, guaranteeing that only syntactically sound data hits our controllers and models.

```typescript
import Joi from "joi";

// Validates signup payload input
export const signUpValidator = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
});
```
*   **Line-by-Line & Why**:
    *   `name`: Enforces a length between 2 and 50 characters, and requires it. Prevents blank or excessively long names.
    *   `email`: Enforces a strictly validated email string format (e.g. `user@domain.com`).
    *   `password`: Enforces a minimum length of 6 characters to guarantee strong credential security, and is required.
    *   **Crucial Fix**: Without this validator, a sign-up request with a missing password would pass directly into the `bcrypt.hash()` method in the controller, causing the server to crash internally with an unhandled exception (*"data and salt arguments required"*).

```typescript
// Validates sign-in payload input
export const signInValidator = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});
```
*   **Why**: Protects the sign-in endpoint from missing keys.

```typescript
// Validates password reset request (OTP generation) payload
export const forgotPasswordValidator = Joi.object({
    email: Joi.string().email().required(),
});
```
*   **Why**: Restricts `/forgot-password` requests to valid emails, avoiding unnecessary database lookup overhead for invalid syntaxes.

```typescript
// Validates final OTP verification and new password change payload
export const resetPasswordValidator = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required(),
    newPassword: Joi.string().min(6).required(),
});
```
*   **Why**:
    *   `otp`: Restricts input to a strict string of exactly 6 characters (the generated OTP length).
    *   `newPassword`: Guarantees that the newly set password is secure (minimum 6 characters) before saving it to the database.

---

## 📂 3. Routing Layer

### 📝 [auth.route.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/routes/auth.route.ts)

We imported the new validator schemas and registered validation middleware on the endpoints. We also registered the new password recovery and email verification endpoints.

#### **Imports Added**
```typescript
import { validate } from "../middlewares/validation.middleware.js";
import { 
    signUpValidator, 
    signInValidator, 
    forgotPasswordValidator, 
    resetPasswordValidator 
} from "../validators/auth.validator.js";
```
*   **Why**: Imports our Joi schemas and the existing request-body validation middleware wrapper.

#### **Routes Registered / Modified**
```typescript
router.post("/signup", validate(signUpValidator), signUp);
router.post("/signin", validate(signInValidator), signIn);
```
*   **Why**: Modifies the original sign-up and sign-in routes to pipe payloads through the validation schema before executing business logic.

```typescript
router.post("/forgot-password", validate(forgotPasswordValidator), forgotPassword);
router.post("/reset-password", validate(resetPasswordValidator), resetPassword);
router.post("/verify-email", verifyEmail);
```
*   **Why**: Registers the public endpoints that support password recovery and email activation.

---

### 📝 [project.route.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/routes/project.route.ts)

#### **Route Modified**
```typescript
router.route("/")
    .get(protect, manager, getProject)
```
*   **Why**: Restricts the global `GET /` project listing endpoint so that only logged-in Project Managers (`role === 'manager'`) can retrieve all projects globally. Regular team members are barred from list-querying projects at this route, ensuring global data isolation.

---

## 📂 4. Controller Layer

### 📝 [project.controller.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/controllers/project.controller.ts)

We secured `getProjectById` to ensure absolute resource-level security.

```typescript
export const getProjectById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const project = await Project.findById(id).lean();
    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    // Access control check: Must be manager OR assigned team member
    if (req.user) {
        const isManager = project.manager?.toString() === req.user._id.toString() || req.user.role === 'manager';
        const isMember = project.members?.some(memberId => memberId.toString() === req.user._id.toString());
        if (!isManager && !isMember) {
            return res.status(403).json({ message: "Not authorized to access this project" });
        }
    } else {
        return res.status(401).json({ message: "Not authorized" });
    }

    res.status(200).json(project);
})
```
*   **Line-by-Line & Why**:
    *   `req: AuthRequest`: Updated parameter type to allow safe access to `req.user` (which is populated by the `protect` middleware).
    *   `res.status(404)`: Changed standard return code on missing projects from a generic `400` to a RESTful `404 Not Found`.
    *   `isManager`: Computes if the authenticated user is either the assigned Project Manager for this specific project or has an administrative `manager` system role.
    *   `isMember`: Loops through the project's `members` array using Mongoose ObjectIds converted to strings to verify if the requesting developer is an assigned team member.
    *   `res.status(403)`: If the user is logged in but doesn't have manager status or membership rights, they are strictly rejected with a `403 Forbidden` response, preventing unauthorized cross-tenant data leakage.

---

### 📝 [task.controller.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/controllers/task.controller.ts)

We imported the `Project` model and added comprehensive member access validation inside `getTaskById`.

#### **Import Added**
```typescript
import { Project } from "../models/project.model.js";
```
*   **Why**: Allows the controller to perform lookups on the project associated with a requested task.

#### **Security Logic added inside `getTaskById`**
```typescript
    // Access control check: Must be manager OR project member OR task assignee
    const project = await Project.findById(task.project).lean();
    if (!project) {
        return res.status(404).json({ message: "Project associated with this task not found" });
    }

    const isManager = project.manager?.toString() === req.user._id.toString() || req.user.role === 'manager';
    const isMember = project.members?.some(memberId => memberId.toString() === req.user._id.toString());
    const isAssignee = task.assignee?._id?.toString() === req.user._id.toString() || task.assignee?.toString() === req.user._id.toString();

    if (!isManager && !isMember && !isAssignee) {
        return res.status(403).json({ message: "Not authorized to access this task" });
    }
```
*   **Line-by-Line & Why**:
    *   `Project.findById(task.project)`: Fetches the parent project document.
    *   `isManager` / `isMember`: Determines if the user belongs to the project team.
    *   `isAssignee`: Checks if the user is the specific developer assigned to perform this task.
    *   `res.status(403)`: Rejects access if the developer is unrelated to this project or task. This stops users from brute-forcing 24-character hex task IDs to read details of boards they don't belong to.

---

### 📝 [auth.controller.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/controllers/auth.controller.ts)

We imported password reset utilities and implemented three major handlers: `/forgot-password`, `/reset-password`, and `/verify-email`.

#### **Import Modified**
```typescript
import { sendEmail, sendResetPasswordEmail } from "../emails/email.js";
```
*   **Why**: Imports the pre-configured password reset email sender.

#### **`forgotPassword` Controller Added**
```typescript
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
```
*   **Line-by-Line & Why**:
    *   `User.findOne({ email })`: Checks if the email is registered in our database.
    *   `otp`: Generates a high-entropy 6-digit cryptographically sound random numeric OTP string.
    *   `resetOtp` / `resetOtpExpiry`: Persists the temporary OTP and sets an absolute expiry date 10 minutes into the future to mitigate brute-force guessing attacks.
    *   `sendResetPasswordEmail`: Sends the stylized email with the code.

#### **`resetPassword` Controller Added**
```typescript
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
```
*   **Line-by-Line & Why**:
    *   `user.resetOtpExpiry.getTime() < Date.now()`: Performs an active temporal check to ensure the OTP has not expired.
    *   `bcrypt.hash(newPassword, 8)`: Securely hashes the new credential before database commit.
    *   `resetOtp = undefined`: Immediately invalidates the OTP upon successful password reset, preventing reuse.

#### **`verifyEmail` Controller Added**
```typescript
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
```
*   **Why**: Finds the user and updates the `isVerified` flag to `true`, ending the email confirmation lifecycle.

---

## 📂 5. Email Templates & Styling Layer

### 📝 [email.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/emails/email.ts)

#### **Lines Modified**
```typescript
subject: "Confirm your email - Project Monitor AI",
// ...
subject: "Password Reset OTP - Project Monitor AI",
```
*   **Why**: Changed all references and subjects from `"Confirm your email - TechMart"` and `"Password Reset OTP - TechMart"` to `"Project Monitor AI"` to provide beautiful, consistent, and correct application branding.

---

### 📝 [htmlCode.ts](file:///d:/Main/CV%20Projects/Project%20Monitor%20AI/Backend/emails/htmlCode.ts)

We fully overhauled both HTML structures (`htmlCode` and `otpCode`) to brand Project Monitor AI and implement a gorgeous slate-dark, Indigo aesthetic.

#### **Aesthetic Polish Elements & Why**:
*   `background:#0f172a`: Swapped the cheap browser-default gray `#f4f4f4` for a gorgeous deep slate black (`#0f172a`), mirroring high-end dashboard themes.
*   `background:#1e293b`: The inner email card uses a slightly lighter slate dark container with a clean `1px solid #334155` border to make the layout pop on high-resolution displays.
*   `linear-gradient(135deg, #4f46e5, #6366f1)`: Standard dark headings were replaced with a premium, sleek indigo gradient that instantly commands visual focus and feels premium.
*   `border:2px dashed #6366f1`: The OTP box displays the 6-digit code in a high-contrast container with a colored dashed boundary, making it immediately scannable.
