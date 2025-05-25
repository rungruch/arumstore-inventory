import { doc, getDoc } from "firebase/firestore";
import { db } from "@/app/firebase/clientApp";

/**
 * Get the latest cache timestamp from various cache sources
 * @param cacheKeys - Array of cache document IDs to check
 * @returns Promise<string> - Formatted timestamp string in Thai locale
 */
export async function getCacheTimestamp(cacheKeys: string[]): Promise<string> {
  try {
    const cacheTimestamps: Date[] = [];
    
    // Check each cache document for timestamps
    for (const cacheKey of cacheKeys) {
      try {
        const cacheDoc = await getDoc(doc(db, "hourly_stats", cacheKey));
        if (cacheDoc.exists()) {
          const data = cacheDoc.data();
          const timestamp = data.updated_at?.toDate() || data.created_date?.toDate();
          if (timestamp) {
            cacheTimestamps.push(timestamp);
          }
        }
      } catch (error) {
        console.warn(`Failed to get timestamp for cache key: ${cacheKey}`, error);
      }
    }
    
    // Get the most recent timestamp
    if (cacheTimestamps.length > 0) {
      const latestTimestamp = new Date(Math.max(...cacheTimestamps.map(t => t.getTime())));
      return latestTimestamp.toLocaleString('th-TH');
    }
    
    return "ไม่พบข้อมูลแคช";
  } catch (error) {
    console.error("Error getting cache timestamp:", error);
    return "ไม่สามารถโหลดเวลาแคชได้";
  }
}

/**
 * Get cache timestamp for specific cache collections (like purchases_by_supplier_cache)
 * @param collection - Collection name
 * @param docIds - Array of document IDs to check
 * @returns Promise<string> - Formatted timestamp string in Thai locale
 */
export async function getCacheTimestampFromCollection(collection: string, docIds: string[]): Promise<string> {
  try {
    const cacheTimestamps: Date[] = [];
    
    // Check each cache document for timestamps
    for (const docId of docIds) {
      try {
        const cacheDoc = await getDoc(doc(db, collection, docId));
        if (cacheDoc.exists()) {
          const data = cacheDoc.data();
          const timestamp = data.updated_at?.toDate() || data.created_date?.toDate();
          if (timestamp) {
            cacheTimestamps.push(timestamp);
          }
        }
      } catch (error) {
        console.warn(`Failed to get timestamp for doc: ${docId} in collection: ${collection}`, error);
      }
    }
    
    // Get the most recent timestamp
    if (cacheTimestamps.length > 0) {
      const latestTimestamp = new Date(Math.max(...cacheTimestamps.map(t => t.getTime())));
      return latestTimestamp.toLocaleString('th-TH');
    }
    
    return "ไม่พบข้อมูลแคช";
  } catch (error) {
    console.error("Error getting cache timestamp from collection:", error);
    return "ไม่สามารถโหลดเวลาแคชได้";
  }
}

/**
 * Cache keys for different dashboard pages
 */
export const CACHE_KEYS = {
  CUSTOMER_DASHBOARD: [
    "customer_group_distribution",
    "customer_province_distribution",
    // Active customers cache uses dynamic keys with month_year
  ],
  SALES_DASHBOARD: [
    // Sales cache uses dynamic keys based on date ranges
  ],
  PURCHASE_DASHBOARD: [
    // Purchase cache uses dynamic keys based on date ranges
  ],
  PRODUCT_DASHBOARD: [
    "product_warehouse_count",
    "product_category_count",
    // Low stocks cache uses dynamic keys
  ],
} as const;

/**
 * Get current month cache key for active customers
 */
export function getCurrentMonthActiveCustomersCacheKey(): string {
  const currentDate = new Date();
  const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  return `active_customers_${monthYear}`;
}
