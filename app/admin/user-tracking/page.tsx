"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/app/firebase/clientApp';
import { useAuth } from '@/app/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserAnalyticsDashboard from '@/components/UserAnalyticsDashboard';
import { User, Filter, Calendar, Activity, Clock, Monitor, BarChart3 } from 'lucide-react';

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
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 1 day
    end: new Date().toISOString().split('T')[0]
});
  const [activityType, setActivityType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'analytics' | 'summary' | 'detailed'>('analytics');
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

  const fetchData = async () => {
    if (!currentUser?.uid) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Build query constraints
      const constraints: any[] = [];
      
      // Add user filter if selected
      if (selectedUser) {
        constraints.push(where('userId', '==', selectedUser));
        console.log('Filtering by user:', selectedUser);
      }
      
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
      
      const filteredLogs = logs.filter(log => 
        log.timestamp >= startDate && log.timestamp <= endDate
      );

      console.log('Fetched activity logs:', filteredLogs.length, 'logs');
      setActivityLogs(filteredLogs);

      // Generate user summaries
      if (currentView === 'summary') {
        generateUserSummaries(filteredLogs);
      }
      
    } catch (err: any) {
      console.error('Error fetching activity logs:', err);
      setError(err.message || 'Failed to load activity logs');
    } finally {
      setIsLoading(false);
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
      case 'auth_state_change':
        return <User className="w-4 h-4" />;
      case 'page_mount':
        return <Monitor className="w-4 h-4" />;
      case 'click_interaction':
      case 'keyboard_interaction':
        return <Activity className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getUniqueUsers = () => {
    const userMap = new Map();
    activityLogs.forEach(log => {
      if (!userMap.has(log.userId)) {
        userMap.set(log.userId, {
          userId: log.userId,
          displayName: log.displayName || log.email || log.userId,
          email: log.email
        });
      }
    });
    return Array.from(userMap.values());
  };

  const getUniqueActivityTypes = () => {
    const types = new Set(activityLogs.map(log => log.activityType));
    return Array.from(types);
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">การติดตามผู้ใช้งาน</h1>
            <p className="text-gray-600 dark:text-gray-400">
              ติดตามกิจกรรมและการใช้งานของผู้ใช้ในระบบ
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentView('analytics')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentView === 'analytics' 
              ? 'bg-gray-900 dark:bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              วิเคราะห์
            </button>
            <button
              onClick={() => setCurrentView('summary')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentView === 'summary' 
              ? 'bg-gray-900 dark:bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              ภาพรวม
            </button>
            <button
              onClick={() => setCurrentView('detailed')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentView === 'detailed' 
              ? 'bg-gray-900 dark:bg-gray-800 text-white' 
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              รายละเอียด
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* User Filter */}
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
                  <option key={user.userId} value={user.userId}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Activity Type Filter */}
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

        {/* Summary View */}
        {currentView === 'summary' && (
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
        )}

        {/* Detailed View */}
        {currentView === 'detailed' && (
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
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
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
        )}
      </div>
    </ProtectedRoute>
  );
}
