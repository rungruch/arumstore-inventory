"use client";
import { useState, useEffect, useRef } from "react";
import { getExpenseTransactions, updateTransactionStatus } from "@/app/firebase/firestoreFinance";
import { ExpenseTransaction } from "@/app/finance/interface";
import { finance_transaction_type, payment_status, payment_status_display } from "@/app/finance/enum";
import AddFinanceTransaction from "@/components/AddFinanceTransaction";
import { Timestamp } from "firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { getWallets } from "@/app/firebase/firestoreFinance";
import { WalletCollection } from "@/app/finance/interface";
import { getFile, uploadFile } from "@/app/firebase/storage";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function OtherOutcomePage() {
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formTrigger, setFormTrigger] = useState<boolean>(false);
  const [wallets, setWallets] = useState<WalletCollection[]>([]);
  const [selectedTransactionNum, setSelectedTransactionNum] = useState<number>(10);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; }>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Calculate total
  const totalAmount = transactions.reduce((sum, transaction) => {
    return transaction.payment_status === payment_status.COMPLETED
      ? sum + (transaction.total_amount || 0)
      : sum;
  }, 0);

  useEffect(() => {
    fetchTransactions();
    fetchWallets();
  }, [formTrigger, selectedTransactionNum]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await getExpenseTransactions(selectedTransactionNum);
      setTransactions(data);

      setError(null);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWallets = async () => {
    try {
      const data = await getWallets();
      setWallets(data);
      if (data.length > 0) {
        setSelectedWalletId(data[0].wallet_id);
      }
    } catch (err) {
      console.error("Error fetching wallets:", err);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp instanceof Timestamp 
        ? timestamp.toDate() 
        : new Date(timestamp.seconds * 1000);
      
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      return "-";
    }
  };

  const handleStatusChange = async (transactionId: string, status: payment_status) => {
    if (status === payment_status.COMPLETED) {
      setSelectedTransactionId(transactionId);
      setIsPayModalOpen(true);
    } else {
      try {
        await updateTransactionStatus(transactionId, status);
        fetchTransactions();
      } catch (err) {
        setModalState({
          isOpen: true,
          title: ModalTitle.ERROR,
          message: "เกิดข้อผิดพลาดในการอัปเดตสถานะ: " + (err instanceof Error ? err.message : String(err)),
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setPreviewUrl(null);
  };

  const handleFileUpload = async () => {
    if (!uploadedFile) return;

    try {
      const folder = "payment-proofs/";
      const imagePath = await uploadFile(uploadedFile, folder);
      const imageUrl = await getFile(imagePath);

      return imageUrl;
      
    } catch (error) {
      console.error("Upload failed:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: `เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handlePaymentConfirm = async () => {
    if (!selectedWalletId) {
      setModalState({
        isOpen: true,
        title: ModalTitle.WARNING,
        message: "กรุณาเลือกกระเป๋าเงิน",
      });
      return;
    }

    setImageUploading(true);

    const uploadedFileUrl = await handleFileUpload();

    try {
      await updateTransactionStatus(
        selectedTransactionId, 
        payment_status.COMPLETED, 
        selectedWalletId, 
        uploadedFileUrl
      );
      setIsPayModalOpen(false);
      setUploadedFile(null);
      setPreviewUrl(null);
      fetchTransactions();
      setImageUploading(false);
    } catch (err) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: "เกิดข้อผิดพลาดในการบันทึกการชำระเงิน: " + (err instanceof Error ? err.message : String(err)),
      });
    }
  };

  const closeModal = (): void => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  return (
    <>
    <ProtectedRoute module='finance' action="view">
    <div className="container mx-auto px-4 py-6">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">รายจ่ายอื่นๆ</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="mt-2 sm:mt-0 text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition w-[200px] sm:w-auto"
        >
          {showAddForm ? "ปิดฟอร์ม" : "สร้างรายจ่าย"}
        </button>
      </div>
      <div className="flex items-center space-x-2 text-sm mb-4">
        <span className="text-gray-500 dark:text-gray-400">แสดง:</span>
        <select
          className="border rounded-md px-2 py-1 bg-white dark:bg-zinc-700 dark:border-zinc-600"
          value={selectedTransactionNum}
          onChange={(e) => {
            const limit = parseInt(e.target.value);
            setSelectedTransactionNum(limit);
          }}
        >
          <option value="5">5 รายการ</option>
          <option value="10">10 รายการ</option>
          <option value="50">50 รายการ</option>
          <option value="100">100 รายการ</option>
        </select>
      </div>

      {showAddForm && (
        <div className="mb-8 bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700 p-6">
          <AddFinanceTransaction 
            transactionType={finance_transaction_type.EXPENSE} 
            trigger={formTrigger} 
            setTrigger={setFormTrigger} 
          />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">ยอดรวมรายจ่ายที่ชำระแล้ว</h2>
        <p className="text-3xl font-bold text-red-600">฿{totalAmount.toLocaleString()}</p>
      </div>

      {isLoading ? (
        <div className="text-center py-4 animate-pulse flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
          <span className="ml-4 text-gray-500">กำลังโหลด...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700 p-6 text-center">
          <p>ไม่พบข้อมูลรายจ่าย</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700">
          <div className="overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <thead className="bg-gray-50 dark:bg-zinc-800">
                <tr className="text-left h-[9vh]">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  วันที่
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  รายการ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  ชื่อผู้ติดต่อ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  หมายเหตุ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  จำนวนเงิน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  สถานะ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                  การชำระเงิน
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-zinc-700">
                {transactions.map((transaction) => (
                <tr key={transaction.transaction_id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {formatDate(transaction.created_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {transaction.transaction_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {transaction.client_name || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {transaction.notes || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                  ฿{transaction.total_amount?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    transaction.payment_status === payment_status.COMPLETED
                    ? "bg-green-100 text-green-800"
                    : transaction.payment_status === payment_status.PENDING
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
                  }`}>
                    {payment_status_display[transaction.payment_status || payment_status.PENDING]}
                  </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {transaction.payment_status === payment_status.PENDING && (
                          <button
                            onClick={() => handleStatusChange(transaction.transaction_id || "", payment_status.COMPLETED)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                          >
                            ชำระเงิน
                          </button>
                        )}

                        {transaction.payment_status === payment_status.COMPLETED  && transaction.payment_deatils?.payment_image ? (
                        <div className="relative group">
                          <img
                            src={transaction.payment_deatils?.payment_image}
                            alt="หลักฐาน"
                            className="h-10 w-10 object-cover rounded border cursor-pointer transition-transform duration-200 group-hover:scale-600 group-hover:z-50 group-hover:shadow-lg"
                            style={{ position: "relative" }}
                          />
                          <h6>{transaction.payment_deatils?.wallet_name}</h6>
                        </div>
                      ) : (
                        <></>
                      )}  

                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {transaction.payment_status === payment_status.PENDING && (
                          <button
                            onClick={() => handleStatusChange(transaction.transaction_id || "", payment_status.CANCELLED)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 font-medium"
                          >
                            ยกเลิก
                          </button>
                        )} 

                      </div>
                    </td>   
                    </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-[#00000066] dark:bg-[#00000099]  flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-100 dark:border-zinc-700">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">ยืนยันการชำระเงิน</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                เลือกกระเป๋าเงิน
              </label>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full border border-gray-300 dark:border-zinc-700 rounded-md px-3 py-2 dark:bg-zinc-800 dark:text-white"
                required
              >
                <option value="">เลือกกระเป๋าเงิน</option>
                {wallets.map((wallet) => (
                  <option key={wallet.wallet_id} value={wallet.wallet_id}>
                    {wallet.wallet_name} - ฿{wallet.total?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            {/* Upload Photo Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                อัปโหลดรูปภาพหลักฐานการชำระเงิน
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
              />
              {previewUrl && (
                <div className="mt-2 relative w-32 h-32">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="object-cover w-full h-full rounded-md border"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    title="ลบรูป"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsPayModalOpen(false);
                  setUploadedFile(null);
                  setPreviewUrl(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-zinc-700 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-200"
              >
                ยกเลิก
              </button>
                {imageUploading ? (
                  <button
                    disabled
                    className="px-4 py-2 text-white rounded-md bg-gray-400 cursor-not-allowed flex items-center"
                  >
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    กำลังโหลด...
                  </button>
                ) : (
                  <button
                    onClick={handlePaymentConfirm}
                    disabled={imageUploading}
                    className="px-4 py-2 text-white rounded-md transition-colors duration-200 bg-black hover:bg-gray-800"
                  >
                    ยืนยัน
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
    </>
  );
}