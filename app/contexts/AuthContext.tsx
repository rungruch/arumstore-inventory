"use client";

import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/app/firebase/clientApp';
import { User } from '@/app/firebase/interfaces';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (module: keyof User['permissions'], action: keyof User['permissions'][keyof User['permissions']]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get the user's document from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          setCurrentUser(userDoc.data() as User);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
        // Redirect to login if not on login page
        if (window.location.pathname !== '/login' && 
            window.location.pathname !== '/forgot-password') {
          router.push('/login');
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [router]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login');
  };

  const hasPermission = (
    module: keyof User['permissions'], 
    action: keyof User['permissions'][keyof User['permissions']]
  ): boolean => {
    if (!currentUser) return false;
    return currentUser.permissions[module][action];
  };

  const value = {
    currentUser,
    loading,
    signIn,
    signOut,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}