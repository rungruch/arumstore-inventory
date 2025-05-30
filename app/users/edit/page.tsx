"use client";
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from '@/app/firebase/clientApp';
import { User } from '@/app/firebase/interfaces';
import Modal from '@/components/modal';
import { ModalTitle } from '@/components/enum';
import { getPermissionModulesAndActions } from '@/lib/menu-list';
import ProtectedRoute from '@/components/ProtectedRoute';
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from '@/app/firebase/clientApp';

export default function EditUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("uid") || "";
  
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  const permissionModules = getPermissionModulesAndActions();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        setUserData(userDoc.data() as User);
      } else {
        setModalState({
          isOpen: true,
          title: ModalTitle.ERROR,
          message: 'ไม่พบข้อมูลผู้ใช้'
        });
      }
    } catch (error) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: `เกิดข้อผิดพลาด: ${error}`
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (userData) {
      setUserData({
        ...userData,
        [name]: value
      });
    }
  };

  const handlePermissionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    module: string,
    action: string
  ) => {
    if (!userData) return;
    setUserData({
      ...userData,
      permissions: {
        ...userData.permissions,
        [module]: {
          ...userData.permissions[module],
          [action]: e.target.checked
        }
      }
    });
  };

  const handleSave = async () => {
    if (!userData) return;
    
    try {
      setSaving(true);
      
      await updateDoc(doc(db, 'users', userId), {
        displayName: userData.displayName,
        role: userData.role,
        permissions: userData.permissions,
        updated_date: new Date()
      });
      
      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: 'บันทึกการเปลี่ยนแปลงเรียบร้อย'
      });
    } catch (error) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: `เกิดข้อผิดพลาด: ${error}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!userData?.email) return;
    
    try {
      setSendingPasswordReset(true);
      
      await sendPasswordResetEmail(auth, userData.email);
      
      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: 'ส่งอีเมลรีเซ็ตรหัสผ่านเรียบร้อยแล้ว'
      });
    } catch (error) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: `เกิดข้อผิดพลาด: ${error}`
      });
    } finally {
      setSendingPasswordReset(false);
    }
  };

  const closeModal = () => {
    setModalState({...modalState, isOpen: false});
    if (modalState.title === ModalTitle.SUCCESS) {
      router.push('/users');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
        <span className="ml-4 text-gray-500">กำลังโหลด...</span>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="container mx-auto p-5">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          ไม่พบข้อมูลผู้ใช้
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute module='users' action="edit">
    <div className="container mx-auto p-5">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">แก้ไขผู้ใช้งาน</h1>
        <button
          onClick={() => router.push('/users')}
          className="bg-gray-300 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
        >
          กลับ
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 dark:bg-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">อีเมล</label>
            <input
              type="email"
              value={userData.email}
              className="w-full border p-2 rounded-md bg-gray-100 dark:bg-gray-700"
              disabled
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้</label>
            <input
              type="text"
              name="displayName"
              value={userData.displayName}
              onChange={handleChange}
              className="w-full border p-2 rounded-md dark:bg-gray-700 "
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">บทบาท</label>
          <select
            name="role"
            value={userData.role}
            onChange={handleChange}
            className="w-full border p-2 rounded-md dark:bg-gray-700"
          >
            <option value="admin">ผู้ดูแลระบบ</option>
            <option value="manager">ผู้จัดการ</option>
            <option value="staff">พนักงาน</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">รีเซ็ตรหัสผ่าน</label>
          <div className="flex items-center gap-4">
            <button
              onClick={handlePasswordReset}
              disabled={sendingPasswordReset}
              className={`py-2 px-4 rounded-md text-white ${
                sendingPasswordReset 
                  ? "bg-gray-500 cursor-not-allowed" 
                  : "bg-red-600 hover:bg-red-700"
              } transition`}
            >
              {sendingPasswordReset ? "กำลังส่งอีเมล..." : "ส่งอีเมลรีเซ็ตรหัสผ่าน"}
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ระบบจะส่งอีเมลรีเซ็ตรหัสผ่านไปยัง {userData.email}
            </span>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">สิทธิ์การใช้งาน</h2>
          
          {/* Permissions Table */}
            <div className="overflow-x-auto">
            <table className="min-w-full border-collapse bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <thead>
              <tr className="bg-gray-50 dark:bg-gray-700">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">โมดูล</th>
                {permissionModules[0].actions.map(action => (
                <th key={action} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-200">{action}</th>
                ))}
              </tr>
              </thead>
              <tbody>
              {permissionModules.map((mod, index) => (
                <tr key={mod.key} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors`}>
                <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{mod.label}</td>
                {mod.actions.map(action => (
                  <td key={action} className="border border-gray-300 dark:border-gray-600 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={userData.permissions[mod.key]?.[action] || false}
                    onChange={e => handlePermissionChange(e, mod.key, action)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  </td>
                ))}
                </tr>
              ))}
              </tbody>
            </table>
            </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`py-2 px-4 rounded-md text-white ${
              saving ? "bg-gray-500 cursor-not-allowed" : "bg-black hover:bg-gray-800"
            } transition`}
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}