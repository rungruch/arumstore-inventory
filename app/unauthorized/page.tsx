"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/contexts/AuthContext";

export default function UnauthorizedPage() {
  const router = useRouter();
  const { currentUser } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <svg
        className="w-20 h-20 text-red-600 mb-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h1 className="text-3xl font-bold mb-4">การเข้าถึงถูกปฏิเสธ</h1>
      <p className="text-lg text-gray-600 mb-8 max-w-md">
        คุณไม่มีสิทธิ์เข้าถึงหน้านี้ โปรดติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่มเติม
      </p>
      <div className="space-x-4">
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
        >
          ย้อนกลับ
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition"
        >
          ไปที่หน้าหลัก
        </button>
      </div>
    </div>
  );
}