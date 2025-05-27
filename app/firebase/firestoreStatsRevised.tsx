import {
  collection,
  query,
  getDocs,
  where,
  doc,
  getDoc
} from "firebase/firestore";

import { db } from "@/app/firebase/clientApp";
import { TransactionType, OrderStatus } from "@/app/firebase/enum";

/**
 * Revised User Sales Summary Interface with correct price logic
 */
export interface RevisedUserSalesSummary {
  userId: string;
  displayName: string;
  totalIncome: number;           // Total revenue from all confirmed orders (APPROVED + SHIPPING)
  transactionCount: number;      // Total number of transactions (excluding CANCELLED)
  itemCount: number;            // Total items sold
  avgOrderValue: number;        // Average order value
  transactionTypes: { [key: string]: number };
  
  // Order status breakdown
  totalOrderCount: number;      // Total orders (excluding CANCELLED)
  pendingOrderCount: number;    // Orders awaiting approval
  approvedOrderCount: number;   // Orders that are approved
  shippingOrderCount: number;   // Orders being shipped
  
  // Revenue breakdown - CORRECTED LOGIC
  confirmedRevenue: number;     // Revenue from APPROVED + SHIPPING orders only
  pendingRevenue: number;       // Revenue from PENDING orders (not yet confirmed)
  approvedRevenue: number;      // Revenue from APPROVED orders only
  shippingRevenue: number;      // Revenue from SHIPPING orders only
  
  totalSum: number;            // Same as totalIncome for backward compatibility
}

/**
 * Revised getSalesSummaryByUser function with correct price calculation logic
 * 
 * Key corrections:
 * 1. Only count APPROVED and SHIPPING orders for confirmed revenue
 * 2. PENDING orders should not be counted in main revenue calculations
 * 3. Proper separation of revenue by order status
 * 4. Uses total_amount (grand_total) which includes VAT, shipping, discounts
 * 5. Filters by display name when userDisplayName is provided
 */
