'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refresh: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          return data.user;
        }
      }
      setUser(null);
      return null;
    } catch (err) {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    
    // Defer check to satisfy strict linter constraints regarding synchronous state settings
    setTimeout(() => {
      if (!active) return;
      
      fetchUser().then((currentUser) => {
        if (!active) return;
        const publicPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
        const isPublicPath = publicPaths.includes(pathname);

        if (!currentUser) {
          if (!isPublicPath) {
            router.push('/login');
          }
        } else {
          if (isPublicPath && pathname !== '/') {
            router.push(`/${currentUser.role}`);
          } else if (!isPublicPath) {
            const pathRole = pathname.split('/')[1];
            const allowedRoles = ['admin', 'doctor', 'receptionist', 'patient'];
            if (allowedRoles.includes(pathRole) && currentUser.role !== pathRole) {
              router.push(`/${currentUser.role}`);
            }
          }
        }
      });
    }, 0);

    return () => {
      active = false;
    };
  }, [pathname, fetchUser, router]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setUser(data.user);
      router.push(`/${data.user.role}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password, role) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      if (data.pendingApproval) {
        return { success: true, pendingApproval: true };
      }

      setUser(data.user);
      router.push(`/${data.user.role}`);
      return { success: true, pendingApproval: false };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
