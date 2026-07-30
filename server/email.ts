import { Resend } from 'resend';

export interface EmailResult {
  success: boolean;
  devMode?: boolean;
  error?: string;
}

export async function sendVerificationEmail(to: string, name: string, code: string): Promise<EmailResult> {
  // Read env variables dynamically at call-time so dotenv.config() has already executed
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'TradeMind AI <onboarding@resend.dev>';

  const hasValidApiKey = Boolean(
    resendApiKey && 
    !resendApiKey.includes('placeholder') && 
    resendApiKey.trim().length > 0
  );

  console.log(`[EMAIL SERVICE] sendVerificationEmail invoked for recipient: ${to}`);
  console.log(`[EMAIL SERVICE] RESEND_API_KEY present: ${hasValidApiKey} | From Address: ${fromAddress}`);

  const subject = `${code} is your TradeMind AI verification code`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>TradeMind AI Email Verification</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0c10; color: #e0e6ed; margin: 0; padding: 0; }
        .container { max-width: 560px; margin: 40px auto; background-color: #12141c; border: 1px solid #1f2430; border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .logo { font-size: 20px; font-weight: 800; color: #3b82f6; letter-spacing: -0.5px; margin-bottom: 24px; text-transform: uppercase; }
        .logo span { color: #ffffff; }
        h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
        p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
        .code-container { background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(99,102,241,0.1)); border: 1px solid rgba(59,130,246,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
        .code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; margin: 0; }
        .footer { font-size: 12px; color: #64748b; border-t: 1px solid #1f2430; padding-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">TradeMind <span>AI</span></div>
        <h1>Verify your email address</h1>
        <p>Hello ${name || 'Trader'}, welcome to TradeMind AI terminal. Please enter the following 6-digit code to complete your security verification and activate your account:</p>
        
        <div class="code-container">
          <div class="code">${code}</div>
        </div>

        <p>This verification code will expire in <strong>15 minutes</strong>. If you did not request this registration, please ignore this message.</p>

        <div class="footer">
          &copy; ${new Date().getFullYear()} TradeMind AI Quantitative Intelligence Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `TradeMind AI - Email Verification\n\nHello ${name || 'Trader'},\n\nYour 6-digit verification code is: ${code}\n\nThis code will expire in 15 minutes.\n\nTradeMind AI Quantitative Platform`;

  console.log(`\n================================================================`);
  console.log(`=== VERIFICATION CODE for ${to}: ${code} (expires in 15 min) ===`);
  console.log(`================================================================\n`);

  // Bypass Resend API calls for now as requested; keep code below preserved for future activation
  const BYPASS_RESEND_API = true;
  if (BYPASS_RESEND_API || !hasValidApiKey) {
    return { success: true, devMode: true };
  }

  const resend = new Resend(resendApiKey);

  try {
    console.log(`[Resend API Call] Sending email to ${to} via Resend...`);
    
    let result = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
    }) as { data?: { id?: string } | null; error?: any };

    console.log(`[Resend API Response]:`, JSON.stringify(result));

    if (result.error) {
      console.error(`[Resend Error] Primary send attempt failed for ${to}:`, result.error);
      console.log(`[Resend API Retry] Retrying sendVerificationEmail for ${to}...`);

      // Retry once
      result = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject,
        html: htmlContent,
        text: textContent,
      }) as { data?: { id?: string } | null; error?: any };

      console.log(`[Resend API Retry Response]:`, JSON.stringify(result));

      if (result.error) {
        const errorMsg = typeof result.error === 'object' ? JSON.stringify(result.error) : String(result.error);
        console.error(`[Resend Error] Retry attempt also failed for ${to}:`, errorMsg);
        console.log(`\n=== DEV FALLBACK: Verification code for ${to} is ${code} ===\n`);
        return { success: false, devMode: false, error: errorMsg };
      }
    }

    console.log(`[Resend Success] Sent verification email to ${to} (ID: ${result.data?.id})`);
    return { success: true, devMode: false };
  } catch (err) {
    const errString = err instanceof Error ? err.message : String(err);
    console.error(`[Resend Exception] Unexpected error sending email to ${to}:`, err);
    console.log(`\n=== DEV FALLBACK: Verification code for ${to} is ${code} ===\n`);
    return { success: false, devMode: false, error: errString };
  }
}

