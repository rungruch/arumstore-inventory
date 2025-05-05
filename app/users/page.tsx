"use client";
import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '@/app/firebase/clientApp';
import { User } from '@/app/firebase/interfaces';
import AddUserPopup from '@/components/AddNewUser';
import Modal from '@/components/modal';
import { ModalTitle } from '@/components/enum';
import ProtectedRoute from '@/components/ProtectedRoute';

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

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const userCollection = collection(db, 'users');
      const userSnapshot = await getDocs(userCollection);
      const userList = userSnapshot.docs.map(doc => doc.data() as User);
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
    <div className="container mx-auto p-5">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onConfirm={modalState.title === ModalTitle.DELETE ? confirmDelete : undefined}
        title={modalState.title}
        message={modalState.message}
      />
      
      <AddUserPopup isOpen={isAddPopupOpen} onClose={() => setIsAddPopupOpen(false)} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <div>
          <h1 className="text-2xl font-bold">จัดการผู้ใช้งาน</h1>
        </div>
        <button
          onClick={() => setIsAddPopupOpen(true)}
          className="text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition w-full sm:w-auto"
        >
          เพิ่มผู้ใช้งาน
        </button>
      </div>

      {/* User List */}
      {loading ? (
        <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
          <span className="ml-4 text-gray-500">กำลังโหลด...</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden dark:bg-zinc-800">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <thead className="bg-gray-50 dark:bg-zinc-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-zinc-300">
                    ชื่อผู้ใช้
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-zinc-300">
                    อีเมล
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-zinc-300">
                    บทบาท
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-zinc-300">
                    การกระทำ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-zinc-700">
                {users.length === 0 ? (
                  <tr key="no-users">
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-zinc-400">
                      ไม่พบผู้ใช้งาน
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.uid}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.displayName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 dark:text-zinc-400">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                            : user.role === 'manager'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {user.role === 'admin' 
                            ? 'ผู้ดูแลระบบ' 
                            : user.role === 'manager' 
                            ? 'ผู้จัดการ' 
                            : 'พนักงาน'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a 
                          href={`/users/edit?uid=${user.uid}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          แก้ไข
                        </a>
                        <button 
                          onClick={() => handleDeleteUser(user.uid)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          ลบ
                        </button>
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