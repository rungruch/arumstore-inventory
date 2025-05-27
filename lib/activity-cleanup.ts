/**
 * Activity Data Cleanup Utility
 * 
 * This module provides functions to clean up activity tracking data
 * older than 3 months to maintain database performance and storage costs.
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  Timestamp,
  orderBy,
  limit 
} from "firebase/firestore";
import { db } from '@/app/firebase/clientApp';

const CLEANUP_BATCH_SIZE = 500; // Firestore batch limit
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000; // 90 days in milliseconds
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds

/**
 * Remove activity logs older than 3 months
 * @param dryRun - If true, only counts records without deleting them
 * @returns Promise with cleanup statistics
 */
export async function cleanupOldActivityLogs(dryRun: boolean = false): Promise<{
  totalProcessed: number;
  totalDeleted: number;
  batchesProcessed: number;
  oldestRecordDate: Date | null;
  newestRecordDate: Date | null;
  estimatedCostSavings: number;
  errors: string[];
}> {
  const stats = {
    totalProcessed: 0,
    totalDeleted: 0,
    batchesProcessed: 0,
    oldestRecordDate: null as Date | null,
    newestRecordDate: null as Date | null,
    estimatedCostSavings: 0,
    errors: [] as string[]
  };

  try {
    // Calculate cutoff date (3 months ago)
    const cutoffDate = new Date(Date.now() - THREE_MONTHS_MS);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    console.log(`Starting activity log cleanup - ${dryRun ? 'DRY RUN' : 'LIVE DELETION'}`);
    console.log(`Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`Will ${dryRun ? 'count' : 'delete'} records older than ${cutoffDate.toLocaleDateString()}`);

    let hasMore = true;
    let batchCount = 0;

    while (hasMore) {
      try {
        // Query for old activity logs
        const oldLogsQuery = query(
          collection(db, 'activity_logs'),
          where('timestamp', '<', cutoffTimestamp),
          orderBy('timestamp', 'asc'),
          limit(CLEANUP_BATCH_SIZE)
        );

        const snapshot = await getDocs(oldLogsQuery);
        
        if (snapshot.empty) {
          hasMore = false;
          console.log('No more old records found');
          break;
        }

        const docs = snapshot.docs;
        stats.totalProcessed += docs.length;
        batchCount++;

        // Track date ranges
        const timestamps = docs
          .map(doc => doc.data().timestamp?.toDate?.())
          .filter(date => date instanceof Date) as Date[];

        if (timestamps.length > 0) {
          const sortedDates = timestamps.sort((a, b) => a.getTime() - b.getTime());
          if (!stats.oldestRecordDate || sortedDates[0] < stats.oldestRecordDate) {
            stats.oldestRecordDate = sortedDates[0];
          }
          if (!stats.newestRecordDate || sortedDates[sortedDates.length - 1] > stats.newestRecordDate) {
            stats.newestRecordDate = sortedDates[sortedDates.length - 1];
          }
        }

        if (!dryRun) {
          // Create batch for deletion
          const batch = writeBatch(db);
          
          docs.forEach(doc => {
            batch.delete(doc.ref);
          });

          // Execute batch deletion
          await batch.commit();
          stats.totalDeleted += docs.length;
        }

        stats.batchesProcessed++;
        
        console.log(`Batch ${batchCount}: ${dryRun ? 'Found' : 'Deleted'} ${docs.length} records`);
        
        // If we got fewer docs than the limit, we're done
        if (docs.length < CLEANUP_BATCH_SIZE) {
          hasMore = false;
        }

        // Add small delay to avoid overwhelming Firestore
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (batchError) {
        const errorMsg = `Error in batch ${batchCount}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`;
        console.error(errorMsg);
        stats.errors.push(errorMsg);
        
        // Continue with next batch on error
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Calculate estimated cost savings (approximate)
    // Firestore charges per document read/write/delete
    // Estimate: $0.06 per 100,000 document operations
    stats.estimatedCostSavings = (stats.totalDeleted / 100000) * 0.06;

  } catch (error) {
    const errorMsg = `Failed to cleanup activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    stats.errors.push(errorMsg);
  }

  return stats;
}

/**
 * Remove activity logs older than 2 months (for regular maintenance)
 * @param dryRun - If true, only counts records without deleting them
 * @returns Promise with cleanup statistics
 */
export async function cleanupOldActivityLogs2Months(dryRun: boolean = false): Promise<{
  totalProcessed: number;
  totalDeleted: number;
  batchesProcessed: number;
  oldestRecordDate: Date | null;
  newestRecordDate: Date | null;
  estimatedCostSavings: number;
  errors: string[];
}> {
  const stats = {
    totalProcessed: 0,
    totalDeleted: 0,
    batchesProcessed: 0,
    oldestRecordDate: null as Date | null,
    newestRecordDate: null as Date | null,
    estimatedCostSavings: 0,
    errors: [] as string[]
  };

  try {
    // Calculate cutoff date (2 months ago)
    const cutoffDate = new Date(Date.now() - TWO_MONTHS_MS);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    console.log(`🧹 Starting 2-month activity cleanup. Removing records older than: ${cutoffDate.toISOString()}`);

    let hasMore = true;
    
    while (hasMore) {
      try {
        // Query old records in batches
        const oldLogsQuery = query(
          collection(db, 'activity_logs'),
          where('timestamp', '<', cutoffTimestamp),
          orderBy('timestamp', 'asc'),
          limit(CLEANUP_BATCH_SIZE)
        );

        const snapshot = await getDocs(oldLogsQuery);
        const docs = snapshot.docs;
        
        if (docs.length === 0) {
          hasMore = false;
          break;
        }

        stats.totalProcessed += docs.length;

        // Track date ranges
        const timestamps = docs
          .map(doc => doc.data().timestamp?.toDate?.())
          .filter(date => date instanceof Date) as Date[];

        if (timestamps.length > 0) {
          const sortedDates = timestamps.sort((a, b) => a.getTime() - b.getTime());
          if (!stats.oldestRecordDate || sortedDates[0] < stats.oldestRecordDate) {
            stats.oldestRecordDate = sortedDates[0];
          }
          if (!stats.newestRecordDate || sortedDates[sortedDates.length - 1] > stats.newestRecordDate) {
            stats.newestRecordDate = sortedDates[sortedDates.length - 1];
          }
        }

        if (!dryRun) {
          // Create batch for deletion
          const batch = writeBatch(db);
          
          docs.forEach(doc => {
            batch.delete(doc.ref);
          });

          // Execute batch deletion
          await batch.commit();
          stats.totalDeleted += docs.length;
          
          console.log(`🗑️ Deleted batch of ${docs.length} old activity logs`);
        } else {
          console.log(`📊 Found batch of ${docs.length} old activity logs (dry run)`);
        }

        stats.batchesProcessed++;

        // If we got fewer documents than the batch size, we're done
        if (docs.length < CLEANUP_BATCH_SIZE) {
          hasMore = false;
        }

        // Small delay to avoid overwhelming Firestore
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (batchError: any) {
        const errorMsg = `Batch ${stats.batchesProcessed + 1} error: ${batchError.message}`;
        console.error('🚨 Cleanup batch error:', batchError);
        stats.errors.push(errorMsg);
        
        // Continue with next batch instead of failing completely
        continue;
      }
    }

    // Estimate cost savings (rough calculation)
    stats.estimatedCostSavings = stats.totalDeleted * 0.002; // Rough estimate per document

    console.log(`✅ 2-month cleanup completed:`, {
      processed: stats.totalProcessed,
      deleted: stats.totalDeleted,
      batches: stats.batchesProcessed,
      errors: stats.errors.length
    });

  } catch (error: any) {
    const errorMsg = `Cleanup failed: ${error.message}`;
    console.error('🚨 2-month cleanup error:', error);
    stats.errors.push(errorMsg);
  }

  return stats;
}

/**
 * Get statistics about activity log storage without deleting anything
 * @returns Promise with storage statistics
 */
export async function getActivityLogStats(): Promise<{
  totalRecords: number;
  recordsOlderThan3Months: number;
  oldestRecord: Date | null;
  newestRecord: Date | null;
  recordsByMonth: { [key: string]: number };
  estimatedStorageMB: number;
}> {
  const stats = {
    totalRecords: 0,
    recordsOlderThan3Months: 0,
    oldestRecord: null as Date | null,
    newestRecord: null as Date | null,
    recordsByMonth: {} as { [key: string]: number },
    estimatedStorageMB: 0
  };

  try {
    // Get recent records for total count estimation
    const recentQuery = query(
      collection(db, 'activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(10000) // Sample for estimation
    );

    const recentSnapshot = await getDocs(recentQuery);
    
    if (!recentSnapshot.empty) {
      const cutoffDate = new Date(Date.now() - THREE_MONTHS_MS);
      
      recentSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const timestamp = data.timestamp?.toDate?.();
        
        if (timestamp instanceof Date) {
          stats.totalRecords++;
          
          // Track date ranges
          if (!stats.oldestRecord || timestamp < stats.oldestRecord) {
            stats.oldestRecord = timestamp;
          }
          if (!stats.newestRecord || timestamp > stats.newestRecord) {
            stats.newestRecord = timestamp;
          }
          
          // Count old records
          if (timestamp < cutoffDate) {
            stats.recordsOlderThan3Months++;
          }
          
          // Group by month
          const monthKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
          stats.recordsByMonth[monthKey] = (stats.recordsByMonth[monthKey] || 0) + 1;
        }
      });

      // Estimate storage (rough calculation)
      // Average document size in activity_logs is ~0.5KB
      stats.estimatedStorageMB = (stats.totalRecords * 0.5) / 1024;
    }

  } catch (error) {
    console.error('Failed to get activity log statistics:', error);
  }

  return stats;
}

/**
 * Schedule cleanup to run automatically
 * @param intervalHours - How often to run cleanup (default: 24 hours)
 * @returns Cleanup interval ID
 */
export function scheduleActivityCleanup(intervalHours: number = 24): NodeJS.Timeout {
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  console.log(`Scheduling activity log cleanup every ${intervalHours} hours`);
  
  return setInterval(async () => {
    try {
      console.log('Running scheduled activity log cleanup...');
      const results = await cleanupOldActivityLogs(false);
      
      if (results.totalDeleted > 0) {
        console.log(`Cleanup completed: Deleted ${results.totalDeleted} old activity records`);
        console.log(`Estimated cost savings: $${results.estimatedCostSavings.toFixed(4)}`);
      } else {
        console.log('Cleanup completed: No old records found to delete');
      }
      
      if (results.errors.length > 0) {
        console.warn('Cleanup completed with errors:', results.errors);
      }
      
    } catch (error) {
      console.error('Scheduled cleanup failed:', error);
    }
  }, intervalMs);
}

/**
 * Manual cleanup command for admin use
 * Can be run from admin panel or server-side script
 */
export async function runManualCleanup(options: {
  dryRun?: boolean;
  verbose?: boolean;
} = {}): Promise<void> {
  const { dryRun = false, verbose = true } = options;
  
  if (verbose) {
    console.log('='.repeat(50));
    console.log('ACTIVITY LOG CLEANUP');
    console.log('='.repeat(50));
  }

  // First, get current statistics
  if (verbose) {
    console.log('Getting current statistics...');
    const stats = await getActivityLogStats();
    
    console.log('\nCurrent Statistics:');
    console.log(`- Total records: ${stats.totalRecords.toLocaleString()}`);
    console.log(`- Records older than 3 months: ${stats.recordsOlderThan3Months.toLocaleString()}`);
    console.log(`- Oldest record: ${stats.oldestRecord?.toLocaleDateString() || 'N/A'}`);
    console.log(`- Newest record: ${stats.newestRecord?.toLocaleDateString() || 'N/A'}`);
    console.log(`- Estimated storage: ${stats.estimatedStorageMB.toFixed(2)} MB`);
    
    if (Object.keys(stats.recordsByMonth).length > 0) {
      console.log('\nRecords by month:');
      Object.entries(stats.recordsByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, count]) => {
          console.log(`  ${month}: ${count.toLocaleString()}`);
        });
    }
    
    console.log('\n' + '-'.repeat(50));
  }

  // Run cleanup
  const results = await cleanupOldActivityLogs(dryRun);
  
  if (verbose) {
    console.log('\nCleanup Results:');
    console.log(`- Mode: ${dryRun ? 'DRY RUN' : 'LIVE DELETION'}`);
    console.log(`- Records processed: ${results.totalProcessed.toLocaleString()}`);
    console.log(`- Records ${dryRun ? 'found' : 'deleted'}: ${results.totalDeleted.toLocaleString()}`);
    console.log(`- Batches processed: ${results.batchesProcessed}`);
    console.log(`- Date range: ${results.oldestRecordDate?.toLocaleDateString() || 'N/A'} to ${results.newestRecordDate?.toLocaleDateString() || 'N/A'}`);
    
    if (!dryRun && results.totalDeleted > 0) {
      console.log(`- Estimated cost savings: $${results.estimatedCostSavings.toFixed(4)}`);
    }
    
    if (results.errors.length > 0) {
      console.log('\nErrors encountered:');
      results.errors.forEach(error => console.log(`- ${error}`));
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

/**
 * Quick check to see how many records would be cleaned up (2 months)
 * @returns Promise with count of old records
 */
export async function getOldActivityLogsCount2Months(): Promise<{
  count: number;
  oldestDate: Date | null;
  error?: string;
}> {
  try {
    const cutoffDate = new Date(Date.now() - TWO_MONTHS_MS);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    // Count old records (limit to avoid expensive queries)
    const countQuery = query(
      collection(db, 'activity_logs'),
      where('timestamp', '<', cutoffTimestamp),
      limit(1000) // Sample to get an estimate
    );

    const snapshot = await getDocs(countQuery);
    const docs = snapshot.docs;

    let oldestDate: Date | null = null;
    if (docs.length > 0) {
      const timestamps = docs
        .map(doc => doc.data().timestamp?.toDate?.())
        .filter(date => date instanceof Date) as Date[];
      
      if (timestamps.length > 0) {
        oldestDate = timestamps.sort((a, b) => a.getTime() - b.getTime())[0];
      }
    }

    return {
      count: docs.length,
      oldestDate,
    };

  } catch (error: any) {
    console.error('Error counting old activity logs:', error);
    return {
      count: 0,
      oldestDate: null,
      error: error.message
    };
  }
}
