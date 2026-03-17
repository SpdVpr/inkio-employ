'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  onAuthStateChanged,
  UserProfile,
  subscribeToUserProfile,
  updatePresence
} from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;           // true for both 'admin' and 'payroll_admin'
  isPayrollAdmin: boolean;    // true only for 'payroll_admin'
  isMainAdmin: boolean;       // true only for 'admin' (not payroll)
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isAdmin: false,
  isPayrollAdmin: false,
  isMainAdmin: false,
  loading: true
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to user profile when user is authenticated
  useEffect(() => {
    if (!user) return;

    // Mark as online
    updatePresence(user.uid, true);

    // Subscribe to profile updates
    const unsubscribe = subscribeToUserProfile(user.uid, (profile) => {
      setUserProfile(profile);
      setLoading(false);
    });

    // Handle visibility/tab close
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updatePresence(user.uid, false);
      } else {
        updatePresence(user.uid, true);
      }
    };

    const handleBeforeUnload = () => {
      updatePresence(user.uid, false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'payroll_admin';
  const isPayrollAdmin = userProfile?.role === 'payroll_admin';
  const isMainAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, userProfile, isAdmin, isPayrollAdmin, isMainAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
