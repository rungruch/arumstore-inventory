"use client";
import { useState, useEffect } from "react";
import { getExpenseTransactions, updateTransactionStatus } from "@/app/firebase/firestoreFinance";
import { ExpenseTransaction } from "@/app/finance/interface";
import { finance_transaction_type, payment_status, payment_status_display } from "@/app/finance/enum";
import AddFinanceTransaction from "@/components/AddFinanceTransaction";
import { Timestamp } from "firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { getWallets } from "@/app/firebase/firestoreFinance";
import { WalletCollection } from "@/app/finance/interface";

export default function OtherOutcomePage() {
  const [transactions, setTransactions] = useState<ExpenseTransaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [formTrigger, setFormTrigger] = useState<boolean>(false);
  const [wallets, setWallets] = useState<WalletCollection[]>([]);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState<boolean>(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");
  const [selectedWalletId, setSelectedWalletId] = useState<string>("");
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; }>({
    isOpen: false,
    title: "",
    message: "",
  });
  
  // Calculate total
  const totalAmount = transactions.reduce((sum, transaction) => {
    return transaction.payment_status === payment_status.COMPLETED
      ? sum + (transaction.total_amount || 0)
      : sum;
  }, 0);

  useEffect(() => {
    fetchTransactions();
    fetchWallets();
  }, [formTrigger]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const data = await getExpenseTransactions();
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

  const handlePaymentConfirm = async () => {
    if (!selectedWalletId) {
      setModalState({
        isOpen: true,
        title: ModalTitle.WARNING,
        message: "กรุณาเลือกกระเป๋าเงิน",
      });
      return;
    }

    try {
      await updateTransactionStatus(selectedTransactionId, payment_status.COMPLETED, selectedWalletId);
      setIsPayModalOpen(false);
      fetchTransactions();
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {showAddForm ? "ปิดฟอร์ม" : "สร้างรายจ่าย"}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-8">
          <AddFinanceTransaction 
            transactionType={finance_transaction_type.EXPENSE} 
            trigger={formTrigger} 
            setTrigger={setFormTrigger} 
          />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">ยอดรวมรายจ่ายที่ชำระแล้ว</h2>
        <p className="text-3xl font-bold">฿{totalAmount.toLocaleString()}</p>
      </div>

      {isLoading ? (
        <div className="text-center py-4">กำลังโหลด...</div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p>ไม่พบข้อมูลรายจ่าย</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    วันที่
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    รายการ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ชื่อผู้ติดต่อ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    หมายเหตุ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    จำนวนเงิน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.transaction_id} className="hover:bg-gray-50">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                        {transaction.payment_status !== payment_status.COMPLETED && (
                          <button
                            onClick={() => handleStatusChange(transaction.transaction_id || "", payment_status.COMPLETED)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            ชำระเงิน
                          </button>
                        )}
                        {transaction.payment_status !== payment_status.CANCELLED && (
                          <button
                            onClick={() => handleStatusChange(transaction.transaction_id || "", payment_status.CANCELLED)}
                            className="text-red-600 hover:text-red-900"
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
      )}

      {/* Payment Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">ยืนยันการชำระเงิน</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                เลือกกระเป๋าเงิน
              </label>
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
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
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="px-4 py-2 border rounded-md"
              >
                ยกเลิก
              </button>
              <button
                onClick={handlePaymentConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}