"use client";
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '@/app/firebase/clientApp';
import { User } from '@/app/firebase/interfaces';
import AddUserPopup from '@/components/AddNewUser';
import Modal from '@/components/modal';
import { ModalTitle } from '@/components/enum';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/app/contexts/AuthContext';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddPopupOpen, setIsAddPopupOpen] = useState(false);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    userId: ''
  });
  const { hasPermission } = useAuth();

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const userCollection = collection(db, 'users');
      const userSnapshot = await getDocs(userCollection);
      const userList = userSnapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      } as User));
      setUsers(userList);
    } catch (error) {
      console.error("Error fetching users:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: 'เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้',
        userId: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setModalState({
      isOpen: true,
      title: ModalTitle.DELETE,
      message: 'คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?',
      userId
    });
  };

  const confirmDelete = async () => {
    if (!modalState.userId) return;
    
    try {
      await deleteDoc(doc(db, 'users', modalState.userId));
      setUsers(prevUsers => prevUsers.filter(user => user.uid !== modalState.userId));
      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: 'ลบผู้ใช้สำเร็จ',
        userId: ''
      });
    } catch (error) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: `เกิดข้อผิดพลาด: ${error}`,
        userId: ''
      });
    }
  };

  const closeModal = () => {
    setModalState({...modalState, isOpen: false});
  };

  return (
    <ProtectedRoute module='users' action="view">
    <div className="container mx-auto p-3 sm:p-5 min-h-screen bg-gray-50 dark:bg-zinc-900">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.title === ModalTitle.DELETE ? confirmDelete : undefined}
        title={modalState.title}
        message={modalState.message}
      />
      
      <AddUserPopup isOpen={isAddPopupOpen} onClose={() => setIsAddPopupOpen(false)} />

      {/* Enhanced Header Section */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">จัดการผู้ใช้งาน</h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">บริหารจัดการบัญชีผู้ใช้และสิทธิ์การเข้าถึง</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddPopupOpen(true)}
            disabled={!hasPermission('users', 'create')}
            className={`inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 ${
              !hasPermission('users', 'create')
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            เพิ่มผู้ใช้งาน
          </button>
        </div>
      </div>

      {/* Enhanced User List Table */}
      {loading ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-purple-200 dark:border-purple-800 rounded-full animate-spin border-t-purple-600 dark:border-t-purple-400"></div>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-medium">กำลังโหลดข้อมูลผู้ใช้...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-zinc-900/50 border-b border-gray-200 dark:border-zinc-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    ผู้ใช้งาน
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    บทบาท
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-700">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">ไม่พบผู้ใช้งาน</p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">เริ่มต้นโดยการเพิ่มผู้ใช้งานใหม่</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {user.displayName || 'ไม่ระบุชื่อ'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                          user.role === 'admin' 
                            ? 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 dark:from-purple-900/30 dark:to-purple-800/30 dark:text-purple-300' 
                            : user.role === 'manager'
                            ? 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-300'
                            : 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-300'
                        }`}>
                          {user.role === 'admin' 
                            ? 'ผู้ดูแลระบบ' 
                            : user.role === 'manager' 
                            ? 'ผู้จัดการ' 
                            : 'พนักงาน'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          {hasPermission('users', 'edit') && (
                            <a
                              href={`/users/edit?uid=${user.uid}`}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              แก้ไข
                            </a>
                          )}
                          {hasPermission('users', 'delete') && (
                            <button 
                              onClick={() => handleDeleteUser(user.uid)}
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors duration-200"
                            >
                              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              ลบ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
}