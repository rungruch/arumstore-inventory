import {
    collection,
    query,
    getDocs,
    where,
    orderBy,
    Timestamp,
    addDoc,
    setDoc,
    doc
  } from "firebase/firestore";
  
  import { db } from "@/app/firebase/clientApp";
  import { TransactionType } from "@/app/firebase/enum";
  import { OrderStatus } from "@/app/firebase/enum";
  import { MonthlyIncome } from "@/app/firebase/interfaces";
  
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
    return monthlyIncome.skus.slice(0, limit).map(sku => ({
      sku: sku.sku,
      name: sku.name,
      totalIncome: sku.totalIncome,
      quantity: Number(sku.quantity)
    }));
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
          
          // Update the document
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
      }

      // If document doesn't exist or SKU not found, calculate from transactions

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
  