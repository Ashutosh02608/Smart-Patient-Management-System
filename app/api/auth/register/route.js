import { NextResponse } from 'next/server';
import { getUserByEmail, createUser, getAllUsers, hashPassword } from '@/lib/db';
import { setSession } from '@/lib/session';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { name, email, password, role, profile, otp } = await request.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Name, email, password, and role are required' }, { status: 400 });
    }

    if (!otp) {
      return NextResponse.json({ error: 'Verification OTP code is required' }, { status: 400 });
    }

    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Verify OTP code
    const cookieStore = await cookies();
    const otpSessionCookie = cookieStore.get('signup_otp_session');
    
    if (!otpSessionCookie) {
      return NextResponse.json({ error: 'Verification session expired or not found. Please request a new OTP.' }, { status: 400 });
    }

    let otpSession;
    try {
      otpSession = JSON.parse(Buffer.from(otpSessionCookie.value, 'base64').toString('utf8'));
    } catch (e) {
      return NextResponse.json({ error: 'Invalid verification session.' }, { status: 400 });
    }

    if (!otpSession || !otpSession.email || !otpSession.otpHash || !otpSession.expiry) {
      return NextResponse.json({ error: 'Invalid verification session structure.' }, { status: 400 });
    }

    // Check if expired
    if (Date.now() > otpSession.expiry) {
      return NextResponse.json({ error: 'OTP code has expired. Please request a new one.' }, { status: 400 });
    }

    // Check email match
    if (otpSession.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'OTP email mismatch. Please try signing up again.' }, { status: 400 });
    }

    // Verify hash
    const expectedHash = crypto.createHash('sha256').update(`${email.toLowerCase()}:${otp}`).digest('hex');
    if (expectedHash !== otpSession.otpHash) {
      return NextResponse.json({ error: 'Incorrect verification code. Please try again.' }, { status: 400 });
    }

    // Delete verification cookie once validated
    cookieStore.delete('signup_otp_session');

    // Check if this is the first user in the database to prevent admin bootstrapping deadlock
    const allUsers = await getAllUsers();
    const isFirstUser = allUsers.length === 0;

    // Staff accounts require approval unless it is the very first system account
    const isStaff = ['admin', 'doctor', 'receptionist'].includes(role);
    const approved = isStaff ? isFirstUser : true;

    const newId = `usr-${Math.random().toString(36).substring(2, 9)}`;
    const hashedPassword = hashPassword(password);

    const newUser = {
      id: newId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      approved,
      profile: profile || (role === 'patient' ? {
        phone: '',
        dob: '',
        gender: 'Not Specified',
        bloodGroup: 'Not Specified',
        allergies: 'None',
        emergencyContact: ''
      } : role === 'doctor' ? {
        specialization: 'General Practice',
        room: 'Cabinet 101',
        phone: ''
      } : {}),
      createdAt: new Date().toISOString()
    };

    const createdUser = await createUser(newUser);

    // Only establish a session if the registered account is pre-approved (e.g. Patients or bootstrapped Admin)
    if (approved) {
      await setSession(createdUser);
      const { password: _, ...userWithoutPassword } = createdUser;
      return NextResponse.json({ success: true, pendingApproval: false, user: userWithoutPassword });
    } else {
      // Return approval pending state response
      return NextResponse.json({ 
        success: true, 
        pendingApproval: true,
        message: 'Account registered successfully. Your staff profile is pending administrator approval before you can sign in.'
      });
    }
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
