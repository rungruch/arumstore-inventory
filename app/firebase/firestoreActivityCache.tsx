/**
 * Cached Activity Logs Functions for Performance Optimization
 * 
 * This module provides cached versions of activity log queries to improve performance
 * by reducing frequent Firestore reads for user tracking and analytics.
 */

import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  getDocs, 
  where, 
  doc, 
  getDoc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/app/firebase/clientApp';

export interface CachedActivityLog {
  id: string;
  userId: string;
  displayName?: string;
  email?: string;
  activityType: string;
  timestamp: Date;
  page?: string;
  userAgent?: string;
  element?: string;
  eventType?: string;
  details?: any;
}

export interface ActivityLogMetrics {
  totalActivities: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  peakHour: string;
  activityByType: { name: string; value: number; color: string }[];
  activityByHour: { hour: string; activities: number }[];
  userGrowth: { date: string; users: number }[];
}

/**
 * Get cached activity logs with server-side filtering and pagination
 * @param startDate - Start date for filtering
 * @param endDate - End date for filtering
 * @param pageSize - Number of records per page (default: 100)
 * @param activityType - Optional activity type filter
 * @returns Promise with cached activity logs
 */
export async function getCachedActivityLogs(
  startDate: Date,
  endDate: Date,
  pageSize: number = 100,
  activityType?: string
): Promise<{
  logs: CachedActivityLog[];
  hasMoreData: boolean;
  totalCount: number;
  cacheHit: boolean;
  cacheTimestamp?: Date;
}> {
  try {
    // Create cache key based on parameters
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const typeFilter = activityType || 'all';
    const cacheKey = `activity_logs_${startDateStr}_${endDateStr}_${typeFilter}_${pageSize}`;
    
    // Check for cached data (5-minute cache for activity logs)
    const docRef = doc(db, "activity_logs_cache", cacheKey);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const cachedData = docSnap.data();
      const cacheTime = cachedData.updated_at.seconds;
      const currentTime = Math.floor(Date.now() / 1000);
      const fiveMinutesAgo = currentTime - (5 * 60); // 5-minute cache
      
      if (cacheTime > fiveMinutesAgo) {
        return {
          logs: cachedData.logs.map((log: any) => ({
            ...log,
            timestamp: log.timestamp.toDate()
          })),
          hasMoreData: cachedData.hasMoreData,
          totalCount: cachedData.totalCount,
          cacheHit: true,
          cacheTimestamp: cachedData.updated_at.toDate()
        };
      }
    }
    
    // Cache miss or expired - fetch fresh data
    const freshData = await fetchActivityLogsFromFirestore(startDate, endDate, pageSize, activityType);
    
    // Update cache
    await setDoc(docRef, {
      logs: freshData.logs.map(log => ({
        ...log,
        timestamp: Timestamp.fromDate(log.timestamp)
      })),
      hasMoreData: freshData.hasMoreData,
      totalCount: freshData.totalCount,
      updated_at: Timestamp.now(),
      parameters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        pageSize,
        activityType: activityType || null
      }
    });
    
    return {
      ...freshData,
      cacheHit: false
    };
    
  } catch (error) {
    console.error("Error in getCachedActivityLogs:", error);
    // Fallback to direct fetch if cache fails
    const fallbackData = await fetchActivityLogsFromFirestore(startDate, endDate, pageSize, activityType);
    return {
      ...fallbackData,
      cacheHit: false
    };
  }
}

/**
 * Fetch activity logs directly from Firestore with optimized queries
 */
