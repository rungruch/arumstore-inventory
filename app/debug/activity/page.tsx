"use client";

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/clientApp';
import { useAuth } from '@/app/contexts/AuthContext';

export default function ActivityDebugPage() {
  const { currentUser, loading } = useAuth();
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivityLogs() {
      if (!currentUser?.uid) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Create query for activity logs
        const activityQuery = query(
          collection(db, 'activity_logs'),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        
        const activitySnapshot = await getDocs(activityQuery);
        const logs = activitySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }));
        
        setActivityLogs(logs);
      } catch (err: any) {
        console.error('Error fetching activity logs:', err);
        setError(err.message || 'Failed to load activity logs');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchActivityLogs();
  }, [currentUser?.uid]);
  
  // Helper function to format timestamps
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
  
  if (loading || isLoading) {
    return <div className="p-8 flex justify-center">กำลังโหลด...</div>;
  }
  
  if (error) {
    return <div className="p-8 text-red-500">Error: {error}</div>;
  }
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Activity Logs Debug</h1>
      
      {activityLogs.length === 0 ? (
        <p>ไม่พบ Activity Logs</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Time</th>
                <th className="border p-2 text-left">User</th>
                <th className="border p-2 text-left">Activity Type</th>
                <th className="border p-2 text-left">Page</th>
                <th className="border p-2 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {activityLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="border p-2">{formatDate(log.timestamp)}</td>
                  <td className="border p-2">{log.displayName || log.email || log.userId}</td>
                  <td className="border p-2">{log.activityType}</td>
                  <td className="border p-2">{log.metadata?.page || '-'}</td>
                  <td className="border p-2">
                    <details>
                      <summary>View Details</summary>
                      <pre className="text-xs mt-2 p-2 bg-gray-100 rounded">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
