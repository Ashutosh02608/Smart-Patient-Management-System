import { NextResponse } from 'next/server';
import { getUserByEmail, updateUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: 'If this email is registered, a password reset link will be sent.',
        demoTip: 'Tip: This email was not found in our system. Try admin@clinic.com or register a new account.'
      });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    await updateUser(user.id, {
      resetToken: token,
      resetTokenExpiry: expiry
    });

    const resetLink = `/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    return NextResponse.json({
      success: true,
      message: 'Password reset link generated successfully.',
      resetLink,
      email
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
