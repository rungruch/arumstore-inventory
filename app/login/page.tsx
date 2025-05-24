"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from '@/app/firebase/clientApp';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getPermissionModulesAndActions } from '@/lib/menu-list';
import { updateLastLogin, createUserDocument, updateUserSession } from '@/lib/auth-utils';
import { useAuth } from '@/app/contexts/AuthContext';
import Image from 'next/image';
import AddUserPopup from '@/components/AddUser'; // Import AddUserPopup component

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false);
    const router = useRouter();
    const { refreshUser } = useAuth();

    // Get default permissions for staff role
    const getDefaultGooglePermissions = () => {
        const permissionModules = getPermissionModulesAndActions();
        const permissions: any = {};

        permissionModules.forEach(mod => {
            permissions[mod.key] = {};
            mod.actions.forEach(action => {
                if (mod.key === "dashboard" && action === "view") {
                    permissions[mod.key][action] = true;
                } else {
                    permissions[mod.key][action] = false;
                }
            });
        });

        return permissions;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            const user = result.user;

            // Update last login timestamp for email/password login
            await updateUserSession(user.uid, { 
              loginMethod: 'email',
              userAgent: navigator.userAgent 
            });
            
            // Track detailed login activity
            const { trackUserActivity } = await import('@/lib/auth-utils');
            await trackUserActivity(user.uid, 'login_success', {
              method: 'email',
              page: '/login',
              browser: navigator.userAgent
            });

            // Refresh AuthContext user data to ensure proper state sync
            await refreshUser();

            router.push('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);
            
            // Track login failure
            try {
              const { trackUserActivity } = await import('@/lib/auth-utils');
              // Use anonymous tracking for failed logins (no uid)
              const errorData = {
                errorCode: error.code || 'unknown_error',
                errorMessage: error.message,
                email: email, // Safe to track email for security monitoring
                page: '/login',
                method: 'email',
                browser: navigator.userAgent
              };
              
              // Use a special collection entry with null user
              await trackUserActivity('anonymous', 'login_failure', errorData);
            } catch (trackingError) {
              console.error('Failed to track login error:', trackingError);
            }

            switch (error.code) {
                case 'auth/invalid-credential':
                case 'auth/wrong-password':
                case 'auth/user-not-found':
                    setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
                    break;
                case 'auth/invalid-email':
                    setError('รูปแบบอีเมลไม่ถูกต้อง');
                    break;
                case 'auth/operation-not-allowed':
                    setError('ระบบการเข้าสู่ระบบด้วยอีเมลและรหัสผ่านยังไม่เปิดใช้งาน');
                    break;
                case 'auth/user-disabled':
                    setError('บัญชีผู้ใช้นี้ถูกระงับการใช้งาน');
                    break;
                case 'auth/too-many-requests':
                    setError('มีการพยายามเข้าสู่ระบบมากเกินไป โปรดลองใหม่ภายหลัง');
                    break;
                case 'auth/network-request-failed':
                    setError('เกิดปัญหาเครือข่าย โปรดตรวจสอบการเชื่อมต่อของคุณ');
                    break;
                default:
                    setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ โปรดลองใหม่อีกครั้ง');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            const provider = new GoogleAuthProvider();
            // Add scopes for better user info
            provider.addScope('profile');
            provider.addScope('email');

            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Validate user email exists
            if (!user.email) {
                throw new Error('Google account must have an email address');
            }

            // Check if user exists in Firestore
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (!userDoc.exists()) {
                // Create new user document with proper default permissions
                const defaultPermissions = getDefaultGooglePermissions();
                
                // Ensure we have a valid displayName
                const displayName = user.displayName && user.displayName.trim().length > 0 
                    ? user.displayName.trim()
                    : user.email.split('@')[0] || 'Google User';

                await createUserDocument({
                    uid: user.uid,
                    email: user.email,
                    displayName: displayName,
                    role: 'staff',
                    permissions: defaultPermissions,
                    provider: 'google'
                });

            } else {
                // Update last login for existing user
                await updateUserSession(user.uid, { 
                  loginMethod: 'google',
                  userAgent: navigator.userAgent 
                });
            }
            
            // Track detailed login activity
            const { trackUserActivity } = await import('@/lib/auth-utils');
            await trackUserActivity(user.uid, 'login_success', {
              method: 'google',
              page: '/login',
              browser: navigator.userAgent,
              email: user.email,
              isNewAccount: !userDoc.exists()
            });

            // Refresh AuthContext user data to ensure proper state sync
            await refreshUser();

            router.push('/dashboard');
        } catch (error: any) {
            console.error('Google login error:', error);
            
            // Track Google login failure
            try {
              const { trackUserActivity } = await import('@/lib/auth-utils');
              const errorData = {
                errorCode: error.code || 'unknown_error',
                errorMessage: error.message,
                page: '/login',
                method: 'google',
                browser: navigator.userAgent
              };
              
              // Use a special collection entry with null user
              await trackUserActivity('anonymous', 'login_failure', errorData);
            } catch (trackingError) {
              console.error('Failed to track login error:', trackingError);
            }

            // Production-ready error handling
            if (error.code) {
                switch (error.code) {
                    case 'auth/popup-closed-by-user':
                        setError('การเข้าสู่ระบบถูกยกเลิก');
                        break;
                    case 'auth/popup-blocked':
                        setError('โปรดอนุญาตให้เบราว์เซอร์เปิด popup window');
                        break;
                    case 'auth/operation-not-allowed':
                        setError('ระบบการเข้าสู่ระบบด้วย Google ยังไม่เปิดใช้งาน');
                        break;
                    case 'auth/cancelled-popup-request':
                        setError('การเข้าสู่ระบบถูกยกเลิก');
                        break;
                    case 'auth/account-exists-with-different-credential':
                        setError('บัญชีนี้มีอยู่แล้วด้วยวิธีการเข้าสู่ระบบอื่น');
                        break;
                    case 'auth/network-request-failed':
                        setError('เกิดปัญหาเครือข่าย โปรดลองใหม่อีกครั้ง');
                        break;
                    case 'auth/too-many-requests':
                        setError('มีการพยายามเข้าสู่ระบบมากเกินไป โปรดลองใหม่ภายหลัง');
                        break;
                    default:
                        setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
                }
            } else {
                // Handle non-Firebase errors
                setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ โปรดลองใหม่อีกครั้ง');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Add the signup popup */}
            <AddUserPopup
                isOpen={isSignUpOpen}
                onClose={() => setIsSignUpOpen(false)}
            />

            <div className="flex flex-col justify-center w-full max-w-md mx-auto p-6">
                <div className="mb-8 text-center">
                    <Image
                        src="/favicon.ico"
                        alt="Arum Logo"
                        width={80}
                        height={80}
                        className="mx-auto w-16 h-16 sm:w-20 sm:h-20"
                        priority
                    />
                    <h1 className="mt-4 text-xl sm:text-2xl font-bold">เข้าสู่ระบบ Arum</h1>
                    <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">ระบบจัดการสินค้าคงคลัง</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium">อีเมล</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium">รหัสผ่าน</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-2 mt-1 border rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={`w-full py-2 px-4 rounded-md text-white ${loading ? 'bg-gray-500' : 'bg-black hover:bg-gray-800'
                            } transition-colors duration-200`}
                        disabled={loading}
                    >
                        {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                    </button>
                </form>

                <div className="mt-4">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-zinc-900 text-gray-500">หรือ</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGoogleSignIn}
                        className={`w-full mt-4 py-2 px-4 rounded-md border border-gray-300 dark:border-gray-600 ${loading
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
                            } transition-colors duration-200 flex items-center justify-center gap-2`}
                        disabled={loading}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        เข้าสู่ระบบด้วย Google
                    </button>
                </div>
            </div>
        </div>
    );
}