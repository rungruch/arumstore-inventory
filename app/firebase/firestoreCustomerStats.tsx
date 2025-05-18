import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  setDoc, 
  where, 
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "./clientApp";
import { getContactsPaginated, getSellTransactionsByClientId } from "./firestore";

/**
 * Get customer distribution by group
 * @returns {Promise<Array<{name: string, value: number}>>}
 */
export async function getCustomerGroupDistribution(): Promise<Array<{name: string, value: number}>> {
  try {
    // Get all customers with pagination (first page with a larger size)
    const { contacts } = await getContactsPaginated(null, 500);
    
    // Process customer data for group distribution chart
    const groupCounts: { [key: string]: number } = {};
    contacts.forEach(customer => {
      const group = 'group' in customer ? customer.group || 'ไม่ระบุกลุ่ม' : 'ไม่ระบุกลุ่ม';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });
    
    const groupChartData = Object.entries(groupCounts).map(([group, count]) => ({
      name: group,
      value: count
    }));
    
    return groupChartData;
  } catch (error) {
    console.error("Error calculating customer group distribution:", error);
    return [];
  }
}

/**
 * Get cached customer distribution by group with hourly refresh
 * @returns {Promise<Array<{name: string, value: number}>>}
 */
export async function getCachedCustomerGroupDistribution(): Promise<Array<{name: string, value: number}>> {
  try {
    const cacheDocId = "customer_group_distribution";
    
    const docRef = doc(db, "hourly_stats", cacheDocId);
    const docSnap = await getDoc(docRef);

    let distributionData;

    if (!docSnap.exists()) {
      // Cache miss - get fresh data
      distributionData = await getCustomerGroupDistribution();
      
      // Set the data in the hourly_stats document
      await setDoc(docRef, {
        distribution: distributionData,
        updated_at: Timestamp.now()
      });
    } else {
      const cachedData = docSnap.data();
      
      // If the data is older than 1 hour, refresh it
      if (cachedData.updated_at.seconds < Date.now() / 1000 - 3600) {
        // Cache expired - get fresh data
        distributionData = await getCustomerGroupDistribution();
        
        // Update the cached data
        await setDoc(docRef, {
          distribution: distributionData,
          updated_at: Timestamp.now()
        });
      } else {
        // Use cached data
        distributionData = cachedData.distribution;
      }
    }

    return distributionData;
  } catch (error) {
    console.error("Error fetching cached customer group distribution:", error);
    // Fallback to non-cached function if cache fails
    return getCustomerGroupDistribution();
  }
}

/**
 * Get customer distribution by province
 * @returns {Promise<Array<{name: string, value: number}>>}
 */
export async function getCustomerProvinceDistribution(): Promise<Array<{name: string, value: number}>> {
  try {
    // Get all customers with pagination (first page with a larger size)
    const { contacts } = await getContactsPaginated(null, 500);
    
    // Process customer data for province distribution chart
    const provinceCounts: Record<string, number> = {};
    contacts.forEach((customer: any) => {
      const province = customer.province ? customer.province : 'ไม่ระบุจังหวัด';
      provinceCounts[province] = (provinceCounts[province] || 0) + 1;
    });
    
    const provinceChartData = Object.entries(provinceCounts).map(([province, count]) => ({
      name: province,
      value: count
    }));
    
    return provinceChartData;
  } catch (error) {
    console.error("Error calculating customer province distribution:", error);
    return [];
  }
}

/**
 * Get cached customer distribution by province with hourly refresh
 * @returns {Promise<Array<{name: string, value: number}>>}
 */
export async function getCachedCustomerProvinceDistribution(): Promise<Array<{name: string, value: number}>> {
  try {
    const cacheDocId = "customer_province_distribution";
    
    const docRef = doc(db, "hourly_stats", cacheDocId);
    const docSnap = await getDoc(docRef);

    let distributionData;

    if (!docSnap.exists()) {
      // Cache miss - get fresh data
      distributionData = await getCustomerProvinceDistribution();
      
      // Set the data in the hourly_stats document
      await setDoc(docRef, {
        distribution: distributionData,
        updated_at: Timestamp.now()
      });
    } else {
      const cachedData = docSnap.data();
      
      // If the data is older than 1 hour, refresh it
      if (cachedData.updated_at.seconds < Date.now() / 1000 - 3600) {
        // Cache expired - get fresh data
        distributionData = await getCustomerProvinceDistribution();
        
        // Update the cached data
        await setDoc(docRef, {
          distribution: distributionData,
          updated_at: Timestamp.now()
        });
      } else {
        // Use cached data
        distributionData = cachedData.distribution;
      }
    }

    return distributionData;
  } catch (error) {
    console.error("Error fetching cached customer province distribution:", error);
    // Fallback to non-cached function if cache fails
    return getCustomerProvinceDistribution();
  }
}

/**
 * Get top customers by transaction value
 * @param {number} limit - Maximum number of customers to return
 * @returns {Promise<Array<{id: string, name: string, value: number, transactions: number}>>}
 */
