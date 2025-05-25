"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSellTransactionByTransactionId } from "@/app/firebase/firestore";
import ProtectedRoute from "@/components/ProtectedRoute";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { NavigationLink } from "@/components/providers/navigation-link";
import { useAuth } from '@/app/contexts/AuthContext';
import { OrderStatusDisplay, PaymentStatusDisplay, ShippingStatusDisplay } from "@/app/firebase/enum";
import { ChevronLeft, Edit, Trash2, Eye, Package, User, Calendar, MapPin, Phone, Mail, CreditCard, Truck, FileText, Calculator, Clock, History } from "lucide-react";

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
}

interface StatusChangeEntry {
  status_type: string;
  old_status: string;
  new_status: string;
  created_by: string;
  timestamp: any;
}

interface OrderHistoryEntry {
  old_value: any;
  new_value: any;
  created_by: string;
  updated_at: any;
}

interface TransactionDetails {
  id: string;
  transaction_id: string;
  client_id: string;
  client_name: string;
  client_tel?: string;
  client_email?: string;
  client_address?: string;
  client_chat_name?: string;
  status: string;
  payment_status: string;
  shipping_status?: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    unit_type: string;
    warehouse_id: string;
    sku_image?: string;
  }>;
  total_amount: number;
  total_vat: number;
  total_amount_no_vat: number;
  total_discount: number;
  sell_method: string;
  vat_type: string;
  payment_method: string;
  payment_details?: any;
  shipping_method: string;
  shipping_details?: any;
  shipping_cost: number;
  tax_id?: string;
  branch_name?: string;
  branch_id?: string;
  warehouse: string;
  notes?: string;
  created_by: string;
  updated_by?: string;
  created_date: any;
  updated_date?: any;
  status_history?: StatusChangeEntry[];
  edit_history?: OrderHistoryEntry[];
}

