import { cookies } from 'next/headers';

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('clinic_session');
  if (!sessionCookie) return null;
  try {
    const data = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'));
    return data;
  } catch (e) {
    return null;
  }
}

export async function setSession(user) {
  const cookieStore = await cookies();
  const sessionData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
  const token = Buffer.from(JSON.stringify(sessionData)).toString('base64');
  
  cookieStore.set('clinic_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete('clinic_session');
}
