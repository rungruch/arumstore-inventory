"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  cleanupOldActivityLogs, 
  getActivityLogStats, 
  runManualCleanup 
} from '@/lib/activity-cleanup';
import { 
  Trash2, 
  Database, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  HardDrive,
  DollarSign
} from 'lucide-react';

interface CleanupStats {
  totalProcessed: number;
  totalDeleted: number;
  batchesProcessed: number;
  oldestRecordDate: Date | null;
  newestRecordDate: Date | null;
  estimatedCostSavings: number;
  errors: string[];
}

interface StorageStats {
  totalRecords: number;
  recordsOlderThan3Months: number;
  oldestRecord: Date | null;
  newestRecord: Date | null;
  recordsByMonth: { [key: string]: number };
  estimatedStorageMB: number;
}

export default function ActivityCleanupPage() {
  const { currentUser, loading } = useAuth();
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [cleanupResults, setCleanupResults] = useState<CleanupStats | null>(null);
  const [lastCleanupDate, setLastCleanupDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cleanupMode, setCleanupMode] = useState<'dryRun' | 'live'>('dryRun');

  const loadStorageStats = async () => {
    try {
      setIsLoadingStats(true);
      setError(null);
      const stats = await getActivityLogStats();
      setStorageStats(stats);
    } catch (err: any) {
      console.error('Error loading storage stats:', err);
      setError(err.message || 'Failed to load storage statistics');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const runCleanup = async () => {
    try {
      setIsRunningCleanup(true);
      setError(null);
      setCleanupResults(null);

      const isDryRun = cleanupMode === 'dryRun';
      const results = await cleanupOldActivityLogs(isDryRun);
      
      setCleanupResults(results);
      
      if (!isDryRun && results.totalDeleted > 0) {
        setLastCleanupDate(new Date());
        // Reload stats after successful deletion
        await loadStorageStats();
      }

    } catch (err: any) {
      console.error('Error running cleanup:', err);
      setError(err.message || 'Failed to run cleanup');
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('th-TH').format(num);
  };

  useEffect(() => {
    loadStorageStats();
  }, []);

  if (loading || isLoadingStats) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute module="users" action="delete">
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              การจัดการข้อมูลกิจกรรม
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              ล้างข้อมูลกิจกรรมเก่าเพื่อประหยัดพื้นที่และต้นทุน
            </p>
          </div>
          
          <button
            onClick={loadStorageStats}
            disabled={isLoadingStats}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">เกิดข้อผิดพลาด</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Storage Statistics */}
        {storageStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
              <div className="flex items-center gap-3">
                <Database className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    ข้อมูลทั้งหมด
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(storageStats.totalRecords)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
              <div className="flex items-center gap-3">
                <Trash2 className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    เก่ากว่า 3 เดือน
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatNumber(storageStats.recordsOlderThan3Months)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
              <div className="flex items-center gap-3">
                <HardDrive className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    ขนาดประมาณ
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {storageStats.estimatedStorageMB.toFixed(1)} MB
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    ช่วงข้อมูล
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    {storageStats.oldestRecord?.toLocaleDateString('th-TH') || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    ถึง {storageStats.newestRecord?.toLocaleDateString('th-TH') || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Records by Month */}
        {storageStats && Object.keys(storageStats.recordsByMonth).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ข้อมูลแยกตามเดือน
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(storageStats.recordsByMonth)
                .sort(([a], [b]) => b.localeCompare(a)) // Sort newest first
                .slice(0, 12) // Show last 12 months
                .map(([month, count]) => (
                  <div key={month} className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {month}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatNumber(count)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Cleanup Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ล้างข้อมูลเก่า
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                โหมดการทำงาน
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="cleanupMode"
                    value="dryRun"
                    checked={cleanupMode === 'dryRun'}
                    onChange={(e) => setCleanupMode(e.target.value as 'dryRun' | 'live')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    ทดสอบ (ไม่ลบข้อมูลจริง)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="cleanupMode"
                    value="live"
                    checked={cleanupMode === 'live'}
                    onChange={(e) => setCleanupMode(e.target.value as 'dryRun' | 'live')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                    ลบข้อมูลจริง (ระวัง!)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={runCleanup}
                disabled={isRunningCleanup}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                  cleanupMode === 'live'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50`}
              >
                {isRunningCleanup ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {cleanupMode === 'live' ? 'ลบข้อมูลเก่า' : 'ทดสอบการลบ'}
              </button>

              {lastCleanupDate && (
                <div className="flex items-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">
                    ล้างข้อมูลล่าสุด: {formatDate(lastCleanupDate)}
                  </span>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
              <p className="font-medium mb-1">หมายเหตุ:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>ข้อมูลที่เก่ากว่า 3 เดือน (90 วัน) จะถูกลบออก</li>
                <li>การลบจะทำเป็นชุดๆ ละ 500 รายการ เพื่อไม่ให้กระทบต่อประสิทธิภาพ</li>
                <li>แนะนำให้ทดสอบก่อนการลบจริง</li>
                <li>ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cleanup Results */}
        {cleanupResults && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              ผลการล้างข้อมูล
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">ตรวจสอบแล้ว</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatNumber(cleanupResults.totalProcessed)}
                </p>
              </div>
              
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {cleanupMode === 'live' ? 'ลบแล้ว' : 'พบข้อมูลเก่า'}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatNumber(cleanupResults.totalDeleted)}
                </p>
              </div>
              
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">ชุดที่ประมวลผล</p>
                <p className="text-2xl font-bold text-green-600">
                  {cleanupResults.batchesProcessed}
                </p>
              </div>
              
              {cleanupMode === 'live' && cleanupResults.estimatedCostSavings > 0 && (
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">ประหยัดประมาณ</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${cleanupResults.estimatedCostSavings.toFixed(4)}
                  </p>
                </div>
              )}
            </div>

            {cleanupResults.oldestRecordDate && cleanupResults.newestRecordDate && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  ช่วงข้อมูลที่{cleanupMode === 'live' ? 'ลบ' : 'พบ'}: {' '}
                  {formatDate(cleanupResults.oldestRecordDate)} ถึง {formatDate(cleanupResults.newestRecordDate)}
                </p>
              </div>
            )}

            {cleanupResults.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">ข้อผิดพลาดที่พบ:</h4>
                <ul className="list-disc list-inside space-y-1">
                  {cleanupResults.errors.map((error, index) => (
                    <li key={index} className="text-red-700 text-sm">{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
