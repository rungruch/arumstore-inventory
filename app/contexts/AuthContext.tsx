"use client";

import { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/app/firebase/clientApp';
import { User } from '@/app/firebase/interfaces';
import { useRouter, usePathname } from 'next/navigation';
import { trackUserActivity, updateLastLogin } from '@/lib/auth-utils';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (module: keyof User['permissions'], action: keyof User['permissions'][keyof User['permissions']]) => boolean;
  isPublicPage: (path: string) => boolean;
}

// Define public pages that don't require authentication
const PUBLIC_PAGES = [
  '/tracking',
  '/login',
  '/forgot-password'
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());
  const router = useRouter();
  const pathname = usePathname();

  // Function to check if a page is public
  const isPublicPage = (path: string): boolean => {
    return PUBLIC_PAGES.includes(path);
  };

  // Function to fetch user data from Firestore with retry logic and caching
  const fetchUserData = async (uid: string, retryCount = 0): Promise<User | null> => {
    // Check cache first
    if (userCache.has(uid)) {
      return userCache.get(uid)!;
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        // Cache the user data
        setUserCache(prev => new Map(prev).set(uid, userData));
        return userData;
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
          setCurrentUser(null);
          
          // Only redirect to login if not on a public page
          if (typeof window !== 'undefined' && !isPublicPage(window.location.pathname)) {
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

  const value = useMemo(() => ({
    currentUser,
    loading,
    signIn,
    signOut,
    refreshUser,
    hasPermission,
    isPublicPage
  }), [currentUser, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Optimized hook for just checking if user is authenticated (boolean)
export function useIsAuthenticated() {
  const { currentUser } = useAuth();
  return useMemo(() => !!currentUser, [currentUser]);
}

// Optimized hook for permission checks
export function usePermissions() {
  const { currentUser, hasPermission } = useAuth();
  return useMemo(() => ({
    hasPermission,
    isAdmin: currentUser?.role === 'admin',
    permissions: currentUser?.permissions
  }), [currentUser, hasPermission]);
}