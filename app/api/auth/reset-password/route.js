import { NextResponse } from 'next/server';
import { getUserByEmail, updateUser, hashPassword } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, token, password } = await request.json();
    if (!email || !token || !password) {
      return NextResponse.json({ error: 'Email, token, and password are required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json({ error: 'Invalid request: User not found' }, { status: 400 });
    }

    if (!user.resetToken || user.resetToken !== token) {
      return NextResponse.json({ error: 'Invalid reset token' }, { status: 400 });
    }

    if (new Date(user.resetTokenExpiry) < new Date()) {
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 });
    }

    await updateUser(user.id, {
      password: hashPassword(password),
      resetToken: null,
      resetTokenExpiry: null
    });

    return NextResponse.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
