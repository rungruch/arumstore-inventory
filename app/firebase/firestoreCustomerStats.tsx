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
  limit,
} from "firebase/firestore";
import { db } from "./clientApp";
import { getAllContacts } from "./firestore";

/**
 * Get customer distribution by group
 * @returns {Promise<Array<{name: string, value: number}>>}
 */
export async function getCustomerGroupDistribution(): Promise<Array<{name: string, value: number}>> {
  try {
    // PERFORMANCE OPTIMIZATION: Use getAllContacts() for complete data
    // instead of arbitrary pagination limit of 500
    const contacts = await getAllContacts();
    
    // Process customer data for group distribution chart
    const groupCounts: { [key: string]: number } = {};
    contacts.forEach((customer: any) => {
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
    // PERFORMANCE OPTIMIZATION: Use getAllContacts() for complete data
    // instead of arbitrary pagination limit of 500
    const contacts = await getAllContacts();
    
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
 * Get top customers by transaction value for current month
 * PERFORMANCE OPTIMIZED: Single query approach instead of N+1 queries
 * @param {number} limit - Maximum number of customers to return
 * @returns {Promise<Array<{id: string, name: string, value: number, transactions: number}>>}
 */
export async function getTopCustomers(limit: number = 10): Promise<Array<{id: string, name: string, value: number, transactions: number}>> {
  try {
    // Calculate the start and end of the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // PERFORMANCE OPTIMIZATION: Get all transactions for the month in a single query
    // instead of querying each customer individually
    const transactionsRef = collection(db, "transactions");
    const q = query(
      transactionsRef,
      where("transaction_type", "==", "SELL"),
      where("created_date", ">=", startOfMonth),
      where("created_date", "<=", endOfMonth),
      where("status", "!=", "CANCELLED"),
      orderBy("created_date", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    
    // Aggregate transactions by customer
    const customerStats: { [clientId: string]: { value: number, transactions: number } } = {};
    
    querySnapshot.forEach(doc => {
      const transaction = doc.data();
      const clientId = transaction.client_id;
      const amount = transaction.total_amount || 0;
      
      if (clientId && amount > 0) {
        if (!customerStats[clientId]) {
          customerStats[clientId] = { value: 0, transactions: 0 };
        }
        customerStats[clientId].value += amount;
        customerStats[clientId].transactions += 1;
      }
    });
    
    
    // Get customer names in batches (Firestore allows up to 10 items per `in` query)
    const customerIds = Object.keys(customerStats);
    const customerData: { [clientId: string]: string } = {};
    
    // Process in batches of 10 to respect Firestore's `in` query limits
    for (let i = 0; i < customerIds.length; i += 10) {
      const batch = customerIds.slice(i, i + 10);
      try {
        const contactsQuery = query(
          collection(db, "contacts"),
          where("client_id", "in", batch)
        );
        const contactsSnapshot = await getDocs(contactsQuery);
        
        contactsSnapshot.forEach(doc => {
          const contact = doc.data();
          if (contact.client_id && contact.name) {
            customerData[contact.client_id] = contact.name;
          }
        });
      } catch (error) {
        console.error(`Error fetching customer names for batch ${i}-${i+10}:`, error);
      }
    }
    
    // Build final results
    const customerResults = Object.entries(customerStats)
      .filter(([clientId]) => customerData[clientId]) // Only include customers we found names for
      .map(([clientId, stats]) => ({
        id: clientId,
        name: customerData[clientId],
        value: stats.value,
        transactions: stats.transactions
      }));
    
    // Sort by transaction value and limit results
    const topCustomers = customerResults
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
    
    return topCustomers;
    
  } catch (error) {
    console.error("Error calculating top customers:", error);
    return [];
  }
}

/**
 * Get cached top customers with hourly refresh (current month only)
 * @param {number} limit - Maximum number of customers to return
 * @returns {Promise<{customers: Array<{id: string, name: string, value: number, transactions: number}>, updated_at: Timestamp}>}
 */
export async function getCachedTopCustomers(limit: number = 10): Promise<{customers: Array<{id: string, name: string, value: number, transactions: number}>, updated_at: Timestamp}> {
  try {
    // Create a monthly-specific cache ID
    const currentDate = new Date();
    const monthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const cacheDocId = `top_customers_${monthYear}_${limit}`;
    
    const docRef = doc(db, "summary_top_customers", cacheDocId);
    const docSnap = await getDoc(docRef);

    let topCustomersData;

    if (!docSnap.exists()) {
      // Cache miss - get fresh data
      topCustomersData = await getTopCustomers(limit);
      
      // Set the data in the hourly_stats document
      await setDoc(docRef, {
        customers: topCustomersData,
        updated_at: Timestamp.now(),
        month_year: monthYear,
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
          month_year: monthYear,
          parameters: {
            limit
          }
        });
      } else {
        // Use cached data
        topCustomersData = cachedData.customers;
      }
    }

  return {
    customers: topCustomersData,
    updated_at: docSnap.exists() ? docSnap.data().updated_at : Timestamp.now()
  };
  } catch (error) {
    console.error("Error fetching cached top customers:", error);
    // Fallback to non-cached function if cache fails
    return {
      customers: await getTopCustomers(limit),
      updated_at: Timestamp.now()
    };
  }
}

/**
 * Get count of active customers for the current month
 * @returns {Promise<number>} - Number of active customers for the current month
 */
export async function getCurrentMonthActiveCustomers(): Promise<number> {
  try {
    // Calculate the start and end of the current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // PERFORMANCE OPTIMIZATION: Query transactions directly instead of N+1 queries
    // Get all transactions for the current month first
    const transactionsRef = collection(db, "transactions");
    const q = query(
      transactionsRef,
      where("transaction_type", "==", "SELL"),
      where("created_date", ">=", startOfMonth),
      where("created_date", "<=", endOfMonth),
      where("status", "!=", "CANCELLED")
    );
    
    const querySnapshot = await getDocs(q);
    
    // Count unique customers from transactions
    const activeCustomerIds = new Set<string>();
    querySnapshot.forEach(doc => {
      const transaction = doc.data();
      if (transaction.client_id) {
        activeCustomerIds.add(transaction.client_id);
      }
    });
    
    return activeCustomerIds.size;
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
