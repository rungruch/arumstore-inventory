"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ChevronLeft, Edit3, Trash } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { EditContactPopup } from "@/components/AddContact";
import { Contact } from "@/app/firebase/interfaces";
import { getSellTransactionsByClientId, deleteContact } from "@/app/firebase/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/clientApp";
import Link from "next/link";

export default function ContactDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Sales summary states
  const [todaySales, setTodaySales] = useState(0);
  const [monthlySales, setMonthlySales] = useState(0);
  const [yearlySales, setYearlySales] = useState(0);
  const [pendingAmount, setPendingAmount] = useState(0);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  // Fetch contact details and transactions
  useEffect(() => {
    const fetchContactDetails = async () => {
      setIsLoading(true);
      try {
        // Get contact by ID directly from Firestore
        const contactRef = doc(db, "contacts", contactId);
        const contactSnap = await getDoc(contactRef);
        
        if (!contactSnap.exists()) {
          throw new Error("ไม่พบข้อมูลผู้ติดต่อ");
        }
        
        const contactData = {
          id: contactSnap.id,
          ...contactSnap.data()
        } as unknown as Contact;
        
        setContact(contactData);

        try {
          const clientId = contactData.client_id;
          if (clientId) {
            // This function needs to be implemented or replaced with your actual function
            // that gets transactions for a specific contact
            const contactTransactions:any = await getSellTransactionsByClientId(clientId);
            console.log("Fetched transactions:", contactTransactions);
            setTransactions(contactTransactions || []);
            
            // Calculate sales metrics from transactions
            if (contactTransactions && contactTransactions.length > 0) {
              // Get today's date
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              
              // Get first day of current month
              const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
              
              // Get first day of current year
              const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
              
              // Initialize counters
              let todaySalesTotal = 0;
              let monthlySalesTotal = 0;
              let yearlySalesTotal = 0;
              let pendingOrdersTotal = 0;
              
            interface Transaction {
                transaction_id: string;
                created_date: { toDate: () => Date };
                total_amount?: number;
                status: 'COMPLETED' | 'PENDING' | 'CANCELLED' | string;
            }

            const contactTransactionsTyped: Transaction[] = contactTransactions;

            contactTransactionsTyped.forEach((transaction: Transaction) => {
                const transactionDate: Date | undefined = transaction.created_date?.toDate();
                const amount: number = transaction.total_amount || 0;
                
                // Skip cancelled transactions
                if (transaction.status === 'CANCELLED') return;
                
                // Add to pending amount if status is pending
                if (transaction.status === 'PENDING') {
                    pendingOrdersTotal += amount;
                }
                
                if (transactionDate) {
                    // Today's sales (transactions created today)
                    if (transactionDate >= today) {
                        todaySalesTotal += amount;
                    }
                    
                    // Monthly sales (transactions created this month)
                    if (transactionDate >= firstDayOfMonth) {
                        monthlySalesTotal += amount;
                    }
                    
                    // Yearly sales (transactions created this year)
                    if (transactionDate >= firstDayOfYear) {
                        yearlySalesTotal += amount;
                    }
                }
            });
              
              // Update state with calculated values
              setTodaySales(todaySalesTotal);
              setMonthlySales(monthlySalesTotal);
              setYearlySales(yearlySalesTotal);
              setPendingAmount(pendingOrdersTotal);
            }
          }
        } catch (transactionErr) {
          console.error("Error fetching transactions:", transactionErr);
          // We don't set the main error here to still show the contact info
        }
      } catch (err) {
        console.error("Error fetching contact details:", err);
        setError("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ติดต่อ");
      } finally {
        setIsLoading(false);
      }
    };

    if (contactId) {
      fetchContactDetails();
    }
  }, [contactId, refreshTrigger]);

  // Handle contact deletion
  const handleDeleteContact = async () => {
    try {
      await deleteContact(contactId);
      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: "ลบผู้ติดต่อเรียบร้อยแล้ว",
      });
      
      // Redirect to contacts page after successful deletion
      setTimeout(() => {
        router.push("/contacts");
      }, 1500);
    } catch (error) {
      console.error("Error deleting contact:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: "เกิดข้อผิดพลาดในการลบผู้ติดต่อ",
      });
    }
    setDeleteModalOpen(false);
  };

  // Close any open modal
  const closeModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // Refresh contact data after edit
  const handleEditSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    return new Date(timestamp.toDate()).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-5 flex justify-center items-center h-[70vh]">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
          <span className="mt-4 text-gray-500">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-5 flex justify-center items-center h-[70vh]">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">เกิดข้อผิดพลาด! </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <ProtectedRoute module='customers' action="view">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
      />
      
      <EditContactPopup
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        contact={contact}
        onSuccess={handleEditSuccess}
      />
      
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={ModalTitle.DELETE}
        message={`คุณต้องการลบผู้ติดต่อ ${contact?.name} ใช่หรือไม่?`}
        onConfirm={handleDeleteContact}
      />
      
      <div className="container mx-auto p-5">
        {/* Header with back button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => router.back()}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-2xl font-bold">รายละเอียดผู้ติดต่อ</h1>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setEditModalOpen(true)}
              className="py-2 px-4 bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center text-sm font-medium border border-gray-200 dark:border-zinc-700"
            >
              <Edit3 size={16} className="mr-2" />
              แก้ไข
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="py-2 px-4 bg-white dark:bg-zinc-800 text-gray-600 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center text-sm font-medium border border-gray-200 dark:border-zinc-700"
            >
              <Trash size={16} className="mr-2" />
              ลบ
            </button>
          </div>
        </div>
        
        {/* Sales Summary Cards */}
        {contact && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Today's Sales */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">ยอดขายวันนี้</div>
                  <div className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                    ฿{todaySales.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Monthly Sales */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">ยอดขายเดือนนี้</div>
                  <div className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                    ฿{monthlySales.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Yearly Sales */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">ยอดขายปีนี้</div>
                  <div className="mt-1 text-2xl font-semibold text-purple-600 dark:text-purple-400">
                    ฿{yearlySales.toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Pending Orders */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-zinc-700">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">คำสั่งซื้อที่รอดำเนินการ</div>
                  <div className="mt-1 text-2xl font-semibold text-amber-600 dark:text-amber-400">
                    ฿{pendingAmount.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Contact Information */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-2">ข้อมูลทั่วไป</h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อ</label>
                      <div className="mt-1 text-lg">{contact.name}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">รหัส</label>
                      <div className="mt-1 text-lg">{contact.client_id}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">วันที่สร้าง</label>
                      <div className="mt-1">{formatDate(contact.created_date)}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อัปเดตล่าสุด</label>
                      <div className="mt-1">{formatDate(contact.updated_date)}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-2">ข้อมูลการติดต่อ</h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ผู้ติดต่อ</label>
                      <div className="mt-1">{contact.contact_info?.name || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เบอร์มือถือ</label>
                      <div className="mt-1">{contact.contact_info?.phone || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เบอร์บ้าน</label>
                      <div className="mt-1">{contact.contact_info?.home_phone || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">อีเมล</label>
                      <div className="mt-1">{contact.contact_info?.email || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">แฟกซ์</label>
                      <div className="mt-1">{contact.contact_info?.fax || "-"}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-2">ข้อมูลภาษี</h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เลขประจำตัวผู้เสียภาษี</label>
                      <div className="mt-1">{contact.tax_reference?.tax_id || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">ชื่อสาขา</label>
                      <div className="mt-1">{contact.tax_reference?.branch_name || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">เลขที่สาขา</label>
                      <div className="mt-1">{contact.tax_reference?.branch_number || "-"}</div>
                    </div>
                  </div>
                </div>
                
                {transactions.length > 0 && (
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">ประวัติการทำรายการขาย</h2>
                    
                    <div
                        className="overflow-x-auto"
                        style={{
                            maxHeight: "480px", // 10 rows * ~48px per row
                            overflowY: "auto",
                        }}
                    >
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-zinc-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">วันที่</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">รายการ</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">มูลค่า</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">สถานะ</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-gray-700">
                                {transactions.map((transaction) => (
                                    <tr key={transaction.transaction_id} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {formatDate(transaction.created_date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                                {transaction.transaction_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            ฿{transaction.total_amount?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                                transaction.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {transaction.status === 'COMPLETED' ? 'เสร็จสมบูรณ์' :
                                                 transaction.status === 'PENDING' ? 'รอดำเนินการ' :
                                                 'ยกเลิก'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}
              </div>
              
              {/* Right sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-2">ที่อยู่</h2>
                  <p className="whitespace-pre-line">{contact.address || "-"}</p>
                </div>
                
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-2">โซเชียลมีเดีย</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Facebook</label>
                      <div className="mt-1 overflow-hidden text-ellipsis">{contact.social_media?.facebook || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Line</label>
                      <div className="mt-1">{contact.social_media?.line || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Instagram</label>
                      <div className="mt-1">{contact.social_media?.instagram || "-"}</div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4 border-b pb-2">ข้อมูลเพิ่มเติม</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">กลุ่ม</label>
                      <div className="mt-1">{contact.group || "-"}</div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">หมายเหตุ</label>
                      <div className="mt-1 whitespace-pre-line">{contact.notes || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}