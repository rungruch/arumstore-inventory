"use client";
import { useState } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; 
import { auth, db } from '@/app/firebase/clientApp';
import Modal from '@/components/modal';
import { ModalTitle } from '@/components/enum';
import { useRouter } from 'next/navigation';

interface AddUserPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddUserPopup({ isOpen, onClose }: AddUserPopupProps) {
  const router = useRouter();
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    displayName: '',
  });
  
  const [validationError, setValidationError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
    setValidationError('');
  };

  const validateForm = () => {
    if (!userData.email.trim()) {
      setValidationError('กรุณากรอกอีเมล');
      return false;
    }
    if (!userData.password.trim()) {
      setValidationError('กรุณากรอกรหัสผ่าน');
      return false;
    }
    if (userData.password.length < 6) {
      setValidationError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return false;
    }
    if (!userData.displayName.trim()) {
      setValidationError('กรุณากรอกชื่อผู้ใช้');
      return false;
    }
    return true;
  };

  const getDefaultPermissions = () => {
    // Staff permissions by default
    return {
      sales: { view: false, create: false, edit: false, delete: false },
      products: { view: false, create: false, edit: false, delete: false },
      customers: { view: false, create: false, edit: false, delete: false },
      purchases: { view: false, create: false, edit: false, delete: false },
      finance: { view: false, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false }
    };
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setValidationError('');

      // Create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        userData.email, 
        userData.password
      );
      
      // Get the user's UID
      const uid = userCredential.user.uid;
      
      // Create the user document in Firestore
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: userData.email,
        displayName: userData.displayName,
        role: 'staff', // Default role for new users
        permissions: getDefaultPermissions(),
        lastLogin: serverTimestamp(),
        created_date: serverTimestamp(),
        updated_date: serverTimestamp()
      });
      
      // Show success notification
      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: 'สมัครสมาชิกสำเร็จ'
      });
      
      // Reset form
      setUserData({
        email: '',
        password: '',
        displayName: '',
      });
      
    } catch (error: any) {
        console.error('Registration error:', error);
        switch(error.code) {
          case 'auth/email-already-in-use':
            setValidationError('อีเมลนี้มีผู้ใช้งานแล้ว');
            break;
          case 'auth/operation-not-allowed':
            setValidationError('การสมัครผู้ใช้ด้วยอีเมลและรหัสผ่านยังไม่เปิดใช้งาน');
            break;
          case 'auth/weak-password':
            setValidationError('รหัสผ่านไม่ปลอดภัยเพียงพอ');
            break;
          case 'auth/invalid-email':
            setValidationError('รูปแบบอีเมลไม่ถูกต้อง');
            break;
          default:
            setValidationError('เกิดข้อผิดพลาดในการสมัครใช้งาน: ' + error.message);
        }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  const handleClose = () => {
    setValidationError('');
    setUserData({
      email: '',
      password: '',
      displayName: '',
    });
    onClose();
  };

  const closeModal = () => {
    setModalState({
      ...modalState,
      isOpen: false
    });
    
    // If registration was successful, automatically log user in
    if (modalState.title === ModalTitle.SUCCESS) {
      router.push('/dashboard');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
      />
      <div
        id="popup-overlay"
        onClick={(e) => {
          if ((e.target as HTMLElement).id === "popup-overlay") handleClose();
        }}
        className="fixed inset-0 flex items-center justify-center z-50 display-none sm:flex bg-[#00000066] dark:bg-[#00000099]"
      >
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 sm:mx-6 sm:max-w-lg dark:bg-zinc-800">
          <h2 className="text-lg font-semibold mb-4 text-center">สมัครใช้งาน</h2>

          <form onSubmit={handleFormSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ชื่อผู้ใช้ *</label>
                <input
                  type="text"
                  name="displayName"
                  placeholder="ชื่อผู้ใช้"
                  className="w-full border p-2 rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                  value={userData.displayName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">อีเมล *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="อีเมล"
                  className="w-full border p-2 rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                  value={userData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">รหัสผ่าน *</label>
                <input
                  type="password"
                  name="password"
                  placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
                  className="w-full border p-2 rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                  value={userData.password}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {validationError && (
              <p className="text-red-500 text-sm mt-4">{validationError}</p>
            )}

            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="bg-gray-300 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-all"
              >
                ยกเลิก
              </button>
              
              <button
                type="submit"
                className={`py-2 px-4 rounded-md text-white ${
                  isSubmitting
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-black hover:bg-gray-800"
                } transition`}
                disabled={isSubmitting}
              >
                {isSubmitting ? "กำลังโหลด..." : "สมัครใช้งาน"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}