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
  const [dbError, setDbError] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  const checkDbStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/db-status');
      if (!res.ok) {
        const data = await res.json();
        setDbError(data.error || 'Database is currently offline.');
        return false;
      }
      setDbError(null);
      return true;
    } catch (err) {
      setDbError('Failed to establish a network connection to the database server.');
      return false;
    }
  }, []);

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
      
      checkDbStatus().then((dbOk) => {
        if (!active) return;
        if (!dbOk) {
          setLoading(false);
          return;
        }

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
      });
    }, 0);

    return () => {
      active = false;
    };
  }, [pathname, fetchUser, checkDbStatus, router]);

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

  const register = async (name, email, password, role, otp) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, otp })
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
      {dbError ? (
        <div className="fixed inset-0 z-[9999] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 font-sans text-zinc-100">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 animate-fadeIn relative font-sans">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 text-2xl">
                ⚠️
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Database Offline</h2>
                <p className="text-[10px] text-zinc-500 uppercase font-bold mt-0.5 tracking-wider">System Connection Failure</p>
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2 text-xs text-zinc-400 leading-normal">
              <p className="font-semibold text-zinc-300">Diagnostic Details:</p>
              <p className="font-mono text-[11px] text-rose-305 break-all">{dbError}</p>
              <p className="text-[10px] text-zinc-500 pt-2 border-t border-zinc-850">
                The local database sandbox fallback mode has been disabled. Connection to Supabase is strictly required to launch CarePulse services.
              </p>
            </div>

            <div className="space-y-2 text-[10px] text-zinc-500 leading-relaxed">
              <strong className="text-zinc-400 block font-semibold">Troubleshooting Steps:</strong>
              <ul className="list-disc pl-4 space-y-1">
                <li>Verify your <code className="bg-zinc-950 px-1 py-0.5 rounded font-mono text-[9px] text-cyan-400">.env.local</code> credentials match your Supabase project settings.</li>
                <li>Ensure the local server is connected to the internet.</li>
                <li>Check your Supabase Project Dashboard for system outages.</li>
              </ul>
            </div>

            <button
              onClick={async () => {
                setLoading(true);
                const ok = await checkDbStatus();
                if (ok) {
                  fetchUser();
                } else {
                  setLoading(false);
                }
              }}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-indigo-650 hover:from-rose-400 hover:to-indigo-500 text-white font-bold rounded-2xl text-xs transition-all shadow-lg active:scale-[0.98] cursor-pointer"
            >
              🔄 Retry Connection
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
