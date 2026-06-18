import { NextResponse } from 'next/server';
import { getUserByEmail, hashPassword } from '@/lib/db';
import { setSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const hashedPassword = hashPassword(password);
    if (user.password !== hashedPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Enforce Administrator Approval Check
    // If the account exists but has not been confirmed/approved by an Admin, reject the request.
    if (user.approved === false) {
      return NextResponse.json({ 
        error: 'Your staff account is pending administrator approval. Please wait for an administrator to confirm your signup.' 
      }, { status: 403 });
    }

    // Set cookie
    await setSession(user);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
