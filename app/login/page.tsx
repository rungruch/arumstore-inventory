"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from '@/app/firebase/clientApp';
import Image from 'next/image';
import Link from 'next/link';
import AddUserPopup from '@/components/AddUser'; // Import AddUserPopup component

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUpOpen, setIsSignUpOpen] = useState(false); // State for sign up popup
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        // Update your error handling in handleSubmit:

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/dashboard');
        } catch (error: any) {
            console.error('Login error:', error);

            switch (error.code) {
                case 'auth/invalid-credential':
                    setError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
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
                default:
                    setError('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            }

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

                    <div className="text-right">
                        <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                            ลืมรหัสผ่าน?
                        </Link>
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

                {/* Add sign up section */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        ยังไม่มีบัญชีผู้ใช้งาน?{' '}
                        <button
                            onClick={() => setIsSignUpOpen(true)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium"
                        >
                            สมัครใช้งาน
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}