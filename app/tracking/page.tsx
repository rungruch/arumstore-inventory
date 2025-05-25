"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getSellTransactionByTransactionId } from "@/app/firebase/firestore";
import { OrderStatusDisplay, PaymentStatusDisplay, ShippingStatusDisplay } from "@/app/firebase/enum";
import { Search, Package, CreditCard, Truck, Clock, MapPin, Phone, Mail, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import PaymentImageUpload from "@/components/PaymentImageUpload";
import { decryptTrackingId, isValidEncryptedFormat } from "@/lib/encryption-utils";

interface TrackingData {
  transaction_id: string;
  status: string;
  payment_status: string;
  shipping_status?: string;
  client_name: string;
  client_tel?: string;
  client_email?: string;
  client_address?: string;
  total_amount: number;
  created_date: any;
  shipping_method?: string;
  payment_details?: {
    payment_amount: number;
    payment_date: any;
    image?: string;
  };
  shipping_details?: {
    tracking_number?: string;
    shipping_date?: any;
    recipient_name?: string;
  };
  status_history?: Array<{
    status_type: string;
    old_status: string;
    new_status: string;
    timestamp: any;
  }>;
}

function TrackingPageContent() {
  const searchParams = useSearchParams();
  const [trackingId, setTrackingId] = useState("");
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-search when URL query params contain tracking ID
  useEffect(() => {
    const urlTrackingId = searchParams.get('id');
    const encryptedId = searchParams.get('encrypted_id');
    
    if (encryptedId && encryptedId.trim()) {
      // Handle encrypted tracking ID
      try {
        // Validate encrypted format before attempting decryption
        if (!isValidEncryptedFormat(encryptedId.trim())) {
          setError("ลิงก์ติดตามไม่ถูกต้องหรือหมดอายุ กรุณาใช้ลิงก์ใหม่");
          return;
        }
        
        const decryptedId = decryptTrackingId(encryptedId.trim());
        setTrackingId(decryptedId);
        handleSearchWithId(decryptedId);
      } catch (error) {
        console.error('Error decrypting tracking ID:', error);
        setError("ลิงก์ติดตามไม่ถูกต้องหรือหมดอายุ กรุณาใช้ลิงก์ใหม่");
      }
    } else if (urlTrackingId && urlTrackingId.trim()) {
      // Handle regular tracking ID (backward compatibility)
    //   setTrackingId(urlTrackingId);
    //   handleSearchWithId(urlTrackingId);
        return;
    }
  }, [searchParams]);

  const handleSearchWithId = async (searchId: string) => {
    if (!searchId.trim()) {
      setError("กรุณาใส่หมายเลขติดตาม");
      return;
    }

    setLoading(true);
    setError("");
    setTrackingData(null);

    try {
      const data = await getSellTransactionByTransactionId(searchId.trim());
      
      if (!data) {
        setError("ไม่พบข้อมูลการสั่งซื้อ กรุณาตรวจสอบหมายเลขติดตามอีกครั้ง");
        return;
      }

      setTrackingData(data as unknown as TrackingData);
    } catch (error) {
      console.error("Error fetching tracking data:", error);
      setError("เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    if (trackingData?.transaction_id) {
      await handleSearchWithId(trackingData.transaction_id);
    }
  };

  const handleSearch = async () => {
    await handleSearchWithId(trackingId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    if (date instanceof Date) {
      return date.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return '-';
  };

  const getStatusIcon = (status: string, type: 'order' | 'payment' | 'shipping') => {
    if (type === 'order') {
      switch (status) {
        case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-600" />;
        case 'CANCELLED': return <XCircle className="w-5 h-5 text-red-600" />;
        case 'SHIPPING': return <Truck className="w-5 h-5 text-purple-600" />;
        case 'PROCESSING': return <Clock className="w-5 h-5 text-blue-600" />;
        default: return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      }
    } else if (type === 'payment') {
      switch (status) {
        case 'PAID': return <CheckCircle className="w-5 h-5 text-green-600" />;
        case 'FAILED': return <XCircle className="w-5 h-5 text-red-600" />;
        default: return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      }
    } else {
      switch (status) {
        case 'DELIVERED': return <CheckCircle className="w-5 h-5 text-green-600" />;
        case 'SHIPPED': return <Truck className="w-5 h-5 text-blue-600" />;
        default: return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      }
    }
  };

  const getStatusColor = (status: string, type: 'order' | 'payment' | 'shipping') => {
    if (type === 'order') {
      switch (status) {
        case 'COMPLETED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
        case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
        case 'SHIPPING': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700';
        case 'PROCESSING': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
        default: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      }
    } else if (type === 'payment') {
      switch (status) {
        case 'PAID': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
        case 'FAILED': return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700';
        default: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      }
    } else {
      switch (status) {
        case 'DELIVERED': return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
        case 'SHIPPED': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
        default: return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-lg mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">ติดตามการสั่งซื้อ</h1>
          <p className="text-gray-600 dark:text-gray-300 text-center mt-2">ตรวจสอบสถานะการสั่งซื้อของคุณ</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Search Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            หมายเลขการสั่งซื้อ
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              disabled={true}
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="ใส่หมายเลขการสั่งซื้อ"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg flex items-center space-x-1 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </button>
          </div>
          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Results */}
        {trackingData && (
          <div className="space-y-4">
            {/* Order Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ข้อมูลการสั่งซื้อ</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">#{trackingData.transaction_id}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ชื่อลูกค้า:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{trackingData.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ยอดรวม:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(trackingData.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">วันที่สั่งซื้อ:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(trackingData.created_date)}</span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            {trackingData.status_history && trackingData.status_history.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                  ประวัติการเปลี่ยนสถานะ
                </h3>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-gray-600"></div>
                  
                  <div className="space-y-4">
                    {trackingData.status_history.slice().reverse().map((entry, index) => (
                      <div key={index} className="relative flex items-start space-x-4">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex-shrink-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                            index === 0 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                          }`}>
                            <div className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-white' : 'bg-gray-300 dark:bg-gray-500'
                            }`}></div>
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className={`p-3 rounded-lg border ${
                            index === 0 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                              : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(entry.new_status, entry.status_type as 'order' | 'payment' | 'shipping')}
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {entry.status_type === 'order' ? 'คำสั่งซื้อ' :
                                   entry.status_type === 'payment' ? 'การชำระเงิน' :
                                   entry.status_type === 'shipping' ? 'การจัดส่ง' : entry.status_type}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(entry.timestamp)}
                              </span>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">สถานะ:</span> {
                                  entry.status_type === 'order' ? 
                                    (OrderStatusDisplay[entry.new_status as keyof typeof OrderStatusDisplay] || entry.new_status) :
                                   entry.status_type === 'payment' ?
                                    (PaymentStatusDisplay[entry.new_status as keyof typeof PaymentStatusDisplay] || entry.new_status) :
                                   entry.status_type === 'shipping' ?
                                    (ShippingStatusDisplay[entry.new_status as keyof typeof ShippingStatusDisplay] || entry.new_status) :
                                   entry.new_status
                                }
                              </div>
                              
                              {entry.old_status !== entry.new_status && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  จาก: {
                                    entry.status_type === 'order' ? 
                                      (OrderStatusDisplay[entry.old_status as keyof typeof OrderStatusDisplay] || entry.old_status) :
                                     entry.status_type === 'payment' ?
                                      (PaymentStatusDisplay[entry.old_status as keyof typeof PaymentStatusDisplay] || entry.old_status) :
                                     entry.status_type === 'shipping' ?
                                      (ShippingStatusDisplay[entry.old_status as keyof typeof ShippingStatusDisplay] || entry.old_status) :
                                     entry.old_status
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Status Cards */}
            <div className="space-y-3 hidden">
              {/* Order Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">สถานะคำสั่งซื้อ</h3>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(trackingData.status, 'order')}`}>
                        {OrderStatusDisplay[trackingData.status as keyof typeof OrderStatusDisplay] || trackingData.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">สถานะการชำระเงิน</h3>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(trackingData.payment_status, 'payment')}`}>
                        {PaymentStatusDisplay[trackingData.payment_status as keyof typeof PaymentStatusDisplay] || trackingData.payment_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Status */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-3">
                  <Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">สถานะการจัดส่ง</h3>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(trackingData.shipping_status || 'PENDING', 'shipping')}`}>
                        {trackingData.shipping_status ? 
                          ShippingStatusDisplay[trackingData.shipping_status as keyof typeof ShippingStatusDisplay] || trackingData.shipping_status 
                          : 'รอดำเนินการ'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Details */}
            {(trackingData.shipping_details || trackingData.shipping_method) && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <Truck className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                  รายละเอียดการจัดส่ง
                </h3>
                <div className="space-y-2 text-sm">
                  {trackingData.shipping_method && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">ช่องทางจัดส่ง:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{trackingData.shipping_method}</span>
                    </div>
                  )}
                  {trackingData.shipping_details?.tracking_number && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">หมายเลขติดตาม:</span>
                      <div className="font-mono bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white p-2 rounded mt-1 text-center">
                        {trackingData.shipping_details.tracking_number}
                      </div>
                    </div>
                  )}
                  {trackingData.shipping_details?.shipping_date && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">วันที่จัดส่ง:</span>
                      <span className="text-gray-900 dark:text-white">{formatDate(trackingData.shipping_details.shipping_date)}</span>
                    </div>
                  )}
                  {trackingData.shipping_details?.recipient_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">ผู้รับ:</span>
                      <span className="text-gray-900 dark:text-white">{trackingData.shipping_details.recipient_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-gray-600 dark:text-gray-400" />
                ข้อมูลการติดต่อ
              </h3>
              <div className="space-y-2 text-sm">
                {trackingData.client_tel && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{trackingData.client_tel}</span>
                  </div>
                )}
                {trackingData.client_email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{trackingData.client_email}</span>
                  </div>
                )}
                {trackingData.client_address && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <span className="flex-1 text-gray-900 dark:text-white">{trackingData.client_address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Image Upload */}
            <PaymentImageUpload
              transactionId={trackingData.transaction_id}
              currentImage={trackingData.payment_details?.image}
              onUploadSuccess={handleRefreshData}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
            <p className="text-gray-600 dark:text-gray-400">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    }>
      <TrackingPageContent />
    </Suspense>
  );
}