async function fetchActivityLogsFromFirestore(
  startDate: Date,
  endDate: Date,
  pageSize: number,
  activityType?: string
): Promise<{
  logs: CachedActivityLog[];
  hasMoreData: boolean;
  totalCount: number;
}> {
  try {
    // Build query constraints with server-side filtering
    const constraints: any[] = [
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate)
    ];
    
    // Add activity type filter if specified
    if (activityType) {
      constraints.push(where('activityType', '==', activityType));
    }
    
    // Add ordering and limit
    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(pageSize));
    
    // Execute query
    const activityQuery = query(collection(db, 'activity_logs'), ...constraints);
    const snapshot = await getDocs(activityQuery);
    
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date()
    })) as CachedActivityLog[];
    
    return {
      logs,
      hasMoreData: logs.length === pageSize,
      totalCount: logs.length
    };
    
  } catch (error) {
    console.error("Error fetching activity logs from Firestore:", error);
    return {
      logs: [],
      hasMoreData: false,
      totalCount: 0
    };
  }
}

/**
 * Get cached activity analytics with optimized calculations
 * @param startDate - Start date for filtering
 * @param endDate - End date for filtering
 * @returns Promise with cached analytics metrics
 */
export async function getCachedActivityAnalytics(
  startDate: Date,
  endDate: Date
): Promise<{
  metrics: ActivityLogMetrics;
  cacheHit: boolean;
  cacheTimestamp?: Date;
}> {
  try {
    // Create cache key for analytics
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    const cacheKey = `activity_analytics_${startDateStr}_${endDateStr}`;
    
    // Check for cached analytics (15-minute cache)
    const docRef = doc(db, "activity_analytics_cache", cacheKey);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const cachedData = docSnap.data();
      const cacheTime = cachedData.updated_at.seconds;
      const currentTime = Math.floor(Date.now() / 1000);
      const fifteenMinutesAgo = currentTime - (15 * 60); // 15-minute cache
      
      if (cacheTime > fifteenMinutesAgo) {
        return {
          metrics: cachedData.metrics,
          cacheHit: true,
          cacheTimestamp: cachedData.updated_at.toDate()
        };
      }
    }
    
    // Cache miss or expired - calculate fresh analytics
    const metrics = await calculateActivityAnalytics(startDate, endDate);
    
    // Update cache
    await setDoc(docRef, {
      metrics,
      updated_at: Timestamp.now(),
      parameters: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    
    return {
      metrics,
      cacheHit: false
    };
    
  } catch (error) {
    console.error("Error in getCachedActivityAnalytics:", error);
    // Fallback to direct calculation
    const metrics = await calculateActivityAnalytics(startDate, endDate);
    return {
      metrics,
      cacheHit: false
    };
  }
}

/**
 * Calculate activity analytics with optimized queries
 */
async function calculateActivityAnalytics(
  startDate: Date,
  endDate: Date
): Promise<ActivityLogMetrics> {
  try {
    // Use optimized query with smaller sample size for analytics
    const ANALYTICS_SAMPLE_SIZE = 5000; // Reduced sample size for better performance
    
    const activityQuery = query(
      collection(db, 'activity_logs'),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'desc'),
      limit(ANALYTICS_SAMPLE_SIZE)
    );
    
    const snapshot = await getDocs(activityQuery);
    const logs = snapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date()
    })) as any[];
    
    // Calculate metrics efficiently
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
    
    // Calculate average session duration (simplified)
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
    
    const avgSessionDuration = sessionCount > 0 ? Math.round(totalDuration / sessionCount / 1000 / 60) : 0;
    
    // User growth (daily unique users)
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
    
  } catch (error) {
    console.error("Error calculating activity analytics:", error);
    return {
      totalActivities: 0,
      uniqueUsers: 0,
      avgSessionDuration: 0,
      peakHour: '',
      activityByType: [],
      activityByHour: [],
      userGrowth: []
    };
  }
}

/**
 * Get display name for activity types
 */
function getActivityTypeDisplay(type: string): string {
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
}

/**
 * Clear activity logs cache (useful for testing or forced refresh)
 */
export async function clearActivityLogsCache(): Promise<void> {
  try {
    // Note: This would require a more sophisticated cache management system
    // For now, we rely on the TTL-based cache expiration
    console.log("Activity logs cache will expire based on TTL");
  } catch (error) {
    console.error("Error clearing activity logs cache:", error);
  }
}
