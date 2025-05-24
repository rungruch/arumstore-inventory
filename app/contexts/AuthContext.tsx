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
import { trackUserActivity, updateLastLogin } from '@/lib/auth-utils';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (module: keyof User['permissions'], action: keyof User['permissions'][keyof User['permissions']]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to fetch user data from Firestore with retry logic
  const fetchUserData = async (uid: string, retryCount = 0): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data() as User;
      } else {
        console.warn(`User document not found for uid: ${uid}`);
        return null;
      }
    } catch (error) {
      console.error(`Error fetching user data (attempt ${retryCount + 1}):`, error);
      
      // Retry up to 3 times with exponential backoff
      if (retryCount < 2) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchUserData(uid, retryCount + 1);
      }
      
      return null;
    }
  };

  // Function to refresh current user data
  const refreshUser = async (): Promise<void> => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      setLoading(true);
      try {
        const userData = await fetchUserData(firebaseUser.uid);
        setCurrentUser(userData);
      } catch (error) {
        console.error('Error refreshing user data:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          console.log('Auth state changed: User logged in', firebaseUser.uid);
          
          // Fetch user data from Firestore with retry logic
          const userData = await fetchUserData(firebaseUser.uid);
          setCurrentUser(userData);
          
          // Track auth state change as activity
          await trackUserActivity(firebaseUser.uid, 'auth_state_change', {
            page: typeof window !== 'undefined' ? window.location.pathname : '',
            state: 'logged_in'
          });
          
          if (!userData) {
            console.warn('User authenticated but no Firestore document found');
          }
        } else {
          console.log('Auth state changed: User logged out');
          setCurrentUser(null);
          
          // Redirect to login if not on login page
          if (typeof window !== 'undefined' && 
              window.location.pathname !== '/login' && 
              window.location.pathname !== '/forgot-password') {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Track login activity
      if (userCredential.user) {
        await updateLastLogin(userCredential.user.uid);
        await trackUserActivity(userCredential.user.uid, 'login', {
          page: typeof window !== 'undefined' ? window.location.pathname : '',
          method: 'email'
        });
      }
      
      // Note: onAuthStateChanged will handle fetching user data
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Track logout activity before signing out
      if (currentUser?.uid) {
        await trackUserActivity(currentUser.uid, 'logout', {
          page: typeof window !== 'undefined' ? window.location.pathname : ''
        });
      }
      
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const hasPermission = (
    module: keyof User['permissions'], 
    action: keyof User['permissions'][keyof User['permissions']]
  ): boolean => {
    if (!currentUser) return false;
    // Check if permissions exist at all
    if (!currentUser.permissions) return false;
    // Check if the module exists before trying to access the action
    if (!currentUser.permissions[module]) return false;
    return currentUser.permissions[module][action];
  };

  const value = {
    currentUser,
    loading,
    signIn,
    signOut,
    refreshUser,
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