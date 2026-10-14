import { NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Generate 6-digit OTP code (numeric string between 100000 and 999999)
    const otpVal = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash the OTP combined with email to verify later
    const otpHash = crypto.createHash('sha256').update(`${email.toLowerCase()}:${otpVal}`).digest('hex');
    
    const cookieStore = await cookies();
    
    // Save hashed OTP and email in a short-lived session cookie (10 minutes)
    const sessionData = {
      email: email.toLowerCase(),
      otpHash: otpHash,
      expiry: Date.now() + 10 * 60 * 1000 // 10 minutes from now
    };
    
    const token = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    cookieStore.set('signup_otp_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10, // 10 minutes in seconds
      path: '/'
    });

    console.log(`[CarePulse OTP Service] Code generated for ${email}: ${otpVal}`);

    // SMTP Email configurations
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpUser = process.env.SMTP_USER;
    const rawPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || '';
    const smtpPassword = rawPassword.replace(/\s+/g, ''); // strip any accidental whitespace in app passwords
    const defaultFrom = smtpUser ? `"CarePulse Healthcare" <${smtpUser}>` : '"CarePulse Healthcare" <onboarding@resend.dev>';
    const smtpFrom = process.env.SMTP_FROM || defaultFrom;

    // Beautiful HTML template
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 32px; border-radius: 16px; max-width: 480px; margin: 0 auto; border: 1px solid #27272a;">
        <div style="display: flex; align-items: center; margin-bottom: 24px; font-family: sans-serif;">
          <div style="height: 32px; width: 32px; border-radius: 8px; background: linear-gradient(135deg, #22d3ee, #6366f1); display: inline-flex; align-items: center; justify-content: center; font-weight: bold; color: #09090b; font-size: 14px; text-align: center; line-height: 32px; margin-right: 8px;">CP</div>
          <span style="font-size: 18px; font-weight: bold; color: #ffffff; letter-spacing: -0.025em; line-height: 32px; display: inline-block; vertical-align: middle;">CarePulse</span>
        </div>
        
        <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; color: #ffffff; letter-spacing: -0.025em;">Verify your registration email</h2>
        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
          Thank you for choosing CarePulse. Please use the 6-digit verification code below to verify your email address and complete your signup.
        </p>
        
        <div style="background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: bold; color: #22d3ee; letter-spacing: 6px; margin-left: 6px;">${otpVal}</span>
        </div>
        
        <p style="font-size: 11px; color: #71717a; line-height: 1.6; margin-bottom: 0; border-top: 1px solid #27272a; padding-top: 16px;">
          This code is valid for 10 minutes. If you did not request this verification, you can safely ignore this email.
        </p>
      </div>
    `;

    if (smtpHost && smtpUser && smtpPassword) {
      // User has configured custom SMTP server
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });

        await transporter.sendMail({
          from: smtpFrom,
          to: email.toLowerCase(),
          subject: 'CarePulse Verification Code',
          html: emailHtml,
        });

        console.log(`[CarePulse OTP Service] Sent email via custom SMTP to ${email}`);
      } catch (emailError) {
        console.error("[CarePulse OTP Service] Custom SMTP email sending error:", emailError);
        return NextResponse.json({ 
          error: `Failed to deliver verification email: ${emailError.message}. Please check your SMTP configuration.` 
        }, { status: 500 });
      }
    } else {
      // Offline / Developer Mock Ethereal Fallback
      console.log(`[CarePulse OTP Service] SMTP credentials missing in environment variables. Falling back to local Ethereal account creation.`);
      try {
        // Create an Ethereal test inbox on the fly
        const testAccount = await nodemailer.createTestAccount();
        const testTransporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        const info = await testTransporter.sendMail({
          from: smtpFrom,
          to: email.toLowerCase(),
          subject: 'CarePulse Verification Code (Simulated Test)',
          html: emailHtml,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`[CarePulse OTP Service] Test email sent successfully!`);
        console.log(`[CarePulse OTP Service] ✉️ Clickable Preview URL: ${previewUrl}`);
      } catch (mockError) {
        console.error("[CarePulse OTP Service] Ethereal test email error:", mockError);
      }
    }

    // In development mode, we return the OTP code to display it in a UI testing banner
    const isDev = process.env.NODE_ENV !== 'production';
    
    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent successfully',
      otp: isDev ? otpVal : undefined
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
