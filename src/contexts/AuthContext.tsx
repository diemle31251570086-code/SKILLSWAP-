import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { 
  auth, 
  getUserProfile, 
  syncOrCreateUserProfile, 
  loginWithGoogle as fbLoginGoogle, 
  loginWithEmail as fbLoginEmail, 
  registerWithEmail as fbRegisterEmail, 
  resetPassword as fbResetPassword, 
  logoutUser, 
  updateUserProfile as fbUpdateProfile,
  SUPER_ADMIN_EMAIL
} from '../services/firebase.ts';
import { UserProfile } from '../types/index.ts';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string, studentId?: string, major?: string, cohort?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (user: User | null) => {
    if (!user) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    try {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        profile = await syncOrCreateUserProfile(
          user.uid,
          user.email || '',
          user.displayName || 'Sinh viên UEH',
          user.photoURL || undefined
        );
      }
      setUserProfile(profile);
    } catch (err) {
      console.error('Failed to load user profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      await fetchProfile(user);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const p = await fbLoginGoogle();
      setUserProfile(p);
    } finally {
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const p = await fbLoginEmail(email, pass);
      setUserProfile(p);
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    studentId?: string, 
    major?: string, 
    cohort?: string
  ) => {
    setLoading(true);
    try {
      const p = await fbRegisterEmail(email, pass, name, studentId, major, cohort);
      setUserProfile(p);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await fbResetPassword(email);
  };

  const logout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setUserProfile(null);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) return;
    await fbUpdateProfile(currentUser.uid, data);
    await refreshProfile();
  };

  const isSuperAdmin = Boolean(
    (currentUser?.email && currentUser.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()) ||
    userProfile?.role === 'superadmin'
  );

  const isAdmin = Boolean(
    isSuperAdmin ||
    userProfile?.role === 'admin'
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isAdmin,
        isSuperAdmin,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        refreshProfile,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
