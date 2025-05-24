import { doc, setDoc, serverTimestamp, collection, addDoc, getDoc } from "firebase/firestore";
import { db } from '@/app/firebase/clientApp';

/**
 * Updates the last login timestamp for a user
 * @param uid - The user's Firebase UID
 * @returns Promise that resolves when the update is complete
 */
export async function updateLastLogin(uid: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', uid), {
      lastLogin: serverTimestamp(),
      updated_date: serverTimestamp()
    }, { merge: true });
    
    console.log('Last login updated for user:', uid);
  } catch (error) {
    console.warn('Failed to update last login for user:', uid, error);
    // Don't throw error to avoid blocking login flow
  }
}

/**
 * Creates a new user document with proper timestamps
 * @param userData - User data to create
 * @returns Promise that resolves when the user is created
 */
export async function createUserDocument(userData: {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  permissions: any;
  provider?: string;
}): Promise<void> {
  const baseUserData = {
    uid: userData.uid,
    email: userData.email,
    displayName: userData.displayName,
    role: userData.role,
    permissions: userData.permissions,
    lastLogin: serverTimestamp(),
    created_date: serverTimestamp(),
    updated_date: serverTimestamp(),
    ...(userData.provider && { provider: userData.provider })
  };

  await setDoc(doc(db, 'users', userData.uid), baseUserData);
}

/**
 * Enhanced authentication utilities with comprehensive last login tracking
 */

/**
 * Updates user session information including last login and activity tracking
 * @param uid - The user's Firebase UID
 * @param metadata - Optional metadata to track (e.g., login method, IP, device)
 * @returns Promise that resolves when the update is complete
 */
export async function updateUserSession(
  uid: string, 
  metadata?: {
    loginMethod?: 'email' | 'google' | 'facebook';
    userAgent?: string;
    ipAddress?: string;
  }
): Promise<void> {
  try {
    const updateData: any = {
      lastLogin: serverTimestamp(),
      updated_date: serverTimestamp(),
      lastActive: serverTimestamp()
    };

    if (metadata) {
      updateData.lastLoginMethod = metadata.loginMethod;
      if (metadata.userAgent) updateData.lastUserAgent = metadata.userAgent;
      if (metadata.ipAddress) updateData.lastIpAddress = metadata.ipAddress;
    }

    await setDoc(doc(db, 'users', uid), updateData, { merge: true });
    
    console.log('User session updated for:', uid);
  } catch (error) {
    console.warn('Failed to update user session for:', uid, error);
    // Don't throw error to avoid blocking user experience
  }
}

/**
 * Tracks user activity for session management and creates detailed activity logs
 * @param uid - The user's Firebase UID
 * @param activityType - Type of activity (e.g., page_mount, click_interaction, visibility_change)
 * @param metadata - Additional metadata about the activity (e.g., page, userAgent)
 * @returns Promise that resolves when the activity is tracked
 */
export async function trackUserActivity(
  uid: string, 
  activityType: string = 'page_interaction',
  metadata: any = {}
): Promise<void> {
  try {
    // Update the user document with the latest activity timestamp
    await setDoc(doc(db, 'users', uid), {
      lastActive: serverTimestamp(),
      updated_date: serverTimestamp()
    }, { merge: true });
    
    // Get user information to include in the activity log
    let userEmail = '';
    let displayName = '';
    
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        userEmail = userData.email || '';
        displayName = userData.displayName || '';
      }
    } catch (getUserError) {
      console.warn('Failed to get user info for activity log:', getUserError);
      // Continue even if we can't get the user info
    }
    
    // Create detailed activity log entry
    const activityData = {
      userId: uid,
      email: userEmail,
      displayName: displayName,
      timestamp: serverTimestamp(),
      activityType,
      metadata: {
        ...metadata,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
      }
    };
    
    await addDoc(collection(db, 'activity_logs'), activityData);
    console.log(`Activity logged: ${activityType} for user ${uid}`);
    
  } catch (error) {
    console.warn('Failed to track user activity for:', uid, error);
  }
}