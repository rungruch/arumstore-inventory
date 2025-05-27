"use client";
import { useState } from 'react';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; 
import { auth, db } from '@/app/firebase/clientApp';
import Modal from '@/components/modal';
import { ModalTitle } from '@/components/enum';
import { getPermissionModulesAndActions } from '@/lib/menu-list';

interface AddUserPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddUserPopup({ isOpen, onClose }: AddUserPopupProps) {
  const permissionModules = getPermissionModulesAndActions();
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'staff'
  });
  const [permissions, setPermissions] = useState(() => {
    const perms: any = {};
    permissionModules.forEach(mod => {
      perms[mod.key] = {};
      mod.actions.forEach(action => {
        // Default to staff permissions: view/create/edit, excluding users/settings
        if (["view", "create", "edit"].includes(action) && mod.key !== "users" && mod.key !== "settings") {
          perms[mod.key][action] = true;
        } else {
          perms[mod.key][action] = false;
        }
      });
    });
    return perms;
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

    // Auto-check all permissions if role is admin
    if (name === "role" && value === "admin") {
      const perms: any = {};
      permissionModules.forEach(mod => {
        perms[mod.key] = {};
        mod.actions.forEach(action => {
          // Admin gets all permissions including users and settings
          perms[mod.key][action] = true;
        });
      });
      setPermissions(perms);
    }
    // If role is manager, check all view/create/edit/delete but exclude users and settings modules
    else if (name === "role" && value === "manager") {
      const perms: any = {};
      permissionModules.forEach(mod => {
        perms[mod.key] = {};
        mod.actions.forEach(action => {
          if (["view", "create", "edit", "delete"].includes(action) && mod.key !== "users" && mod.key !== "settings") {
            perms[mod.key][action] = true;
          } else {
            perms[mod.key][action] = false;
          }
        });
      });
      setPermissions(perms);
    }
    // If role is staff, check view/create/edit, exclude delete and exclude users/settings modules
    else if (name === "role" && value === "staff") {
      const perms: any = {};
      permissionModules.forEach(mod => {
        perms[mod.key] = {};
        mod.actions.forEach(action => {
          if (["view", "create", "edit"].includes(action) && mod.key !== "users" && mod.key !== "settings") {
            perms[mod.key][action] = true;
          } else {
            perms[mod.key][action] = false;
          }
        });
      });
      setPermissions(perms);
    }
    // Reset permissions for any other/unknown roles
    else if (name === "role" && value !== "admin" && value !== "manager" && value !== "staff") {
      const perms: any = {};
      permissionModules.forEach(mod => {
        perms[mod.key] = {};
        mod.actions.forEach(action => {
          perms[mod.key][action] = false;
        });
      });
      setPermissions(perms);
    }
  };

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setPermissions((prev: any) => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: checked
      }
    }));
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

  const getDefaultPermissions = (role: string) => {
    switch(role) {
      case 'admin':
        return {
          sales: { view: true, create: true, edit: true, delete: true },
          products: { view: true, create: true, edit: true, delete: true },
          customers: { view: true, create: true, edit: true, delete: true },
          purchases: { view: true, create: true, edit: true, delete: true },
          finance: { view: true, create: true, edit: true, delete: true },
          users: { view: true, create: true, edit: true, delete: true }
        };
      case 'manager':
        return {
          sales: { view: true, create: true, edit: true, delete: false },
          products: { view: true, create: true, edit: true, delete: false },
          customers: { view: true, create: true, edit: true, delete: false },
          purchases: { view: true, create: true, edit: true, delete: false },
          finance: { view: true, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false }
        };
      case 'staff':
      default:
        return {
          sales: { view: true, create: true, edit: true, delete: false },
          products: { view: true, create: true, edit: true, delete: false },
          customers: { view: true, create: true, edit: true, delete: false },
          purchases: { view: true, create: true, edit: true, delete: false },
          finance: { view: false, create: false, edit: false, delete: false },
          users: { view: false, create: false, edit: false, delete: false }
        };
    }
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
        role: userData.role,
        permissions: permissions,
        lastLogin: serverTimestamp(),
        created_date: serverTimestamp(),
        updated_date: serverTimestamp()
      });
      
      // Show success notification
      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: 'เพิ่มผู้ใช้สำเร็จ'
      });
      
      // Reset form
      setUserData({
        email: '',
        password: '',
        displayName: '',
        role: 'staff'
      });
      setPermissions(() => {
        const perms: any = {};
        permissionModules.forEach(mod => {
          perms[mod.key] = {};
          mod.actions.forEach(action => {
            // Reset to default staff permissions: view/create/edit, excluding users/settings
            if (["view", "create", "edit"].includes(action) && mod.key !== "users" && mod.key !== "settings") {
              perms[mod.key][action] = true;
            } else {
              perms[mod.key][action] = false;
            }
          });
        });
        return perms;
      });
      
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setValidationError('อีเมลนี้มีผู้ใช้งานแล้ว');
      } else {
        setValidationError('เกิดข้อผิดพลาด: ' + String(error));
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
      role: 'staff'
    });
    onClose();
  };

  const closeModal = () => {
    setModalState({
      ...modalState,
      isOpen: false
    });
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
        className="fixed inset-0 flex items-center justify-center z-50 bg-[#00000066] dark:bg-[#00000099]"
      >
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 sm:mx-6 sm:max-w-lg dark:bg-zinc-800">
          <h2 className="text-lg font-semibold mb-4 text-center">เพิ่มผู้ใช้งาน</h2>

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
              
              <div>
                <label className="block text-sm font-medium mb-1">บทบาท *</label>
                <select
                  name="role"
                  className="w-full border p-2 rounded-md dark:bg-zinc-800 dark:border-zinc-700"
                  value={userData.role}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="staff">พนักงาน</option>
                  <option value="manager">ผู้จัดการ</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">สิทธิ์การใช้งาน</label>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="border px-2 py-1">รายการ</th>
                        {permissionModules[0].actions.map(action => (
                          <th key={action} className="border px-2 py-1 text-center">{action}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {permissionModules.map(mod => (
                        <tr key={mod.key}>
                          <td className="border px-2 py-1">{mod.label}</td>
                          {mod.actions.map(action => (
                            <td key={action} className="border px-2 py-1 text-center">
                              <input
                                type="checkbox"
                                checked={permissions[mod.key]?.[action] || false}
                                onChange={e => handlePermissionChange(mod.key, action, e.target.checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                {isSubmitting ? "กำลังโหลด..." : "บันทึก"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}