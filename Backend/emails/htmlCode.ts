export const htmlCode = (email: string, name: string) => {
    const verifyUrl = `${process.env.FRONTEND_URL}/verify-email/${email}`;

    return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <tr>
      <td align="center">
        
        <table width="100%" style="max-width:600px;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);border:1px solid #334155">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #4f46e5, #6366f1);padding:30px 20px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:1px">Project Monitor AI</h1>
              <p style="color:#e2e8f0;margin:5px 0 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px">Intelligent Project Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;text-align:center">
              
              <h2 style="color:#ffffff;margin:0 0 16px 0;font-size:22px;font-weight:600">Welcome, ${name} 👋</h2>
              
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 30px 0">
                Thanks for signing up for Project Monitor AI! Please confirm your email address to activate your account and start tracking your development workflows with powerful AI-driven insights.
              </p>

              <!-- Button -->
              <a href="${verifyUrl}" 
                 style="display:inline-block;padding:14px 36px;background:#6366f1;color:#ffffff;
                 text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;box-shadow:0 4px 12px rgba(99, 102, 241, 0.3);transition:all 0.2s ease">
                 Confirm Email Address
              </a>

              <p style="margin-top:35px;font-size:12px;color:#64748b">
                If you didn’t create an account, you can safely ignore this email.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:24px;text-align:center;font-size:12px;color:#475569;border-top:1px solid #334155">
              © ${new Date().getFullYear()} Project Monitor AI. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
  `;
};

export const otpCode = (name: string, otp: string) => {
    return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <tr>
      <td align="center">
        
        <table width="100%" style="max-width:600px;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px -5px rgba(0,0,0,0.3);border:1px solid #334155">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #4f46e5, #6366f1);padding:30px 20px;text-align:center">
              <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;letter-spacing:1px">Project Monitor AI</h1>
              <p style="color:#e2e8f0;margin:5px 0 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px">Password Security Portal</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 30px;text-align:center">
              
              <h2 style="color:#ffffff;margin:0 0 16px 0;font-size:22px;font-weight:600">Password Reset Request 🔑</h2>
              
              <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 30px 0">
                Hi ${name}, you requested to reset your password. Use the verification code below to complete the security process.
              </p>

              <!-- OTP Box -->
              <div style="display:inline-block;padding:18px 36px;background:#0f172a;border:2px dashed #6366f1;color:#ffffff;
                 border-radius:8px;font-weight:bold;font-size:32px;letter-spacing:8px;margin-bottom:30px;box-shadow:inset 0 2px 4px rgba(0,0,0,0.3)">
                 ${otp}
              </div>

              <p style="color:#64748b;font-size:12px;line-height:1.5;margin:0">
                This verification code is valid for <strong>10 minutes</strong>.<br>
                If you didn’t request this, you can safely ignore this email and your password will remain unchanged.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;padding:24px;text-align:center;font-size:12px;color:#475569;border-top:1px solid #334155">
              © ${new Date().getFullYear()} Project Monitor AI. All rights reserved.
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
  `;
};