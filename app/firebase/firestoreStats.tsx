import {
    collection,
    query,
    limit,
    getDocs,
    where,
    orderBy,
    Timestamp,
    addDoc,
    setDoc,
    doc,
    getDoc
  } from "firebase/firestore";
  
  import { db } from "@/app/firebase/clientApp";
  import { TransactionType } from "@/app/firebase/enum";
  import { ProductCategoryCount } from "@/app/firebase/interfaces";
  import { OrderStatus } from "@/app/firebase/enum";
  import { MonthlyIncome } from "@/app/firebase/interfaces";
  import { getProductCategoryCount } from "@/app/firebase/firestore";
  
  /**
   * Get today's income summary from sell transactions
   * @param {Date} date - The date to calculate income for (defaults to today)
   * @param {boolean} excludeCancelled - Whether to exclude cancelled orders (default: true)
   * @returns {Promise<{totalIncome: number, transactionCount: number, itemCount: number}>}
   */
  export async function getDailyIncomeSummary(date: Date = new Date(), excludeCancelled: boolean = true): Promise<{
    totalIncome: number;
    transactionCount: number;
    itemCount: number;
  }> {
    // Calculate the start and end of the day (midnight to 11:59:59 PM)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    try {
      // Create base query conditions
      let conditions = [
        where("transaction_type", "==", TransactionType.SELL),
        where("created_date", ">=", startOfDay),
        where("created_date", "<=", endOfDay)
      ];
      
      // Add condition to exclude cancelled orders if specified
      if (excludeCancelled) {
        conditions.push(where("status", "!=", OrderStatus.CANCELLED));
      }
      
      const q = query(
        collection(db, "transactions"),
        ...conditions,
        orderBy("created_date", "desc")
      );
  
      const querySnapshot = await getDocs(q);
      
      let totalIncome = 0;
      let transactionCount = 0;
      let itemCount = 0;
      
      // Process each transaction
      querySnapshot.forEach(doc => {
        const transaction = doc.data();
        transactionCount++;
        
        // Skip if items array is not defined
        if (!transaction.items || !Array.isArray(transaction.items)) {
          return;
        }
        
        // Process each item in the transaction
        transaction.items.forEach(item => {
          const subtotal = item.subtotal || 0;
          const quantity = item.quantity || 0;
          
          totalIncome += subtotal;
          itemCount += quantity;
        });
      });
      
      return {
        totalIncome,
        transactionCount,
        itemCount
      };
      
    } catch (error) {
      console.error("Error calculating daily income summary:", error);
      return {
        totalIncome: 0,
        transactionCount: 0,
        itemCount: 0
      };
    }
  }

  /**
   * Calculate monthly income by SKU from sell transactions
   * @param {Date} date - The month to calculate income for (any date within the month)
   * @param {boolean} excludeCancelled - Whether to exclude cancelled orders (default: true)
   * @returns {Promise<Array<{sku: string, name: string, totalIncome: number, quantity: number}>>}
   */
  export async function getMonthlyIncomeByDate(date: Date = new Date(), excludeCancelled: boolean = true): Promise<MonthlyIncome> {
    // Calculate the start and end of the month
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    
    try {
      // Create base query conditions
      let conditions = [
        where("transaction_type", "==", TransactionType.SELL),
        where("created_date", ">=", startDate),
        where("created_date", "<=", endDate)
      ];
      
      // Add condition to exclude cancelled orders if specified
      if (excludeCancelled) {
        conditions.push(where("status", "!=", OrderStatus.CANCELLED));
      }
      
      const q = query(
        collection(db, "transactions"),
        ...conditions,
        orderBy("created_date", "desc")
      );
  
      const querySnapshot = await getDocs(q);

      
      // Map to track income and quantity by SKU
      const skuIncomeMap = new Map<string, { totalIncome: number, quantity: number, name: string }>();
      
      // Process each transaction
      querySnapshot.forEach(doc => {
        const transaction = doc.data();
        
        // Skip if items array is not defined
        if (!transaction.items || !Array.isArray(transaction.items)) {
          return;
        }
        
        // Process each item in the transaction
        transaction.items.forEach(item => {
          const sku = item.sku;
          const subtotal = item.subtotal || 0;
          const quantity = item.quantity || 0;
          const name = item.name || "Unknown Product";
          
          // Update the running totals for this SKU
          if (skuIncomeMap.has(sku)) {
            const existing = skuIncomeMap.get(sku)!;
            skuIncomeMap.set(sku, {
              totalIncome: existing.totalIncome + subtotal,
              quantity: existing.quantity + quantity,
              name: existing.name
            });
          } else {
            skuIncomeMap.set(sku, {
              totalIncome: subtotal,
              quantity: quantity,
              name: name
            });
          }
        });
      });
      
      // Convert map to array and sort by totalIncome (highest first)
      const result = Array.from(skuIncomeMap.entries()).map(([sku, data]) => ({
        sku,
        name: data.name,
        totalIncome: data.totalIncome,
        quantity: data.quantity
      }));
      
      // Convert result to MonthlyIncome format
      const monthlyIncome: MonthlyIncome = {
        str_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        date: Timestamp.fromDate(new Date()),
        created_date: Timestamp.fromDate(new Date()),
        allIncome: result.reduce((sum, item) => sum + item.totalIncome, 0),
        skus: result.map(item => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          totalIncome: item.totalIncome
        }))
      };

      // Sort by income (highest first)
      return monthlyIncome
      
    } catch (error) {
      console.error("Error calculating monthly income by SKU:", error);
      return {
        str_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        date: Timestamp.fromDate(startDate),
        created_date: Timestamp.fromDate(new Date()),
        allIncome: 0,
        skus: []
      }
    }
  }
  
  /**
   * Get monthly income summary with pagination
   * @param {Date} date - The month to calculate income for
   * @param {number} pageSize - Number of items per page
   * @param {number} page - Page number (1-based)
   * @returns {Promise<{items: Array, total: number, totalIncome: number}>}
   */
  export async function getMonthlyIncomeBySkuPaginated(
    date: Date = new Date(),
    pageSize: number = 10,
    page: number = 1,
    excludeCancelled: boolean = true
  ): Promise<{ items: Array<any>; total: number; totalIncome: number; }> {
    try {
      // Get all items first
      const monthlyIncome = await getMonthlyIncomeByDate(date, excludeCancelled);
      
      // Calculate pagination
      const startIndex = (page - 1) * pageSize;
      const paginatedItems = monthlyIncome.skus.slice(startIndex, startIndex + pageSize);
      
      return {
        items: paginatedItems,
        total: monthlyIncome.skus.length,
        totalIncome: monthlyIncome.allIncome
      };
    } catch (error) {
      console.error("Error getting paginated monthly income:", error);
      return { items: [], total: 0, totalIncome: 0 };
    }
  }

  /**
   * Get monthly income summaries for multiple months
   * @param {number} numberOfMonths - Number of months to include (including current)
   * @returns {Promise<Array<{month: string, year: number, totalIncome: number}>>}
   */
  export async function getPeriodMonthlyIncomeSummary(numberOfMonths: number = 6): Promise<Array<{ month: string; year: number; totalIncome: number; }>> {
    const results = [];
    const currentDate = new Date();
    
    for (let i = 0; i < numberOfMonths; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthlyIncome = await getMonthlyIncomeByDate(targetDate);
      
      const monthName = targetDate.toLocaleString('default', { month: 'long' });
      results.push({
        month: monthName,
        year: targetDate.getFullYear(),
        totalIncome: monthlyIncome.allIncome
      });
    }
    
    return results;
  }

  /**
   * Get total sales for the current year (from January 1st to current date)
   * @param {number} year - The year to calculate sales for (defaults to current year)
   * @param {boolean} excludeCancelled - Whether to exclude cancelled orders (default: true)
   * @returns {Promise<number>} - Total sales amount for the year
   */
  export async function getYearlySales(year: number = new Date().getFullYear(), excludeCancelled: boolean = true): Promise<number> {
    // Calculate the start date (January 1st of the specified year)
    const startDate = new Date(year, 0, 1); // Month is 0-based (0 = January)
    // End date is current date if it's the current year, or December 31st otherwise
    const isCurrentYear = year === new Date().getFullYear();
    const endDate = isCurrentYear 
      ? new Date() 
      : new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
    
    try {
      // Create base query conditions
      let conditions = [
        where("transaction_type", "==", TransactionType.SELL),
        where("created_date", ">=", startDate),
        where("created_date", "<=", endDate)
      ];
      
      // Add condition to exclude cancelled orders if specified
      if (excludeCancelled) {
        conditions.push(where("status", "!=", OrderStatus.CANCELLED));
      }
      
      const q = query(
        collection(db, "transactions"),
        ...conditions,
        orderBy("created_date", "desc")
      );
  
      const querySnapshot = await getDocs(q);
      
      let totalYearlySales = 0;
      
      // Process each transaction
      querySnapshot.forEach(doc => {
        const transaction = doc.data();
        
        // Skip if items array is not defined
        if (!transaction.items || !Array.isArray(transaction.items)) {
          return;
        }
        
        // Process each item in the transaction
        transaction.items.forEach(item => {
          const subtotal = item.subtotal || 0;
          totalYearlySales += subtotal;
        });
      });
      
      return totalYearlySales;
      
    } catch (error) {
      console.error("Error calculating yearly sales:", error);
      return 0;
    }
  }

  /**
   * Get top selling products for a specific month
   * @param {Date} date - The month to analyze
   * @param {number} limit - Maximum number of products to return
   * @returns {Promise<Array<{sku: string, name: string, totalIncome: number, quantity: number}>>}
   */
  export async function getTopSellingProducts(
    date: Date = new Date(), 
    limit: number = 5
  ): Promise<Array<{ sku: string; name: string; totalIncome: number; quantity: number; }>> {
    const monthlyIncome = await getMonthlyIncomeByDate(date);
    
    // Sort products by totalIncome in descending order to get true "top selling" products
    const sortedProducts = [...monthlyIncome.skus].sort((a, b) => b.totalIncome - a.totalIncome);
    
    // Return the top products limited by the limit parameter
    return sortedProducts.slice(0, limit).map(sku => ({
      sku: sku.sku,
      name: sku.name,
      totalIncome: sku.totalIncome,
      quantity: Number(sku.quantity)
    }));
  }


  /**
   * Get products with low stock levels
   * @param {number} threshold - Stock threshold below which products are considered low-stock
   * @param {string} warehouseId - Optional warehouse ID to filter by specific warehouse
   * @returns {Promise<Array<{id: string, sku: string, name: string, stock: number, threshold: number, category: string, warning_threshold: number}>>}
   */
  export async function getLowStocksProducts(
    defaultThreshold: number = 5, 
    warehouseId?: string
  ): Promise<Array<{
    id: string;
    sku: string;
    name: string;
    stock: number;
    threshold: number;
    category: string;
    warehouse_id?: string;
    warehouse_name?: string;
  }>> {
    try {
      // Get all products
      const productsRef = collection(db, "products");
      const productsSnapshot = await getDocs(productsRef);
      
      // Get warehouse names if needed
      const warehouseNames: Record<string, string> = {};
      if (!warehouseId) {
        const warehousesRef = collection(db, "product_warehouse");
        const warehousesSnapshot = await getDocs(warehousesRef);
        warehousesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.warehouse_id && data.warehouse_name) {
            warehouseNames[data.warehouse_id] = data.warehouse_name;
          }
        });
      }
      
      const lowStockProducts = [];
      
      for (const doc of productsSnapshot.docs) {
        const product = doc.data();
        
        // Check if the product has stocks
        if (product.stocks && typeof product.stocks === 'object') {
          if (warehouseId) {
            // Check specific warehouse
            const stockCount = Number(product.stocks[warehouseId] || 0);
            // Use warehouse-specific threshold if defined, otherwise fall back to product default
            const warehouseThresholds = product.warehouse_thresholds || {};
            const productThreshold = warehouseThresholds[warehouseId] || 
                                    product.warning_threshold || 
                                    defaultThreshold;
            
            if (stockCount <= productThreshold) {
              lowStockProducts.push({
                id: doc.id,
                sku: product.sku,
                name: product.name,
                stock: stockCount,
                threshold: productThreshold,
                category: product.category || 'Uncategorized',
                warehouse_id: warehouseId,
                warehouse_name: warehouseNames[warehouseId] || warehouseId
              });
            }
          } else {
            // Check each warehouse individually
            Object.entries(product.stocks).forEach(([wId, stockVal]) => {
              const stockCount = Number(stockVal);
              const warehouseThresholds = product.warehouse_thresholds || {};
              const productThreshold = warehouseThresholds[wId] || 
                                      product.warning_threshold || 
                                      defaultThreshold;
              
              if (stockCount <= productThreshold) {
                lowStockProducts.push({
                  id: doc.id,
                  sku: product.sku,
                  name: product.name,
                  stock: stockCount,
                  threshold: productThreshold,
                  category: product.category || 'Uncategorized',
                  warehouse_id: wId,
                  warehouse_name: warehouseNames[wId] || wId
                });
              }
            });
          }
        }
      }
      
      // Sort by stock level (ascending)
      return lowStockProducts.sort((a, b) => a.stock - b.stock);
      
    } catch (error) {
      console.error("Error fetching low stock products:", error);
      return [];
    }
  }

  /**
   * Get cached low stocks products with hourly refresh
   * Similar to getCachedProductCountByWarehouse's caching approach
   * @param {number} defaultThreshold - Stock threshold below which products are considered low-stock
   * @param {string} warehouseId - Optional warehouse ID to filter by specific warehouse
   * @returns {Promise<Array<{id: string, sku: string, name: string, stock: number, threshold: number, category: string, warehouse_id?: string, warehouse_name?: string}>>}
   */
  export async function getCachedLowStocksProducts(
    defaultThreshold: number = 5, 
    warehouseId?: string
  ): Promise<Array<{
    id: string;
    sku: string;
    name: string;
    stock: number;
    threshold: number;
    category: string;
    warehouse_id?: string;
    warehouse_name?: string;
  }>> {
    try {
      // Create a unique cache ID based on parameters
      const cacheDocId = warehouseId 
        ? `low_stocks_${warehouseId}_${defaultThreshold}` 
        : `low_stocks_all_${defaultThreshold}`;
      
      const docRef = doc(db, "hourly_stats", cacheDocId);
      const docSnap = await getDoc(docRef);

      let lowStocksData;

      if (!docSnap.exists()) {
        // Get fresh low stocks data
        lowStocksData = await getLowStocksProducts(defaultThreshold, warehouseId);
        
        // Set the data in the hourly_stats document
        await setDoc(docRef, {
          products: lowStocksData,
          updated_at: Timestamp.now(),
          parameters: {
            threshold: defaultThreshold,
            warehouseId: warehouseId || "all"
          }
        });
      }
      else {
        const cachedData = docSnap.data();
        
        // If the data is older than 1 hour, refresh it
        if (cachedData.updated_at.seconds < Date.now() / 1000 - 3600) {
          // Get fresh low stocks data
          lowStocksData = await getLowStocksProducts(defaultThreshold, warehouseId);
          
          // Update the cached data
          await setDoc(docRef, {
            products: lowStocksData,
            updated_at: Timestamp.now(),
            parameters: {
              threshold: defaultThreshold,
              warehouseId: warehouseId || "all"
            }
          });
        } else {
          // Use cached data
          lowStocksData = cachedData.products;
        }
      }

      return lowStocksData;
    } catch (error) {
      console.error("Error fetching cached low stocks products:", error);
      // Fallback to non-cached function if cache fails
      return getLowStocksProducts(defaultThreshold, warehouseId);
    }
  }

  /**
   * Get monthly income summaries for a specific product (SKU)
   * @param {string} sku - The SKU of the product
   * @param {number} numberOfMonths - Number of months to include (including current)
   * @returns {Promise<Array<{month: string, year: number, totalIncome: number, quantity: number}>>}
   */
  export async function getProductPeriodMonthlyIncomeSummary(
    sku: string,
    numberOfMonths: number = 6
  ): Promise<Array<{ month: string; year: number; totalIncome: number; quantity: number }>> {
    const results = [];
    const currentDate = new Date();
    
    for (let i = 0; i < numberOfMonths; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthlySales = await getMonthlyIncomeByDate(targetDate);
      const productData = monthlySales.skus.find(item => item.sku === sku);
      
      results.push({
        month: targetDate.toLocaleString('default', { month: 'long' }),
        year: targetDate.getFullYear(),
        totalIncome: productData?.totalIncome || 0,
        quantity: productData ? Number(productData.quantity) : 0
      });
    }
    
    return results;
  }



  /**
   * Get monthly income summary for a specific SKU
   * @param {string} sku - The SKU of the product
   * @param {Date} date - The month to calculate income for
   * @param {boolean} excludeCancelled - Whether to exclude cancelled orders
   * @returns {Promise<{sku: string, name: string, totalIncome: number, quantity: number}>}
   */
  export async function getMonthlyIncomeByDateSku(
    sku: string,
    date: Date = new Date(),
    excludeCancelled: boolean = true
  ): Promise<{ str_date:string; date:Timestamp; sku: string; name: string; totalIncome: number; quantity: number }> {
    try {

      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const docRef = collection(db, "product_monthly_income_summary");
      const docSnap = await getDocs(query(docRef, where("str_date", "==", dateString)));

      if (!docSnap.empty) {
        // If document exists, use it
        let monthlyIncome = docSnap.docs[0].data();
        // Check if the data is from today
        const today = new Date();
        if (monthlyIncome.date.toDate().getDate() !== today.getDate() || 
            monthlyIncome.date.toDate().getMonth() !== today.getMonth() || 
            monthlyIncome.date.toDate().getFullYear() !== today.getFullYear()) {
          // Get updated data
          const updatedIncome = await getMonthlyIncomeByDate(date, excludeCancelled);
          
          // Update the document to product_monthly_income_summary
          await setDoc(doc(docRef, dateString), {
            str_date: updatedIncome.str_date,
            date: updatedIncome.date,
            created_date: updatedIncome.created_date,
            allIncome: updatedIncome.allIncome,
            skus: updatedIncome.skus
          });
          
          // Use updated data
          monthlyIncome = updatedIncome;
        }

        interface SkuSummary {
          sku: string;
          name: string;
          totalIncome: number;
          quantity: number;
        }

        const skuData: SkuSummary | undefined = monthlyIncome.skus.find((item: SkuSummary) => item.sku === sku);
        
        if (skuData) {
          return {
            str_date:monthlyIncome.str_date,
            date: monthlyIncome.date,
            name: skuData.name,
            sku: sku,
            totalIncome: skuData.totalIncome,
            quantity: Number(skuData.quantity)
          };
        }
        else{
          return {
            str_date:monthlyIncome.str_date,
            date:monthlyIncome.date,
            sku: sku,
            name: "Unknown Product or no transaction in this month",
            totalIncome: 0,
            quantity: 0
          }
        }
      }

      // If document doesn't exist, calculate from transactions

      const monthlyIncome = await getMonthlyIncomeByDate(date, excludeCancelled);

      // If not found, add the monthly income to product_monthly_income_summary
      await setDoc(doc(docRef, dateString), {
        str_date: monthlyIncome.str_date,
        date: monthlyIncome.date,
        created_date: monthlyIncome.created_date,
        allIncome: monthlyIncome.allIncome,
        skus: monthlyIncome.skus
      });
      const skuData = monthlyIncome.skus.find(item => item.sku === sku);

      if (!skuData) {
        return {
          str_date:monthlyIncome.str_date,
          date:monthlyIncome.date,
          sku: sku,
          name: "Unknown Product",
          totalIncome: 0,
          quantity: 0
        };
      }

      return {
        str_date:monthlyIncome.str_date,
        date:monthlyIncome.date,
        name: skuData.name,
        sku: sku,
        totalIncome: skuData.totalIncome,
        quantity: Number(skuData.quantity)
      };
    } catch (error) {
      console.error("Error getting monthly income for SKU:", error);
      return {
        str_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        date: Timestamp.fromDate(date),
        sku: sku,
        name: "Unknown Product",
        totalIncome: 0,
        quantity: 0
      };
    }
  }

  /**
   * Get monthly income summaries for a specific product (SKU)
   * @param {string} sku - The SKU of the product
   * @param {number} numberOfMonths - Number of months to include (including current)
   * @returns {Promise<Array<{month: string, year: number, str_date: string, date: Timestamp, totalIncome: number, quantity: number}>>}
   */
  export async function getProductPeriodMonthlyIncomeSummarybySku(
    sku: string,
    numberOfMonths: number = 6
  ): Promise<Array<{ month: string; year: number; str_date: string; date: Timestamp; totalIncome: number; quantity: number }>> {
    const results = [];
    const currentDate = new Date();
    
    for (let i = 0; i < numberOfMonths; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, currentDate.getDate());
      const monthlySales = await getMonthlyIncomeByDateSku(sku, targetDate);
      
      results.push({
        month: targetDate.toLocaleString('default', { month: 'long' }),
        year: targetDate.getFullYear(),
        str_date: monthlySales.str_date,
        date: monthlySales.date,
        totalIncome: monthlySales.totalIncome,
        quantity: monthlySales.quantity
      });
    }
    
    return results;
  }

  /**
   * Count products in each warehouse based on 'stocks' field in products collection
   * @returns {Promise<Array<{warehouse_id: string; warehouse_name: string; count: number; totalIncome: number; totalPendingIncome: number}>>}
   */
  export async function getProductCountByWarehouse(): Promise<Array<{ 
    warehouse_id: string; 
    warehouse_name: string; 
    count: number;
    totalIncome: number;
    totalPendingIncome: number;
  }>> {
    try {
      // Check if we have cached data in hourly_stats collection
      const statsDocRef = doc(db, "hourly_stats", "product_warehouse_count");
      const statsDocSnap = await getDoc(statsDocRef);
      
      // If we have cached data and it's less than 1 hour old, use it
      if (statsDocSnap.exists()) {
        const cachedData = statsDocSnap.data();
        const cachedTime = cachedData.updated_at.seconds;
        const currentTime = Math.floor(Date.now() / 1000);
        
        // If cache is less than 1 hour old (3600 seconds)
        if (currentTime - cachedTime < 3600) {
          return cachedData.warehouses;
        }
      }
      
      // Get all products that have stocks
      const productsRef = collection(db, "products");
      const productsSnapshot = await getDocs(productsRef);
      
      // Get all warehouses to ensure we have their names
      const warehousesRef = collection(db, "product_warehouse");
      const warehousesSnapshot = await getDocs(warehousesRef);
      
      // Create a map of warehouse IDs to warehouse names
      const warehouseMap = new Map<string, string>();
      warehousesSnapshot.forEach(doc => {
        const warehouse = doc.data();
        if (warehouse.warehouse_id && warehouse.warehouse_name) {
          warehouseMap.set(warehouse.warehouse_id, warehouse.warehouse_name);
        }
      });
      
      // Create maps for counts, income, and pending income
      const warehouseCounts = new Map<string, number>();
      const warehouseIncome = new Map<string, number>();
      const warehousePendingIncome = new Map<string, number>();
      
      // Count products in each warehouse and calculate total values
      productsSnapshot.forEach(doc => {
        const product = doc.data();
        const buyPrice = product.price?.buy_price || 0;
        
        if (product.stocks && typeof product.stocks === 'object') {
          // Iterate through the stocks object where keys are warehouse IDs
          Object.entries(product.stocks).forEach(([warehouseId, stockCount]) => {
            const numericCount = Number(stockCount);
            // Only count products with stock > 0
            if (numericCount > 0) {
              warehouseCounts.set(
                warehouseId, 
                (warehouseCounts.get(warehouseId) || 0) + 1
              );
              
              // Calculate stock value
              warehouseIncome.set(
                warehouseId,
                (warehouseIncome.get(warehouseId) || 0) + (numericCount * buyPrice)
              );
            }
          });
        }
        
        // Calculate pending stock values
        if (product.pending_stock && typeof product.pending_stock === 'object') {
          Object.entries(product.pending_stock).forEach(([warehouseId, pendingCount]) => {
            const numericCount = Number(pendingCount);
            if (numericCount > 0) {
              warehousePendingIncome.set(
                warehouseId,
                (warehousePendingIncome.get(warehouseId) || 0) + (numericCount * buyPrice)
              );
            }
          });
        }
      });
      
      // Convert the maps to an array of objects
      const result = Array.from(warehouseMap.keys()).map(warehouseId => ({
        warehouse_id: warehouseId,
        warehouse_name: warehouseMap.get(warehouseId) || warehouseId,
        count: warehouseCounts.get(warehouseId) || 0,
        totalIncome: warehouseIncome.get(warehouseId) || 0,
        totalPendingIncome: warehousePendingIncome.get(warehouseId) || 0
      }));
      
      // Sort by count (highest first)
      result.sort((a, b) => b.count - a.count);
      
      // Store the result in cache for future use
      await setDoc(statsDocRef, {
        warehouses: result,
        updated_at: Timestamp.now()
      });
      
      return result;
    } catch (error) {
      console.error("Error counting products by warehouse:", error);
      return [];
    }
  }

  /**
   * Get cached product count by warehouse with hourly refresh
   * Similar to getProductCategoryPaginated's caching approach
   */
  export async function getCachedProductCountByWarehouse() {
    try {
      const docRef = doc(db, "hourly_stats", "product_warehouse_count");
      const docSnap = await getDoc(docRef);

      let warehouseCountData;

      if (!docSnap.exists()) {
        // Get product warehouse count data
        warehouseCountData = await getProductCountByWarehouse();
        
        // Set the data in the hourly_stats document
        await setDoc(docRef, {
          warehouses: warehouseCountData,
          updated_at: Timestamp.now()
        });
      }
      else {
        const cachedData = docSnap.data();
        
        // If the data is older than 1 hour, refresh it
        if (cachedData.updated_at.seconds < Date.now() / 1000 - 3600) {
          // Get fresh product warehouse count data
          warehouseCountData = await getProductCountByWarehouse();
          
          // Update the cached data
          await setDoc(docRef, {
            warehouses: warehouseCountData,
            updated_at: Timestamp.now()
          });
        } else {
          // Use cached data
          warehouseCountData = cachedData.warehouses;
        }
      }

      return warehouseCountData;
    } catch (error) {
      console.error("Error fetching cached warehouse counts:", error);
      return [];
    }
  }


  

  /**
   * Get all transactions that include a specific product SKU in their items
   * @param {string} sku - The SKU of the product to search for
   * @param {number} limit - Maximum number of transactions to return (optional)
   * @returns {Promise<Array<any>>} - Array of transactions containing the specified SKU
   */
  export async function getProductTransactions(sku: string, size: number = 10): Promise<Array<any>> {
    try {
      // Get all transactions from the transactions collection
      const transactionsRef = collection(db, "transactions");
      
      // Create a query to fetch all transactions (we'll filter for SKU client-side)
      let q = query(transactionsRef, orderBy("created_date", "desc"), limit(size));
      
      const querySnapshot = await getDocs(q);
      
      // Filter transactions that contain the specified SKU
      const filteredTransactions = [];
      
      for (const doc of querySnapshot.docs) {
        const transaction = doc.data();
        
        // Check if items array exists and contains the specified SKU
        if (transaction.items && Array.isArray(transaction.items)) {
          const hasMatchingSku = transaction.items.some(
            (item: any) => item.sku === sku
          );
          
          // If this transaction contains the SKU, add it to the results
          if (hasMatchingSku) {
            filteredTransactions.push({
              id: doc.id,
              ...transaction
            });
          }
        }
      }
      
      return filteredTransactions;
      
    } catch (error) {
      console.error(`Error fetching transactions for SKU ${sku}:`, error);
      return [];
    }
  }

  /**
   * Get all transactions from a specific month that include a specific product SKU in their items
   * @param {string} sku - The SKU of the product to search for
   * @param {Date} date - A date in the month to search (defaults to current month)
   * @param {number} size - Maximum number of transactions to return (use 0 for no limit, but use with caution)
   * @returns {Promise<Array<any>>} - Array of transactions containing the specified SKU within the specified month
   */
  export async function getMonthlyProductTransactions(
    sku: string, 
    date: Date = new Date(), 
    size: number = 100
  ): Promise<Array<any>> {
    try {
      // Calculate the start and end of the month
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Get transactions from the transactions collection within the date range
      const transactionsRef = collection(db, "transactions");
      
      // Create a query with date range and order by date
      let q = query(
        transactionsRef, 
        where("created_date", ">=", startOfMonth),
        where("created_date", "<=", endOfMonth),
        orderBy("created_date", "desc")
      );
      
      // Only apply limit if size is greater than 0
      if (size > 0) {
        q = query(q, limit(size));
      }
      
      const querySnapshot = await getDocs(q);
      
      // Filter transactions that contain the specified SKU
      const filteredTransactions = [];
      
      for (const doc of querySnapshot.docs) {
        const transaction = doc.data();
        
        // Check if items array exists and contains the specified SKU
        if (transaction.items && Array.isArray(transaction.items)) {
          const hasMatchingSku = transaction.items.some(
            (item: any) => item.sku === sku
          );
          
          // If this transaction contains the SKU, add it to the results
          if (hasMatchingSku) {
            filteredTransactions.push({
              id: doc.id,
              ...transaction
            });
          }
        }
      }
      
      return filteredTransactions;
      
    } catch (error) {
      console.error(`Error fetching monthly transactions for SKU ${sku}:`, error);
      return [];
    }
  }

  /**
   * Get cached product category count with hourly refresh
   * Similar to getCachedProductCountByWarehouse caching approach
   * @returns {Promise<ProductCategoryCount>} - Product category count data
   */
  export async function getCachedProductCategoryCount(): Promise<ProductCategoryCount> {
    try {
      
      const docRef = doc(db, "hourly_stats", "product_category_count");
      const docSnap = await getDoc(docRef);

      let categoryCountData;

      if (!docSnap.exists()) {
        // Get product category count data
        categoryCountData = await getProductCategoryCount();
        
        // Set the data in the hourly_stats document
        await setDoc(docRef, categoryCountData);
      }
      else {
        categoryCountData = docSnap.data() as ProductCategoryCount;

        // If the data is older than 1 hour, refresh it
        if (categoryCountData.date.seconds < Date.now() / 1000 - 3600) {
          // Get fresh product category count data
          categoryCountData = await getProductCategoryCount();
          
          // Update the cached data
          await setDoc(docRef, categoryCountData);
        }
      }

      return categoryCountData;
    } catch (error) {
      console.error("Error fetching cached category counts:", error);
      throw error;
    }
  }
