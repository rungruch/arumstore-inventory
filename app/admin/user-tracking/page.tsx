"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/app/firebase/clientApp';
import { useAuth } from '@/app/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserAnalyticsDashboard from '@/components/UserAnalyticsDashboard';
import { getSalesSummaryWithBusinessLogic, RevisedUserSalesSummary } from '@/app/firebase/firestoreStatsRevised';
import { User, Filter, Calendar, Activity, Clock, Monitor, BarChart3, ShoppingCart, DollarSign, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ActivityLog {
  id: string;
  userId: string;
  displayName?: string;
  email?: string;
  activityType: string;
  timestamp: Date;
  metadata?: {
    page?: string;
    userAgent?: string;
    element?: string;
    eventType?: string;
    details?: any;
  };
}

interface UserSummary {
  userId: string;
  displayName?: string;
  email?: string;
  totalActivities: number;
  lastActive: Date;
  loginCount: number;
  pageViews: number;
  interactions: number;
}

export default function UserTrackingPage() {
  const { currentUser, loading } = useAuth();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [allActivityLogs, setAllActivityLogs] = useState<ActivityLog[]>([]); // Store unfiltered logs for user list
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [salesSummaries, setSalesSummaries] = useState<RevisedUserSalesSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
const [dateRange, setDateRange] = useState({
  start: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 1 day in BKK time
  end: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split('T')[0] // Current date in BKK time
});
  const [activityType, setActivityType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'analytics' | 'summary' | 'sales'>('sales');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchData();
    setRefreshTrigger(prev => prev + 1);
  }, [currentUser?.uid, selectedUser, dateRange, activityType]);

  // Generate user summaries when switching to summary view
  useEffect(() => {
    if (currentView === 'summary' && activityLogs.length > 0) {
      generateUserSummaries(activityLogs);
    }
  }, [currentView, activityLogs]);

  // Fetch sales data when switching to sales view
  useEffect(() => {
    if (currentView === 'sales') {
      fetchSalesData();
    }
  }, [currentView, selectedUser, dateRange]);

  const fetchData = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Build query constraints
      const constraints: any[] = [];
      
      // Note: selectedUser now contains display name, but we need to filter by userId
      // We'll filter on the client side after getting the data since we don't have userId mapping
      
      // Add activity type filter if selected
      if (activityType) {
        constraints.push(where('activityType', '==', activityType));
      }

      // Add ordering and limit
      constraints.push(orderBy('timestamp', 'desc'));
      constraints.push(limit(500));

      // Create query for activity logs
      const activityQuery = query(collection(db, 'activity_logs'), ...constraints);
      const activitySnapshot = await getDocs(activityQuery);
      
      const logs = activitySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.() || new Date()
      })) as ActivityLog[];

      // Filter by date range (client-side for now)
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the full end date
      
      let filteredLogs = logs.filter(log => 
        log.timestamp >= startDate && log.timestamp <= endDate
      );

      // Store all logs for user dropdown (before user filtering)
      setAllActivityLogs(filteredLogs);

      // Filter by selected user display name if specified
      if (selectedUser) {
        filteredLogs = filteredLogs.filter(log => {
          // Use the same logic as getUniqueUsers to ensure consistency
          const logDisplayName = log.displayName || log.email || log.userId;
          return logDisplayName === selectedUser;
        });
      }

      setActivityLogs(filteredLogs);

      // Generate user summaries
      if (currentView === 'summary') {
        generateUserSummaries(filteredLogs);
      }

      // Fetch sales data if sales view is active
      if (currentView === 'sales') {
        await fetchSalesData();
      }
      
    } catch (err: any) {
      console.error('Error fetching activity logs:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the full end date
      
      // selectedUser now contains display name, pass it directly to the function
      const salesData = await getSalesSummaryWithBusinessLogic(startDate, endDate, selectedUser || undefined);
      setSalesSummaries(salesData.summaries);
    } catch (error) {
      console.error('Error fetching sales data:', error);
      setError('Failed to load sales data');
    }
  };

  const generateUserSummaries = (logs: ActivityLog[]) => {
    const userMap = new Map<string, UserSummary>();
    
    logs.forEach(log => {
      const existing = userMap.get(log.userId) || {
        userId: log.userId,
        displayName: log.displayName,
        email: log.email,
        totalActivities: 0,
        lastActive: new Date(0),
        loginCount: 0,
        pageViews: 0,
        interactions: 0
      };

      existing.totalActivities++;
      if (log.timestamp > existing.lastActive) {
        existing.lastActive = log.timestamp;
      }

      if (log.activityType === 'login') {
        existing.loginCount++;
      } else if (log.activityType === 'page_mount') {
        existing.pageViews++;
      } else if (['click_interaction', 'keyboard_interaction'].includes(log.activityType)) {
        existing.interactions++;
      }

      userMap.set(log.userId, existing);
    });

    const summaries = Array.from(userMap.values()).sort((a, b) => 
      b.lastActive.getTime() - a.lastActive.getTime()
    );
    
    setUserSummaries(summaries);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'เมื่อสักครู่';
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    return `${diffDays} วันที่แล้ว`;
  };

  const getActivityTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      'login_success': 'เข้าสู่ระบบ',
      'logout': 'ออกจากระบบ',
      'page_mount': 'เข้าชมหน้า',
      'click_interaction': 'คลิกอิลิเมนต์',
      'keyboard_interaction': 'พิมพ์ข้อมูล',
      'visibility_change': 'เปลี่ยนสถานะหน้าต่าง',
      'auth_state_change': 'เปลี่ยนสถานะการเข้าสู่ระบบ'
    };
    return types[type] || type;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
      case 'logout':
        return <User className="h-4 w-4" />;
      case 'page_mount':
        return <Monitor className="h-4 w-4" />;
      case 'click_interaction':
      case 'keyboard_interaction':
        return <Activity className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Helper functions for getting unique users and activity types
  const getUniqueUsers = () => {
    const users = new Map();
    allActivityLogs.forEach(log => {
      const displayName = log.displayName || log.email || log.userId;
      if (!users.has(displayName)) {
        users.set(displayName, {
          userId: log.userId,
          displayName: displayName,
          email: log.email
        });
      }
    });
    return Array.from(users.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  };

  const getUniqueActivityTypes = () => {
    const types = new Set(allActivityLogs.map(log => log.activityType));
    return Array.from(types).sort();
  };

  // Excel export function for sales data
  const exportSalesToExcel = () => {
    if (salesSummaries.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    // Prepare data for Excel export - using proper interface
    const excelData = salesSummaries.map((summary, index) => ({
      'ลำดับ': index + 1,
      'พนักงาน': summary.displayName || summary.userId,
      'รายได้ยืนยัน (บาท)': summary.confirmedRevenue,
      'รายได้รอยืนยัน (บาท)': summary.pendingRevenue,
      'รายการทั้งหมด': summary.totalOrderCount,
      'รอดำเนินการ': summary.pendingOrderCount,
      'อนุมัติแล้ว': summary.approvedOrderCount,
      'จัดส่งแล้ว': summary.shippingOrderCount,
      'รายได้อนุมัติ (บาท)': summary.approvedRevenue,
      'รายได้เก็บปลายทาง (บาท)': summary.shippingRevenue,
      'ค่าเฉลี่ยต่อออเดอร์ (บาท)': Math.round(summary.avgOrderValue) // Use interface value, not recalculated
    }));

    // Calculate totals
    const totalConfirmedRevenue = salesSummaries.reduce((sum, user) => sum + user.confirmedRevenue, 0);
    const totalPendingRevenue = salesSummaries.reduce((sum, user) => sum + user.pendingRevenue, 0);
    const totalOrderCount = salesSummaries.reduce((sum, user) => sum + user.totalOrderCount, 0);
    const totalPendingOrderCount = salesSummaries.reduce((sum, user) => sum + user.pendingOrderCount, 0);
    const totalApprovedOrderCount = salesSummaries.reduce((sum, user) => sum + user.approvedOrderCount, 0);
    const totalShippingOrderCount = salesSummaries.reduce((sum, user) => sum + user.shippingOrderCount, 0);
    const totalApprovedRevenue = salesSummaries.reduce((sum, user) => sum + user.approvedRevenue, 0);
    const totalShippingRevenue = salesSummaries.reduce((sum, user) => sum + user.shippingRevenue, 0);
    // Use consistent average calculation with UI footer (average of individual averages)
    const totalAvgOrderValue = salesSummaries.length > 0 
      ? Math.round(salesSummaries.reduce((sum, user) => sum + user.avgOrderValue, 0) / salesSummaries.length)
      : 0;

    // Add totals row with consistent typing
    const totalsRow = {
      'ลำดับ': 'รวม' as any,
      'พนักงาน': 'รวมทั้งหมด',
      'รายได้ยืนยัน (บาท)': totalConfirmedRevenue,
      'รายได้รอยืนยัน (บาท)': totalPendingRevenue,
      'รายการทั้งหมด': totalOrderCount,
      'รอดำเนินการ': totalPendingOrderCount,
      'อนุมัติแล้ว': totalApprovedOrderCount,
      'จัดส่งแล้ว': totalShippingOrderCount,
      'รายได้อนุมัติ (บาท)': totalApprovedRevenue,
      'รายได้เก็บปลายทาง (บาท)': totalShippingRevenue,
      'ค่าเฉลี่ยต่อออเดอร์ (บาท)': totalAvgOrderValue
    };

    excelData.push(totalsRow);

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();

    // Auto-size columns
    const colWidths = [
      { wch: 8 },  // ลำดับ
      { wch: 25 }, // พนักงาน
      { wch: 18 }, // รายได้ยืนยัน
      { wch: 20 }, // รายได้รอยืนยัน
      { wch: 15 }, // รายการทั้งหมด
      { wch: 15 }, // รอดำเนินการ
      { wch: 12 }, // อนุมัติแล้ว
      { wch: 12 }, // จัดส่งแล้ว
      { wch: 18 }, // รายได้อนุมัติ
      { wch: 22 }, // รายได้เก็บปลายทาง
      { wch: 20 }  // ค่าเฉลี่ยต่อออเดอร์
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'สรุปยอดขาย');

    // Add business logic explanation sheet
    const businessLogicData = [
      { 'หมวดหมู่': 'สถานะออเดอร์', 'รายละเอียด': '', 'คำอธิบาย': '' },
      { 'หมวดหมู่': '', 'รายละเอียด': 'PENDING (รออนุมัติ)', 'คำอธิบาย': 'รายการขายใหม่ที่รอการอนุมัติจากผู้จัดการ' },
      { 'หมวดหมู่': '', 'รายละเอียด': 'APPROVED (อนุมัติแล้ว)', 'คำอธิบาย': 'รายการที่ได้รับการอนุมัติแล้ว (ชำระเงินล่วงหน้า)' },
      { 'หมวดหมู่': '', 'รายละเอียด': 'SHIPPING (เก็บปลายทาง)', 'คำอธิบาย': 'รายการเก็บเงินปลายทาง' },
      { 'หมวดหมู่': '', 'รายละเอียด': 'CANCELLED (ยกเลิก)', 'คำอธิบาย': 'รายการที่ถูกยกเลิก (ไม่นับในสถิติ)' },
      { 'หมวดหมู่': '', 'รายละเอียด': '', 'คำอธิบาย': '' },
      { 'หมวดหมู่': 'หลักการคำนวณรายได้', 'รายละเอียด': '', 'คำอธิบาย': '' },
      { 'หมวดหมู่': '', 'รายละเอียด': 'รายได้ยืนยัน', 'คำอธิบาย': 'นับเฉพาะออเดอร์ที่อนุมัติแล้ว และกำลังจัดส่ง เท่านั้น' },
      { 'หมวดหมู่': '', 'รายละเอียด': 'รายได้รอยืนยัน', 'คำอธิบาย': 'ออเดอร์ที่รอการอนุมัติ ยังไม่นับเป็นรายได้จริง' },
      { 'หมวดหมู่': '', 'รายละเอียด': 'รายได้อนุมัติ', 'คำอธิบาย': 'รายได้จากออเดอร์สถานะ APPROVED เท่านั้น' },
      { 'หมวดหมู่': '', 'รายละเอียด': 'รายได้เก็บปลายทาง', 'คำอธิบาย': 'รายได้จากออเดอร์สถานะ SHIPPING เท่านั้น' },
      { 'หมวดหมู่': '', 'รายละเอียด': '', 'คำอธิบาย': '' },
      { 'หมวดหมู่': 'วันที่ส่งออกข้อมูล', 'รายละเอียด': new Date().toLocaleDateString('th-TH'), 'คำอธิบาย': `ช่วงวันที่: ${new Date(dateRange.start).toLocaleDateString('th-TH')} - ${new Date(dateRange.end).toLocaleDateString('th-TH')}` }
    ];

    const businessLogicWs = XLSX.utils.json_to_sheet(businessLogicData);
    businessLogicWs['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 50 }];
    XLSX.utils.book_append_sheet(wb, businessLogicWs, 'หลักการคำนวณ');

    // Generate filename with date range
    const startDate = new Date(dateRange.start).toLocaleDateString('th-TH');
    const endDate = new Date(dateRange.end).toLocaleDateString('th-TH');
    const currentDate = new Date().toLocaleDateString('th-TH');
    const filename = `สรุปยอดขาย_${startDate}_${endDate}_${currentDate}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);
  };

  if (loading || isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
        <span className="ml-4 text-gray-500">กำลังโหลด...</span>
      </div>
    );
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }

  return (
    <ProtectedRoute module="users" action="view">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">การติดตามผู้ใช้งาน</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              ติดตามกิจกรรมและการใช้งานของผู้ใช้ในระบบ
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCurrentView('analytics')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            currentView === 'analytics' 
              ? 'bg-gray-900 dark:bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
              วิเคราะห์
            </button>
            <button
              onClick={() => setCurrentView('summary')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            currentView === 'summary' 
              ? 'bg-gray-900 dark:bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              ภาพรวม
            </button>

            <button
              onClick={() => setCurrentView('sales')}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
            currentView === 'sales' 
              ? 'bg-gray-900 dark:bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
              ยอดขาย
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User Filter - Hidden in Analytics View */}
            {currentView !== 'analytics' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  <User className="w-4 h-4 inline mr-1" />
                  ผู้ใช้
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border p-2 rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">ทั้งหมด</option>
                  {getUniqueUsers().map(user => (
                    <option key={user.userId} value={user.displayName}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Activity Type Filter - Hidden in Analytics View */}
            {currentView !== 'analytics' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  <Filter className="w-4 h-4 inline mr-1" />
                  ประเภทกิจกรรม
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full border p-2 rounded-md dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="">ทั้งหมด</option>
                  {getUniqueActivityTypes().map(type => (
                    <option key={type} value={type}>
                      {getActivityTypeDisplay(type)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                วันที่เริ่มต้น
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full border p-2 rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                วันที่สิ้นสุด
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full border p-2 rounded-md dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>

        {/* Analytics View */}
        {currentView === 'analytics' && (
          <UserAnalyticsDashboard 
            dateRange={dateRange} 
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Summary View with Detailed Activity Logs */}
        {currentView === 'summary' && (
          <div className="space-y-6">
            {/* User Summary Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold">สรุปการใช้งานของผู้ใช้</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  จำนวน {userSummaries.length} ผู้ใช้งาน
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        ผู้ใช้
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        กิจกรรมทั้งหมด
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        เข้าสู่ระบบ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        ดูหน้า
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        อินเทอร์แอคชั่น
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        ใช้งานล่าสุด
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {userSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          ไม่พบข้อมูลการใช้งาน
                        </td>
                      </tr>
                    ) : (
                      userSummaries.map((summary) => (
                        <tr key={summary.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {summary.displayName || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {summary.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {summary.totalActivities}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {summary.loginCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {summary.pageViews}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {summary.interactions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            <div>
                              <div>{formatRelativeTime(summary.lastActive)}</div>
                              <div className="text-xs">{formatDate(summary.lastActive)}</div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed Activity Logs Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b dark:border-gray-700">
                <h2 className="text-lg font-semibold">รายละเอียดกิจกรรม</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  จำนวน {activityLogs.length} กิจกรรม
                </p>
              </div>
              <div className="h-[500px] overflow-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        เวลา
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        ผู้ใช้
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        กิจกรรม
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        หน้า
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        รายละเอียด
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {activityLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          ไม่พบกิจกรรม
                        </td>
                      </tr>
                    ) : (
                      activityLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div>
                              <div>{formatRelativeTime(log.timestamp)}</div>
                              <div className="text-xs text-gray-500">{formatDate(log.timestamp)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {log.displayName || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {log.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getActivityIcon(log.activityType)}
                              <span className="ml-2 text-sm text-gray-900 dark:text-white">
                                {getActivityTypeDisplay(log.activityType)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {log.metadata?.page || '-'}
                          </td>
                          <td className="px-6 py-4">
                            <details className="cursor-pointer">
                              <summary className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                ดูรายละเอียด
                              </summary>
                              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                <pre className="whitespace-pre-wrap">{JSON.stringify(log.metadata, null, 2)}</pre>
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}



        {/* Sales View */}
        {currentView === 'sales' && (
          <div className="space-y-6">
            {/* Sales Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">รายได้รวม</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(salesSummaries.reduce((sum, user) => sum + user.confirmedRevenue, 0))}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">อนุมัติ + เก็บปลายทาง</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">รายได้รอยืนยัน</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {formatCurrency(salesSummaries.reduce((sum, user) => sum + user.pendingRevenue, 0))}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">รอการอนุมัติ</p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <ShoppingCart className="h-8 w-8 text-blue-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">รายการทั้งหมด</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {salesSummaries.reduce((sum, user) => sum + user.totalOrderCount, 0)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <User className="h-8 w-8 text-purple-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">พนักงานขาย</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {salesSummaries.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* APPROVED vs SHIPPING Revenue Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">รายได้สถานะอนุมัติแล้ว</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(salesSummaries.reduce((sum, user) => sum + user.approvedRevenue, 0))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">รายได้สถานะเก็บปลายทาง</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {formatCurrency(salesSummaries.reduce((sum, user) => sum + user.shippingRevenue, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Logic Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    หลักการคำนวณรายได้
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <p className="mb-2">
                      <strong>รายได้ยืนยัน:</strong> นับเฉพาะออเดอร์ที่ <span className="bg-green-100 dark:bg-green-900 px-1 rounded">อนุมัติแล้ว</span> และ <span className="bg-purple-100 dark:bg-purple-900 px-1 rounded">กำลังจัดส่ง</span> เท่านั้น
                    </p>
                    <p className="mb-2">
                      <strong>รายได้รอยืนยัน:</strong> ออเดอร์ที่ <span className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">รอการอนุมัติ</span> ยังไม่นับเป็นรายได้จริง
                    </p>
                    <p>
                      <strong>ออเดอร์ที่ยกเลิก:</strong> ไม่นับในสถิติใดๆ ทั้งหมด
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">สรุปยอดขายตามพนักงาน</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      จำนวน {salesSummaries.length} พนักงาน อิงจากรายการขายที่สร้าง
                    </p>
                  </div>
                  <button
                    onClick={exportSalesToExcel}
                    disabled={salesSummaries.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    ส่งออก Excel
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        พนักงาน
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        รายได้ยืนยัน
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        รายได้รอยืนยัน
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        รายการทั้งหมด
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        รอดำเนินการ
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        อนุมัติแล้ว
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        จัดส่งแล้ว
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-green-600 uppercase tracking-wider dark:text-green-400">
                        รายได้อนุมัติ
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-purple-600 uppercase tracking-wider dark:text-purple-400">
                        รายได้เก็บปลายทาง
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                        ค่าเฉลี่ยต่อออเดอร์
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {salesSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          ไม่พบข้อมูลยอดขาย
                        </td>
                      </tr>
                    ) : (
                      salesSummaries.map((summary) => (
                        <tr key={summary.userId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {summary.displayName || 'Unknown User'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(summary.confirmedRevenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            {formatCurrency(summary.pendingRevenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {summary.totalOrderCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              {summary.pendingOrderCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {summary.approvedOrderCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                              {summary.shippingOrderCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(summary.approvedRevenue)}
                            <div className="text-xs text-gray-500 dark:text-gray-400">APPROVED</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-purple-600 dark:text-purple-400">
                            {formatCurrency(summary.shippingRevenue)}
                            <div className="text-xs text-gray-500 dark:text-gray-400">SHIPPING</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                            {formatCurrency(summary.avgOrderValue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {salesSummaries.length > 0 && (
                    <tfoot className="bg-gray-50 dark:bg-gray-700">
                      <tr className="font-medium">
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">รวมทั้งหมด</td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(salesSummaries.reduce((sum, user) => sum + user.confirmedRevenue, 0))}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-yellow-600 dark:text-yellow-400">
                          {formatCurrency(salesSummaries.reduce((sum, user) => sum + user.pendingRevenue, 0))}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">
                          {salesSummaries.reduce((sum, user) => sum + user.totalOrderCount, 0)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">
                          {salesSummaries.reduce((sum, user) => sum + user.pendingOrderCount, 0)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">
                          {salesSummaries.reduce((sum, user) => sum + user.approvedOrderCount, 0)}
                        </td>
                        <td className="px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">
                          {salesSummaries.reduce((sum, user) => sum + user.shippingOrderCount, 0)}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(salesSummaries.reduce((sum, user) => sum + user.approvedRevenue, 0))}
                          <div className="text-xs font-normal text-gray-500 dark:text-gray-400">APPROVED</div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-purple-600 dark:text-purple-400">
                          {formatCurrency(salesSummaries.reduce((sum, user) => sum + user.shippingRevenue, 0))}
                          <div className="text-xs font-normal text-gray-500 dark:text-gray-400">SHIPPING</div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                          {formatCurrency(
                            salesSummaries.length > 0 
                              ? salesSummaries.reduce((sum, user) => sum + user.avgOrderValue, 0) / salesSummaries.length
                              : 0
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
