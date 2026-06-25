import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserByEmail, createUser, getUserById, updateUser, getAllUsers, hashPassword, deleteUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role');

    let filteredUsers = [];

    if (session.role === 'patient') {
      if (roleFilter === 'doctor') {
        filteredUsers = await getAllUsers('doctor');
      } else if (roleFilter === 'patient') {
        const selfUser = await getUserById(session.id);
        filteredUsers = selfUser ? [selfUser] : [];
      } else {
        const doctors = await getAllUsers('doctor');
        const selfUser = await getUserById(session.id);
        filteredUsers = [...doctors];
        if (selfUser && !filteredUsers.some(u => u.id === selfUser.id)) {
          filteredUsers.push(selfUser);
        }
      }
    } else if (roleFilter) {
      filteredUsers = await getAllUsers(roleFilter);
    } else {
      filteredUsers = await getAllUsers();
    }

    const usersWithoutPasswords = filteredUsers.map(({ password, ...u }) => u);
    return NextResponse.json(usersWithoutPasswords);
  } catch (error) {
    console.error("GET users error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'receptionist')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, email, password, role, profile } = await request.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const newId = `usr-${Math.random().toString(36).substring(2, 9)}`;
    const newUser = {
      id: newId,
      name,
      email: email.toLowerCase(),
      password: hashPassword(password),
      role,
      approved: true, // Accounts created directly by Admin or Receptionist staff are auto-approved
      profile: profile || {},
      createdAt: new Date().toISOString()
    };

    const created = await createUser(newUser);

    const { password: _, ...userWithoutPassword } = created;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("POST users error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, email, profile, approved, role } = await request.json();
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const isAdmin = session.role === 'admin';
    const isReceptionist = session.role === 'receptionist';
    
    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSelf = session.id === id;
    const isReceptionistEditingPatient = isReceptionist && targetUser.role === 'patient';

    if (!isSelf && !isAdmin && !isReceptionistEditingPatient) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email && (isAdmin || isSelf)) updates.email = email.toLowerCase();
    if (profile) {
      updates.profile = {
        ...(targetUser.profile || {}),
        ...profile
      };
    }

    // Only Admin users can approve, suspend, or update roles
    if (approved !== undefined && isAdmin) {
      updates.approved = approved;
    }
    if (role && isAdmin) {
      updates.role = role;
    }

    const updated = await updateUser(id, updates);

    const { password: _, ...userWithoutPassword } = updated;
    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("PUT users error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (id === session.id) {
      return NextResponse.json({ error: 'Cannot delete own account' }, { status: 400 });
    }

    const targetUser = await getUserById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deleted = await deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 550 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error("DELETE users error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