export default function SalesDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { hasPermission } = useAuth();
  const transactionId = params.transactionId as string;

  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        setLoading(true);
        const data = await getSellTransactionByTransactionId(transactionId);
        console.log("Fetched transaction data:", data);
        
        if (!data) {
          setModalState({
            isOpen: true,
            title: ModalTitle.ERROR,
            message: "ไม่พบข้อมูลรายการขายที่ระบุ",
          });
          return;
        }

        setTransaction(data as TransactionDetails);
      } catch (error) {
        console.error("Error fetching transaction details:", error);
        setModalState({
          isOpen: true,
          title: ModalTitle.ERROR,
          message: "เกิดข้อผิดพลาดในการดึงข้อมูลรายการขาย",
        });
      } finally {
        setLoading(false);
      }
    };

    if (transactionId) {
      fetchTransactionDetails();
    }
  }, [transactionId]);

  const closeModal = (): void => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    
    // Handle Firestore Timestamp
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Handle regular Date object
    if (date instanceof Date) {
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Handle string date
    if (typeof date === 'string') {
      return new Date(date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return '-';
  };

  const getStatusBadgeStyle = (status: string, type: 'order' | 'payment' | 'shipping') => {
    const baseClasses = "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";
    
    if (type === 'order') {
      switch (status) {
        case 'pending': return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
        case 'processing': return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
        case 'shipping': return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`;
        case 'completed': return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
        case 'cancelled': return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
        default: return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
      }
    } else if (type === 'payment') {
      switch (status) {
        case 'pending': return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
        case 'completed': return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
        case 'failed': return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
        default: return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
      }
    } else {
      switch (status) {
        case 'pending': return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
        case 'shipped': return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
        case 'delivered': return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
        default: return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
      }
    }
  };

  if (loading) {
    return (
      <ProtectedRoute module="sales" action="view">
        <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-slate-600 dark:border-slate-400 border-solid"></div>
          <span className="ml-4 text-slate-600 dark:text-slate-400">กำลังโหลด...</span>
        </div>
      </ProtectedRoute>
    );
  }

  if (!transaction) {
    return (
      <ProtectedRoute module="sales" action="view">
        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          title={modalState.title}
          message={modalState.message}
        />
        <div className="container mx-auto p-5">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">ไม่พบข้อมูลรายการขาย</h2>
            <NavigationLink href="/sales" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
              กลับไปหน้ารายการขาย
            </NavigationLink>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute module="sales" action="view">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
      />

      <div className="container mx-auto p-5 min-h-screen bg-gray-50 dark:bg-zinc-900">
        {/* Header Section */}
        <div className="mb-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <NavigationLink href="/sales" className="hover:text-gray-900 dark:hover:text-gray-200 flex items-center">
              <ChevronLeft size={16} className="mr-1" />
              รายการขาย
            </NavigationLink>
            <span>/</span>
            <span className="text-gray-900 dark:text-gray-200">รายละเอียด</span>
          </div>

          {/* Title and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Eye size={28} className="mr-3 text-blue-600" />
                รายละเอียดรายการขาย
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                รหัสรายการ: <span className="font-semibold text-gray-900 dark:text-white">{transaction.transaction_id}</span>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              {hasPermission('sales', 'edit') && transaction.status === 'PENDING' && (
                <NavigationLink
                  href={`/sales/edit/${transactionId}`}
                  className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200 shadow-md hover:shadow-lg"
                >
                  <Edit size={16} className="mr-2" />
                  แก้ไข
                </NavigationLink>
              )}
            </div>
          </div>
        </div>

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Order Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package size={24} className="text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">สถานะคำสั่งซื้อ</p>
                  <div className="mt-1">
                    <span className={getStatusBadgeStyle(transaction.status, 'order')}>
                      {OrderStatusDisplay[transaction.status as keyof typeof OrderStatusDisplay] || transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CreditCard size={24} className="text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">สถานะการชำระเงิน</p>
                  <div className="mt-1">
                    <span className={getStatusBadgeStyle(transaction.payment_status, 'payment')}>
                      {PaymentStatusDisplay[transaction.payment_status as keyof typeof PaymentStatusDisplay] || transaction.payment_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Truck size={24} className="text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">สถานะการจัดส่ง</p>
                  <div className="mt-1">
                    <span className={getStatusBadgeStyle(transaction.shipping_status || 'pending', 'shipping')}>
                      {transaction.shipping_status ? 
                        ShippingStatusDisplay[transaction.shipping_status as keyof typeof ShippingStatusDisplay] || transaction.shipping_status 
                        : 'รอดำเนินการ'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Customer & Order Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Customer Information */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <User size={20} className="mr-2 text-blue-600" />
                  ข้อมูลลูกค้า
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อลูกค้า</label>
                    <p className="text-base text-gray-900 dark:text-white font-medium">{transaction.client_name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสลูกค้า</label>
                    <p className="text-base text-gray-900 dark:text-white">{transaction.client_id || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                      <Phone size={14} className="mr-1" />
                      เบอร์โทรศัพท์
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">{transaction.client_tel || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                      <Mail size={14} className="mr-1" />
                      อีเมล
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">{transaction.client_email || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center">
                      <MapPin size={14} className="mr-1" />
                      ที่อยู่
                    </label>
                    <p className="text-base text-gray-900 dark:text-white">{transaction.client_address || '-'}</p>
                  </div>
                  {transaction.tax_id && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เลขประจำตัวผู้เสียภาษี</label>
                        <p className="text-base text-gray-900 dark:text-white">{transaction.tax_id}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">สาขา</label>
                        <p className="text-base text-gray-900 dark:text-white">{transaction.branch_name || transaction.branch_id || '-'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Package size={20} className="mr-2 text-green-600" />
                  รายการสินค้า
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">รูปภาพ</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">รหัสสินค้า</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ชื่อสินค้า</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">จำนวน</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ราคาต่อหน่วย</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ส่วนลด</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">รวม</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                    {transaction.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-16 h-16 flex-shrink-0">
                            {item.sku_image ? (
                              <img
                                src={item.sku_image}
                                alt={item.name}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <div className={`w-16 h-16 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 ${item.sku_image ? 'hidden' : ''}`}>
                              <svg
                                className="w-8 h-8 text-gray-400 dark:text-gray-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M9 9h.01M15 9h.01M9 12h.01M15 12h.01"
                                />
                              </svg>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.sku}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">คลัง: {item.warehouse_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {item.quantity.toLocaleString()} {item.unit_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.discount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Information */}
            {transaction.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <FileText size={20} className="mr-2 text-yellow-600" />
                    หมายเหตุ
                  </h3>
                </div>
                <div className="p-6">
                  <p className="text-gray-900 dark:text-white">{transaction.notes}</p>
                </div>
              </div>
            )}

            {/* Status History */}
            {transaction.status_history && transaction.status_history.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Clock size={20} className="mr-2 text-indigo-600" />
                    ประวัติการเปลี่ยนสถานะ
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ประเภท</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">สถานะเดิม</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">สถานะใหม่</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">วันที่เปลี่ยน</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ผู้เปลี่ยน</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {transaction.status_history.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              entry.status_type === 'order' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              entry.status_type === 'payment' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              entry.status_type === 'shipping' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {entry.status_type === 'order' ? 'คำสั่งซื้อ' :
                               entry.status_type === 'payment' ? 'การชำระเงิน' :
                               entry.status_type === 'shipping' ? 'การจัดส่ง' :
                               entry.status_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={getStatusBadgeStyle(entry.old_status, entry.status_type as 'order' | 'payment' | 'shipping')}>
                              {entry.status_type === 'order' ? 
                                (OrderStatusDisplay[entry.old_status as keyof typeof OrderStatusDisplay] || entry.old_status) :
                               entry.status_type === 'payment' ?
                                (PaymentStatusDisplay[entry.old_status as keyof typeof PaymentStatusDisplay] || entry.old_status) :
                               entry.status_type === 'shipping' ?
                                (ShippingStatusDisplay[entry.old_status as keyof typeof ShippingStatusDisplay] || entry.old_status) :
                               entry.old_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={getStatusBadgeStyle(entry.new_status, entry.status_type as 'order' | 'payment' | 'shipping')}>
                              {entry.status_type === 'order' ? 
                                (OrderStatusDisplay[entry.new_status as keyof typeof OrderStatusDisplay] || entry.new_status) :
                               entry.status_type === 'payment' ?
                                (PaymentStatusDisplay[entry.new_status as keyof typeof PaymentStatusDisplay] || entry.new_status) :
                               entry.status_type === 'shipping' ?
                                (ShippingStatusDisplay[entry.new_status as keyof typeof ShippingStatusDisplay] || entry.new_status) :
                               entry.new_status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(entry.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.created_by}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Edit History */}
            {transaction.edit_history && transaction.edit_history.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <History size={20} className="mr-2 text-orange-600" />
                    ประวัติการแก้ไข
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ยอดรวมเดิม</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ยอดรวมใหม่</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">รายการเดิม</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">รายการใหม่</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">วันที่แก้ไข</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">ผู้แก้ไข</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {transaction.edit_history.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{index + 1}</td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1 text-red-700 dark:text-red-300">
                              {entry.old_value?.total_amount ? formatCurrency(entry.old_value.total_amount) : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-2 py-1 text-green-700 dark:text-green-300">
                              {entry.new_value?.total_amount ? formatCurrency(entry.new_value.total_amount) : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1 text-red-700 dark:text-red-300 max-h-32 overflow-y-auto">
                              {entry.old_value?.items ? (
                                <div className="space-y-1">
                                  {entry.old_value.items.map((item: any, itemIndex: number) => (
                                    <div key={itemIndex} className="text-xs">
                                      <div className="font-medium">{item.sku}: {item.name}</div>
                                      <div>จำนวน: {item.quantity} | ราคา: {formatCurrency(item.price)}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded px-2 py-1 text-green-700 dark:text-green-300 max-h-32 overflow-y-auto">
                              {entry.new_value?.items ? (
                                <div className="space-y-1">
                                  {entry.new_value.items.map((item: any, itemIndex: number) => (
                                    <div key={itemIndex} className="text-xs">
                                      <div className="font-medium">{item.sku}: {item.name}</div>
                                      <div>จำนวน: {item.quantity} | ราคา: {formatCurrency(item.price)}</div>
                                    </div>
                                  ))}
                                </div>
                              ) : '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(entry.updated_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {entry.created_by}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary & Details */}
          <div className="space-y-8">
            {/* Order Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <Calculator size={20} className="mr-2 text-purple-600" />
                  สรุปคำสั่งซื้อ
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-600 dark:text-gray-400">มูลค่าสินค้า (ไม่รวม VAT)</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(transaction.total_amount_no_vat)}
                  </span>
                </div>
                
                {transaction.total_discount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">ส่วนลดรวม</span>
                    <span className="text-sm font-medium text-red-600">
                      -{formatCurrency(transaction.total_discount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                  <span className="text-sm text-gray-600 dark:text-gray-400">VAT</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(transaction.total_vat)}
                  </span>
                </div>

                {transaction.shipping_cost > 0 && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-400">ค่าจัดส่ง</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(transaction.shipping_cost)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center py-3 border-t-2 border-gray-300 dark:border-gray-500">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">ยอดรวมทั้งสิ้น</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(transaction.total_amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <FileText size={20} className="mr-2 text-gray-600" />
                  รายละเอียดคำสั่งซื้อ
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วิธีการขาย</label>
                  <p className="text-sm text-gray-900 dark:text-white">{transaction.sell_method || '-'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ประเภท VAT</label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {transaction.vat_type === 'VAT0' ? 'รวมภาษีมูลค่าเพิ่ม 7%' :
                     transaction.vat_type === 'VAT7' ? 'แยกภาษีมูลค่าเพิ่ม 7%' :
                     transaction.vat_type === 'NO_VAT' ? 'ไม่มีภาษีมูลค่าเพิ่ม' :
                     transaction.vat_type || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วิธีการชำระเงิน</label>
                  <p className="text-sm text-gray-900 dark:text-white">{transaction.payment_method || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วิธีการจัดส่ง</label>
                  <p className="text-sm text-gray-900 dark:text-white">{transaction.shipping_method || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">คลังสินค้า</label>
                  <p className="text-sm text-gray-900 dark:text-white">{transaction.warehouse || '-'}</p>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center mb-2">
                    <Calendar size={16} className="mr-2 text-gray-500" />
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">วันที่สร้าง</label>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white ml-6">{formatDate(transaction.created_date)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">โดย: {transaction.created_by}</p>
                </div>

                {transaction.updated_date && (
                  <div className="pt-2">
                    <div className="flex items-center mb-2">
                      <Calendar size={16} className="mr-2 text-gray-500" />
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">วันที่แก้ไขล่าสุด</label>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white ml-6">{formatDate(transaction.updated_date)}</p>
                    {transaction.updated_by && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">โดย: {transaction.updated_by}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Details */}
            {transaction.payment_details && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <CreditCard size={20} className="mr-2 text-green-600" />
                    รายละเอียดการชำระเงิน
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {transaction.payment_details.payment_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่ชำระ</label>
                        <p className="text-sm text-gray-900 dark:text-white">{formatDate(transaction.payment_details.payment_date)}</p>
                      </div>
                    )}
                    {transaction.payment_details.reference_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเลขอ้างอิง</label>
                        <p className="text-sm text-gray-900 dark:text-white">{transaction.payment_details.reference_number}</p>
                      </div>
                    )}
                    {transaction.payment_details.image && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หลักฐานการชำระเงิน</label>
                        <img 
                          src={transaction.payment_details.image} 
                          alt="Payment proof" 
                          className="mt-2 w-full max-w-sm h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Shipping Details */}
            {transaction.shipping_details && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Truck size={20} className="mr-2 text-purple-600" />
                    รายละเอียดการจัดส่ง
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {transaction.shipping_details.shipping_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">วันที่จัดส่ง</label>
                        <p className="text-sm text-gray-900 dark:text-white">{formatDate(transaction.shipping_details.shipping_date)}</p>
                      </div>
                    )}
                    {transaction.shipping_details.recipient_name && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ผู้รับ</label>
                        <p className="text-sm text-gray-900 dark:text-white">{transaction.shipping_details.recipient_name}</p>
                      </div>
                    )}
                    {transaction.shipping_details.tracking_number && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมายเลขติดตาม</label>
                        <p className="text-sm text-gray-900 dark:text-white font-mono">{transaction.shipping_details.tracking_number}</p>
                      </div>
                    )}
                    {transaction.shipping_details.image && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หลักฐานการจัดส่ง</label>
                        <img 
                          src={transaction.shipping_details.image} 
                          alt="Shipping proof" 
                          className="mt-2 w-full max-w-sm h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-600" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