export async function getTopCustomers(limit: number = 10): Promise<Array<{id: string, name: string, value: number, transactions: number}>> {
  try {
    // Implementation here...
    // This would be a complex operation involving retrieving contacts and their transactions
    
    // For sample implementation, you'd call existing methods and aggregate the data
    // Similar to what you're doing in your customer dashboard page
    
    return []; // Replace with actual implementation
  } catch (error) {
    console.error("Error calculating top customers:", error);
    return [];
  }
}

/**
 * Get cached top customers with hourly refresh
 * @param {number} limit - Maximum number of customers to return
 * @returns {Promise<Array<{id: string, name: string, value: number, transactions: number}>>}
 */
export async function getCachedTopCustomers(limit: number = 10): Promise<Array<{id: string, name: string, value: number, transactions: number}>> {
  try {
    const cacheDocId = `top_customers_${limit}`;
    
    const docRef = doc(db, "hourly_stats", cacheDocId);
    const docSnap = await getDoc(docRef);

    let topCustomersData;

    if (!docSnap.exists()) {
      // Cache miss - get fresh data
      topCustomersData = await getTopCustomers(limit);
      
      // Set the data in the hourly_stats document
      await setDoc(docRef, {
        customers: topCustomersData,
        updated_at: Timestamp.now(),
        parameters: {
          limit
        }
      });
    } else {
      const cachedData = docSnap.data();
      
      // If the data is older than 1 hour, refresh it
      if (cachedData.updated_at.seconds < Date.now() / 1000 - 3600) {
        // Cache expired - get fresh data
        topCustomersData = await getTopCustomers(limit);
        
        // Update the cached data
        await setDoc(docRef, {
          customers: topCustomersData,
          updated_at: Timestamp.now(),
          parameters: {
            limit
          }
        });
      } else {
        // Use cached data
        topCustomersData = cachedData.customers;
      }
    }

    return topCustomersData;
  } catch (error) {
    console.error("Error fetching cached top customers:", error);
    // Fallback to non-cached function if cache fails
    return getTopCustomers(limit);
  }
}

/**
 * Get count of active customers for the current month
 * @returns {Promise<number>} - Number of active customers for the current month
 */
export async function getCurrentMonthActiveCustomers(): Promise<number> {
  try {
    // Get all customers with pagination (first page with a larger size)
    const { contacts } = await getContactsPaginated(null, 100);
    
    // Calculate the start and end of the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Process each customer to check if they have transactions in the current month
    let activeCount = 0;
    
    // Process only first 50 customers for performance
    for (const customer of contacts.slice(0, 50)) {
      try {
        // Check if client_id exists on the customer object or use id as fallback
        const clientId = 'client_id' in customer ? customer.client_id : customer.id;
        const transactions = await getSellTransactionsByClientId(clientId);
        
        // Check if customer has any transactions in the current month
        const hasCurrentMonthTransactions = transactions.some((transaction: any) => {
          if (!transaction.created_date) return false;
          const transactionDate = transaction.created_date.toDate();
          return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
        });
        
        if (hasCurrentMonthTransactions) {
          activeCount++;
        }
      } catch (error) {
        console.error(`Error fetching transactions for customer ${('id' in customer) ? customer.id : customer.client_id}:`, error);
      }
    }
    
    return activeCount;
  } catch (error) {
    console.error("Error calculating current month active customers:", error);
    return 0;
  }
}

/**
 * Get cached count of active customers for the current month with hourly refresh
 * @returns {Promise<number>} - Number of active customers for the current month
 */
export async function getCachedCurrentMonthActiveCustomers(): Promise<number> {
  try {
    // Create a monthly-specific cache ID to ensure it refreshes for new months
    const currentDate = new Date();
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const cacheDocId = `active_customers_${monthYear}`;
    
    const docRef = doc(db, "hourly_stats", cacheDocId);
    const docSnap = await getDoc(docRef);

    let activeCustomersCount;

    if (!docSnap.exists()) {
      // Cache miss - get fresh data
      activeCustomersCount = await getCurrentMonthActiveCustomers();
      
      // Set the data in the hourly_stats document
      await setDoc(docRef, {
        count: activeCustomersCount,
        updated_at: Timestamp.now(),
        month_year: monthYear
      });
    } else {
      const cachedData = docSnap.data();
      
      // If the data is older than 1 hour, refresh it
      if (cachedData.updated_at.seconds < Date.now() / 1000 - 3600) {
        // Cache expired - get fresh data
        activeCustomersCount = await getCurrentMonthActiveCustomers();
        
        // Update the cached data
        await setDoc(docRef, {
          count: activeCustomersCount,
          updated_at: Timestamp.now(),
          month_year: monthYear
        });
      } else {
        // Use cached data
        activeCustomersCount = cachedData.count;
      }
    }

    return activeCustomersCount;
  } catch (error) {
    console.error("Error fetching cached current month active customers:", error);
    // Fallback to non-cached function if cache fails
    return getCurrentMonthActiveCustomers();
  }
}
