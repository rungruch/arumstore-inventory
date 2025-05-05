"use client";
import { useState, useEffect } from "react";
import { getWallets, getFinanceTransactions } from "@/app/firebase/firestoreFinance";
import { finance_transaction_type, payment_status } from "./enum";
import Link from "next/link";
import { Timestamp } from "firebase/firestore";

export default function FinancePage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch wallets
        const walletsData = await getWallets();
        setWallets(walletsData);
        
        // Fetch recent transactions
        const transactions = await getFinanceTransactions();
        setRecentTransactions(transactions.slice(0, 5)); // Get only the 5 most recent transactions
        
        setError(null);
      } catch (err) {
        setError("เกิดข้อผิดพลาดในการดึงข้อมูล: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Calculate totals
  const totalWalletBalance = wallets.reduce((sum, wallet) => sum + (wallet.total || 0), 0);

  const totalIncome = recentTransactions.reduce((sum, transaction) => {
    if (
      transaction.transaction_type === finance_transaction_type.INCOME && 
      transaction.payment_status === payment_status.COMPLETED
    ) {
      return sum + (transaction.total_amount || 0);
    }
    return sum;
  }, 0);

  const totalExpense = recentTransactions.reduce((sum, transaction) => {
    if (
      transaction.transaction_type === finance_transaction_type.EXPENSE && 
      transaction.payment_status === payment_status.COMPLETED
    ) {
      return sum + (transaction.total_amount || 0);
    }
    return sum;
  }, 0);

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

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">การเงิน</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Wallet Balance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">ยอดรวมกระเป๋าเงิน</h2>
          <p className="text-3xl font-bold">฿{totalWalletBalance.toLocaleString()}</p>
          <Link 
            href="/finance/wallet" 
            className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block"
          >
            จัดการกระเป๋าเงิน →
          </Link>
        </div>

        {/* Income */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">รายรับ</h2>
          <p className="text-3xl font-bold text-green-600">฿{totalIncome.toLocaleString()}</p>
          <Link 
            href="/finance/other-income" 
            className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block"
          >
            จัดการรายรับ →
          </Link>
        </div>

        {/* Expense */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-2">รายจ่าย</h2>
          <p className="text-3xl font-bold text-red-600">฿{totalExpense.toLocaleString()}</p>
          <Link 
            href="/finance/other-outcome" 
            className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block"
          >
            จัดการรายจ่าย →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">ทางลัด</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/finance/wallet"
              className="block p-4 rounded-lg border hover:bg-gray-50 transition"
            >
              <h3 className="font-medium">จัดการกระเป๋าเงิน</h3>
              <p className="text-sm text-gray-500">จัดการกระเป๋าเงินและยอดเงิน</p>
            </Link>
            <Link 
              href="/finance/other-income"
              className="block p-4 rounded-lg border hover:bg-gray-50 transition"
            >
              <h3 className="font-medium">สร้างรายรับใหม่</h3>
              <p className="text-sm text-gray-500">บันทึกรายรับจากแหล่งอื่นๆ</p>
            </Link>
            <Link 
              href="/finance/other-outcome"
              className="block p-4 rounded-lg border hover:bg-gray-50 transition"
            >
              <h3 className="font-medium">สร้างรายจ่ายใหม่</h3>
              <p className="text-sm text-gray-500">บันทึกรายจ่ายประเภทต่างๆ</p>
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">รายการล่าสุด</h2>
          </div>
          
          {isLoading ? (
            <div className="text-center p-6">กำลังโหลด...</div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center p-6">ไม่พบรายการธุรกรรม</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      วันที่
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ประเภท
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รหัสรายการ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      รายละเอียด
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      จำนวนเงิน
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      สถานะ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.map((transaction) => (
                    <tr key={transaction.transaction_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {formatDate(transaction.created_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.transaction_type === finance_transaction_type.INCOME
                            ? "bg-green-100 text-green-800"
                            : transaction.transaction_type === finance_transaction_type.EXPENSE
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
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
                        {transaction.client_name || (
                          transaction.transaction_type === finance_transaction_type.TRANSFER
                            ? "โอนเงินระหว่างกระเป๋า"
                            : "-"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={
                          transaction.transaction_type === finance_transaction_type.INCOME
                            ? "text-green-600"
                            : "text-red-600"
                        }>
                          ฿{transaction.total_amount?.toLocaleString() || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.payment_status === payment_status.COMPLETED
                            ? "bg-green-100 text-green-800"
                            : transaction.payment_status === payment_status.PENDING
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
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
  );
}