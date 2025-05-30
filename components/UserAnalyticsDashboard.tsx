"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '@/app/firebase/clientApp';
import { getCachedActivityAnalytics } from '@/app/firebase/firestoreActivityCache';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { Activity, Users, Clock, TrendingUp } from 'lucide-react';

interface ActivityMetrics {
  totalActivities: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  peakHour: string;
  activityByType: { name: string; value: number; color: string }[];
  activityByHour: { hour: string; activities: number }[];
  userGrowth: { date: string; users: number }[];
}

interface Props {
  dateRange: { start: string; end: string };
  refreshTrigger: number;
}

  // Custom tooltip for the line chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border shadow-sm rounded">
          <p className="text-sm font-medium text-gray-800 dark:text-black">{`${label} : ${(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  // Memoized expensive calculations
  const calculateMetrics = (logs: any[]): ActivityMetrics => {
    // Calculate metrics
    const totalActivities = logs.length;
    const uniqueUsers = new Set(logs.map(log => log.userId)).size;

    // Activity by type
    const typeMap = new Map();
    logs.forEach(log => {
      const type = log.activityType;
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });

    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
      '#00ff88', '#ff0088', '#8800ff', '#ff8800'
    ];

    const activityByType = Array.from(typeMap.entries()).map(([name, value], index) => ({
      name: getActivityTypeDisplay(name),
      value: value as number,
      color: colors[index % colors.length]
    }));

    // Activity by hour
    const hourMap = new Map();
    for (let i = 0; i < 24; i++) {
      hourMap.set(i, 0);
    }
    
    logs.forEach(log => {
      const hour = log.timestamp.getHours();
      hourMap.set(hour, hourMap.get(hour) + 1);
    });

    const activityByHour = Array.from(hourMap.entries()).map(([hour, activities]) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      activities: activities as number
    }));

    // Find peak hour
    const peakHourEntry = Array.from(hourMap.entries()).reduce((max, current) => 
      current[1] > max[1] ? current : max
    );
    const peakHour = `${peakHourEntry[0].toString().padStart(2, '0')}:00`;

    // Calculate average session duration (simplified - time between first and last activity per user per day)
    const userSessions = new Map();
    logs.forEach(log => {
      const dayKey = `${log.userId}-${log.timestamp.toDateString()}`;
      if (!userSessions.has(dayKey)) {
        userSessions.set(dayKey, {
          start: log.timestamp,
          end: log.timestamp
        });
      } else {
        const session = userSessions.get(dayKey);
        if (log.timestamp < session.start) session.start = log.timestamp;
        if (log.timestamp > session.end) session.end = log.timestamp;
      }
    });

    let totalDuration = 0;
    let sessionCount = 0;
    userSessions.forEach(session => {
      const duration = session.end.getTime() - session.start.getTime();
      if (duration > 0) {
        totalDuration += duration;
        sessionCount++;
      }
    });

    const avgSessionDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000 / 60) : 0; // in minutes

    // User growth (simplified - daily unique users)
    const dayMap = new Map();
    logs.forEach(log => {
      const dayKey = log.timestamp.toDateString();
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, new Set());
      }
      dayMap.get(dayKey).add(log.userId);
    });

    const userGrowth = Array.from(dayMap.entries())
      .map(([date, userSet]) => ({
        date: new Date(date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric' }),
        users: userSet.size
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days

    return {
      totalActivities,
      uniqueUsers,
      avgSessionDuration,
      peakHour,
      activityByType,
      activityByHour,
      userGrowth
    };
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

export default function UserAnalyticsDashboard({ dateRange, refreshTrigger }: Props) {
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    totalActivities: 0,
    uniqueUsers: 0,
    avgSessionDuration: 0,
    peakHour: '',
    activityByType: [],
    activityByHour: [],
    userGrowth: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<boolean | null>(null);
  const PAGE_SIZE = 5000; // Reduced page size for better performance

  useEffect(() => {
    setCurrentPage(1); // Reset page when date range changes
    fetchAnalytics(true); // Reset data on date range change
  }, [dateRange, refreshTrigger]);

  const fetchAnalytics = async (resetData: boolean = false) => {
    try {
      setIsLoading(true);
      
      // Use cached analytics for better performance
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);

      // Get cached analytics data with 15-minute cache duration
      const { metrics: cachedMetrics, cacheHit } = await getCachedActivityAnalytics(
        startDate,
        endDate
      );

      console.log(`📊 Analytics ${cacheHit ? 'cache HIT' : 'cache MISS'} for ${dateRange.start} to ${dateRange.end}`);
      
      // Set metrics directly from cached analytics
      setMetrics(cachedMetrics);
      setCacheStatus(cacheHit);
      setHasMoreData(false); // Analytics doesn't need pagination

    } catch (error) {
      console.error('📊 Analytics Error:', error);
      // Reset metrics on error to prevent showing stale data
      setMetrics({
        totalActivities: 0,
        uniqueUsers: 0,
        avgSessionDuration: 0,
        peakHour: '',
        activityByType: [],
        activityByHour: [],
        userGrowth: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-gray-500 border-solid"></div>
        <span className="ml-2 text-gray-500">กำลังโหลดข้อมูลวิเคราะห์...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cache Status Indicator */}
      {cacheStatus !== null && (
        <div className="lg:col-span-2 mb-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            cacheStatus 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              cacheStatus ? 'bg-green-500' : 'bg-blue-500'
            }`}></div>
            {cacheStatus ? '📊 ข้อมูลแคช (โหลดเร็ว)' : '📊 ข้อมูลใหม่ (อัปเดตล่าสุด)'}
          </div>
        </div>
      )}
      
      {/* Summary Cards */}
      <div className="lg:col-span-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Activity className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">กิจกรรมทั้งหมด</p>
                <p className="text-2xl font-bold">{metrics.totalActivities.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">ผู้ใช้งาน</p>
                <p className="text-2xl font-bold">{metrics.uniqueUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">ระยะเวลาเฉลี่ย</p>
                <p className="text-2xl font-bold">{metrics.avgSessionDuration} นาที</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">ช่วงเวลาที่คึกคัก</p>
                <p className="text-2xl font-bold">{metrics.peakHour}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity by Type - Pie Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">กิจกรรมตามประเภท</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={metrics.activityByType}
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {metrics.activityByType.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Activity by Hour - Bar Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">กิจกรรมตามชั่วโมง</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={metrics.activityByHour}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="activities" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* User Growth - Line Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">ผู้ใช้งานรายวัน (7 วันล่าสุด)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={metrics.userGrowth}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip content={<CustomTooltip />}/>
            <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Load More Button */}
      {hasMoreData && (
        <div className="lg:col-span-2 text-center">
          <button
            onClick={() => fetchAnalytics(false)}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'กำลังโหลด...' : 'โหลดข้อมูลเพิ่มเติม'}
          </button>
          <p className="text-sm text-gray-500 mt-2">
            แสดงข้อมูล {metrics.totalActivities.toLocaleString()} รายการ
          </p>
        </div>
      )}
    </div>
  );
}