export async function getRevisedSalesSummaryByUser(
  startDate: Date, 
  endDate: Date, 
  userDisplayName?: string
): Promise<RevisedUserSalesSummary[]> {
  try {
    // Create base query conditions - no user filter in initial query
    // We'll filter by display name after getting the data since display name is derived from created_by
    let conditions = [
      where("transaction_type", "==", TransactionType.SELL),
      where("created_date", ">=", startDate),
      where("created_date", "<=", endDate)
    ];

    const q = query(collection(db, "transactions"), ...conditions);
    const querySnapshot = await getDocs(q);
    
    // Group transactions by user
    const userSalesMap = new Map<string, {
      totalIncome: number;
      transactionCount: number;
      itemCount: number;
      transactionTypes: { [key: string]: number };
      
      totalOrderCount: number;
      pendingOrderCount: number;
      approvedOrderCount: number;
      shippingOrderCount: number;
      
      confirmedRevenue: number;
      pendingRevenue: number;
      approvedRevenue: number;
      shippingRevenue: number;
      
      displayName?: string; // Store display name directly from transaction
    }>();

    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      
      // Skip cancelled orders completely
      if (data.status === OrderStatus.CANCELLED) {
        continue;
      }
      
      const createdBy = data.created_by || 'unknown';
      
      // Initialize user data if not exists
      if (!userSalesMap.has(createdBy)) {
        userSalesMap.set(createdBy, {
          totalIncome: 0,
          transactionCount: 0,
          itemCount: 0,
          transactionTypes: {},
          totalOrderCount: 0,
          pendingOrderCount: 0,
          approvedOrderCount: 0,
          shippingOrderCount: 0,
          confirmedRevenue: 0,
          pendingRevenue: 0,
          approvedRevenue: 0,
          shippingRevenue: 0,
          displayName: undefined
        });
      }

      const userSales = userSalesMap.get(createdBy)!;
      
      // Use total_amount which includes VAT, shipping, discounts - the final amount customer pays
      const orderRevenue = data.total_amount || data.grand_total || 0;
      
      // Count all non-cancelled transactions
      userSales.transactionCount += 1;
      userSales.totalOrderCount += 1;
      
      // Count by status and track revenue per status
      switch (data.status) {
        case OrderStatus.PENDING:
          userSales.pendingOrderCount += 1;
          userSales.pendingRevenue += orderRevenue;
          // PENDING orders are not counted in confirmed revenue or total income
          break;
          
        case OrderStatus.APPROVED:
          userSales.approvedOrderCount += 1;
          userSales.approvedRevenue += orderRevenue;
          userSales.confirmedRevenue += orderRevenue;
          userSales.totalIncome += orderRevenue; // Only confirmed orders count towards total income
          break;
          
        case OrderStatus.SHIPPING:
          userSales.shippingOrderCount += 1;
          userSales.shippingRevenue += orderRevenue;
          userSales.confirmedRevenue += orderRevenue;
          userSales.totalIncome += orderRevenue; // Only confirmed orders count towards total income
          break;
          
        default:
          // For any other status, include in total income as well
          userSales.totalIncome += orderRevenue;
          break;
      }
      
      // Count items (from all non-cancelled orders)
      if (data.items && Array.isArray(data.items)) {
        userSales.itemCount += data.items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      }

      // Count transaction types
      const transactionTypeKey = data.sub_type || 'standard';
      userSales.transactionTypes[transactionTypeKey] = (userSales.transactionTypes[transactionTypeKey] || 0) + 1;

      // Set user display name from transaction's created_by field (already contains displayName or email)
      if (!userSales.displayName) {
        userSales.displayName = data.created_by || `User ${createdBy.substring(0, 8)}`;
      }
    }

    // Filter by display name if specified (after processing all transactions)
    let filteredUserSalesMap = userSalesMap;
    if (userDisplayName) {
      filteredUserSalesMap = new Map();
      for (const [userId, userData] of userSalesMap.entries()) {
        // Case-insensitive partial match for display name
        if (userData.displayName && userData.displayName.toLowerCase().includes(userDisplayName.toLowerCase())) {
          filteredUserSalesMap.set(userId, userData);
        }
      }
    }

    // Convert map to array and calculate averages
    const result: RevisedUserSalesSummary[] = Array.from(filteredUserSalesMap.entries()).map(([userId, data]) => ({
      userId,
      displayName: data.displayName || `User ${userId.substring(0, 8)}`,
      totalIncome: data.totalIncome, // Only from APPROVED + SHIPPING orders
      transactionCount: data.transactionCount,
      itemCount: data.itemCount,
      avgOrderValue: data.transactionCount > 0 ? data.totalIncome / data.transactionCount : 0,
      transactionTypes: data.transactionTypes,
      
      totalOrderCount: data.totalOrderCount,
      pendingOrderCount: data.pendingOrderCount,
      approvedOrderCount: data.approvedOrderCount,
      shippingOrderCount: data.shippingOrderCount,
      
      confirmedRevenue: data.confirmedRevenue,
      pendingRevenue: data.pendingRevenue,
      approvedRevenue: data.approvedRevenue,
      shippingRevenue: data.shippingRevenue,
      
      totalSum: data.totalIncome // For backward compatibility
    }));

    // Sort by total income descending
    return result.sort((a, b) => b.totalIncome - a.totalIncome);

  } catch (error) {
    console.error("Error getting revised sales summary by user:", error);
    throw error;
  }
}

/**
 * Additional helper function to get sales summary with business logic explanation
 */
export async function getSalesSummaryWithBusinessLogic(
  startDate: Date, 
  endDate: Date, 
  userDisplayName?: string
): Promise<{
  summaries: RevisedUserSalesSummary[];
  businessLogic: {
    explanation: string;
    revenueCalculation: string;
    statusMeaning: { [key: string]: string };
  };
}> {
  const summaries = await getRevisedSalesSummaryByUser(startDate, endDate, userDisplayName);
  
  return {
    summaries,
    businessLogic: {
      explanation: "ระบบคำนวณยอดขายตามสถานะของออเดอร์ เฉพาะออเดอร์ที่ได้รับการอนุมัติและจัดส่งแล้วเท่านั้นที่จะนับเป็นรายได้จริง",
      revenueCalculation: "รายได้รวม = ออเดอร์ที่อนุมัติแล้ว (APPROVED) + ออเดอร์ที่กำลังจัดส่ง (SHIPPING)",
      statusMeaning: {
        "PENDING": "รอการอนุมัติ - ยังไม่นับเป็นรายได้",
        "APPROVED": "อนุมัติแล้ว - นับเป็นรายได้ยืนยัน",
        "SHIPPING": "กำลังจัดส่ง - นับเป็นรายได้ยืนยัน",
        "CANCELLED": "ยกเลิก - ไม่นับในสถิติใดๆ"
      }
    }
  };
}
