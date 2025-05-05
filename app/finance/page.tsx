"use client";

import { useEffect, useState } from "react";
import { getFinanceTransactions, getWallets } from "@/app/firebase/firestoreFinance";
import { WalletCollection } from "@/app/finance/interface";
import { payment_status, finance_transaction_type } from "@/app/finance/enum";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function FinancePage() {
  const [wallets, setWallets] = useState<WalletCollection[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [selectedTransactionNum, setSelectedTransactionNum] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        // Fetch wallets
        const walletsData = await getWallets();
        setWallets(walletsData);
        
        setSelectedTransactionNum(5); // Reset to default 5 transactions

        // Fetch transactions
        const transactions = await getFinanceTransactions(selectedTransactionNum);
        setRecentTransactions(transactions.slice(0, 5)); // Get only the 5 most recent transactions
        setError(null);
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Calculate totals
  const totalWalletBalance = wallets.reduce((sum, wallet) => sum + (wallet.total || 0), 0);
  const totalIncome = recentTransactions.reduce((sum, transaction) => {
    if (transaction.transaction_type === finance_transaction_type.INCOME && transaction.payment_status === payment_status.COMPLETED) {
      return sum + (transaction.total_amount || 0);
    }
    return sum;
  }, 0);
  const totalExpense = recentTransactions.reduce((sum, transaction) => {
    if (transaction.transaction_type === finance_transaction_type.EXPENSE && transaction.payment_status === payment_status.COMPLETED) {
      return sum + (transaction.total_amount || 0);
    }
    return sum;
  }, 0);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return "-";
    }
  };

  return (
    <>
    <ProtectedRoute module='finance' action="view">
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">การเงิน</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold mb-2">ยอดรวมกระเป๋าเงิน</h2>
          <p className="text-3xl font-bold">฿{totalWalletBalance.toLocaleString()}</p>
          <Link href="/finance/wallet" className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block">
            จัดการกระเป๋าเงิน →
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold mb-2">รายรับ</h2>
          <p className="text-3xl font-bold text-green-600">฿{totalIncome.toLocaleString()}</p>
          <Link href="/finance/other-income" className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block">
            จัดการรายรับ →
          </Link>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700 p-6">
          <h2 className="text-xl font-semibold mb-2">รายจ่าย</h2>
          <p className="text-3xl font-bold text-red-600">฿{totalExpense.toLocaleString()}</p>
          <Link href="/finance/other-outcome" className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block">
            จัดการรายจ่าย →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700">
          <div className="p-6 border-b dark:border-zinc-700">
            <h2 className="text-xl font-semibold">ทางลัด</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/finance/wallet" className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-zinc-700 transition">
                <h3 className="font-medium">จัดการกระเป๋าเงิน</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">จัดการกระเป๋าเงินและยอดเงิน</p>
              </Link>
              <Link href="/finance/other-income" className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-zinc-700 transition">
                <h3 className="font-medium">สร้างรายรับใหม่</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">บันทึกรายรับจากแหล่งอื่นๆ</p>
              </Link>
              <Link href="/finance/other-outcome" className="block p-4 rounded-lg border hover:bg-gray-50 dark:hover:bg-zinc-700 transition">
                <h3 className="font-medium">สร้างรายจ่ายใหม่</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">บันทึกรายจ่ายประเภทต่างๆ</p>
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700">
          <div className="p-6 border-b dark:border-zinc-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-xl font-semibold">รายการล่าสุด</h2>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">แสดง:</span>
                <select 
                  className="border rounded-md px-2 py-1 bg-white dark:bg-zinc-700 dark:border-zinc-600"
                  value={selectedTransactionNum}
                  onChange={(e) => {
                    const limit = parseInt(e.target.value);
                    setSelectedTransactionNum(limit);
                    getFinanceTransactions(limit).then(data => {
                      setRecentTransactions(data);
                    });
                  }}
                >
                  <option value="5">5 รายการ</option>
                  <option value="10">10 รายการ</option>
                  <option value="50">50 รายการ</option>
                  <option value="100">100 รายการ</option>
                </select>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8 animate-pulse flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
              <span className="ml-4 text-gray-500">กำลังโหลด...</span>
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p>ไม่พบรายการธุรกรรม</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                <thead className="bg-gray-50 dark:bg-zinc-800">
                  <tr className="text-left h-[9vh]">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      วันที่
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      ประเภท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      รหัสรายการ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      รายละเอียด
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      จำนวนเงิน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-zinc-700">
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.transaction_id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-zinc-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(transaction.created_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.transaction_type === finance_transaction_type.INCOME
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : transaction.transaction_type === finance_transaction_type.EXPENSE
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}>
                          {transaction.transaction_type === finance_transaction_type.INCOME
                            ? "รายรับ"
                            : transaction.transaction_type === finance_transaction_type.EXPENSE
                            ? "รายจ่าย"
                            : "โอนเงิน"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.transaction_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transaction.client_name || (transaction.transaction_type === finance_transaction_type.TRANSFER ? "โอนเงินระหว่างกระเป๋า" : "-")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={transaction.transaction_type === finance_transaction_type.INCOME ? "text-green-600" : "text-red-600"}>
                          ฿{transaction.total_amount?.toLocaleString() || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.payment_status === payment_status.COMPLETED
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : transaction.payment_status === payment_status.PENDING
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}>
                          {transaction.payment_status === payment_status.COMPLETED
                            ? "เสร็จสมบูรณ์"
                            : transaction.payment_status === payment_status.PENDING
                            ? "รอดำเนินการ"
                            : "ยกเลิก"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
    </ProtectedRoute>
   </>
    
  );
}