import {
    collection,
    query,
    getDocs,
    orderBy,
    Timestamp,
    runTransaction,
    where,
    addDoc,
    limit,
    startAt, 
    startAfter,
    endAt,
    doc,
    getCountFromServer,
  } from "firebase/firestore"
  
  import { db } from "@/app/firebase/clientApp";
  import { TransactionType, PurchaseStatus, PurchaseStatusFilter, PURCHASE_STATUS_TRANSITIONS } from "@/app/firebase/enum";

  
// Get the total count of purchase transactions for pagination
export const getTotalPurchaseTransactionCount = async () => {
    const transactionsRef = collection(db, "transactions");
    const q = query(transactionsRef, where("transaction_type", "==", TransactionType.BUY));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  }
  
  // Generate a unique purchase transaction ID
  export async function generateRandomBuyTransactionId(): Promise<string> {
    const transactionsCollection = collection(db, "transactions");
  
    return runTransaction(db, async (transaction) => {
      // Query to find the latest 'BUY' transaction
      const buyQuery = query(
        transactionsCollection,
        where("transaction_type", "==", TransactionType.BUY),
        orderBy("created_date", "desc"),
        limit(1)
      );
  
      const buySnapshot = await getDocs(buyQuery);
      let newTransactionId: string;
  
      if (!buySnapshot.empty) {
        // Extract the latest transaction_id
        const latestTransaction = buySnapshot.docs[0].data();
        const latestTransactionId = latestTransaction.transaction_id;
  
        // Extract the numeric part from the latestTransactionId (e.g., 'B-YYMMDD-1' -> 1)
        const match = latestTransactionId.match(/B-\d{6}-(\d+)/);
        const lastNumber = match ? parseInt(match[1], 10) : 0;
  
        // Generate the new transaction_id
        const today = new Date();
        const yy = today.getFullYear().toString().slice(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const datePart = `${yy}${mm}${dd}`;
  
        newTransactionId = `B-${datePart}-${lastNumber + 1}`;
      } else {
        // If no transactions exist, start with 'B-YYMMDD-1'
        const today = new Date();
        const yy = today.getFullYear().toString().slice(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const datePart = `${yy}${mm}${dd}`;
  
        newTransactionId = `B-${datePart}-1`;
      }
  
      return newTransactionId;
    });
  }
  
  // Get purchase transactions with pagination
  export async function getPurchaseTransactionPaginated(lastDoc: any = null, pageSize: number = 10, statusFilter?: PurchaseStatusFilter) {
    try {
      let baseQuery = collection(db, "transactions");
      let conditions = [where("transaction_type", "==", TransactionType.BUY)];
      
      if (statusFilter) {
        if (statusFilter === PurchaseStatusFilter.ALL) {
          // No additional conditions needed for "ALL"
        } else {
          conditions.push(where("status", "==", statusFilter));
        }
      }
  
      let q = query(
        baseQuery, 
        ...conditions,
        orderBy("created_date", "desc"), 
        limit(pageSize)
      );
  
      if (lastDoc) {
        q = query(
          baseQuery,
          ...conditions,
          orderBy("created_date", "desc"),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }
  
      const querySnapshot = await getDocs(q);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
  
      return {
        data: querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        lastDoc: lastVisible,
        count: await getCountFromServer(query(baseQuery, ...conditions)).then(res => res.data().count)
      };
    } catch (error) {
      console.error("Error fetching paginated purchases:", error);
      return { data: [], lastDoc: null, count: 0 };
    }
  }
  
  // Get a purchase transaction by its ID
  export async function getPurchaseTransactionByTransactionId(transactionId: string) {
    try {
      const transactionsCollection = collection(db, "transactions");
      const q = query(
        transactionsCollection,
        where("transaction_id", "==", transactionId),
        where("transaction_type", "==", TransactionType.BUY),
        limit(1)
      );
  
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        return null;
      }
  
      return {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      };
    } catch (error) {
      console.error("Error fetching purchase transaction by ID:", error);
      throw error;
    }
  }
  
  // Search for purchase transactions by supplier name
  export async function getPurchaseTransactionbyName(partialName: string) {
    try {
      // Execute the query
      const querySnapshot = await getDocs(
        query(
          collection(db, 'transactions'),
          where("transaction_type", "==", TransactionType.BUY),
          orderBy('supplier_name'),
          startAt(partialName),
          endAt(partialName + '\uf8ff')
        )
      );
  
      // Map the results
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching purchases by supplier name:", error);
      throw error;
    }
  }
  
  // Get purchase transactions within a date range
  export async function getPurchaseTransactionsByDate(startDate: Date, endDate: Date) {
    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)
    try {
      const q = query(
        collection(db, "transactions"),
        where("transaction_type", "==", TransactionType.BUY),
        where("status", "!=", PurchaseStatus.CANCELLED),
        where("created_date", ">=", startDate),
        where("created_date", "<", endDate),
        orderBy("status"),
        orderBy("created_date", "desc")
      );
  
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching purchase transactions by date:", error);
      return [];
    }
  }
  
  // Create a purchase transaction and add stock to inventory
  export async function createPurchaseTransactionWithStockAddition(transactionData: any) {
    try {
      // Run a transaction to ensure atomic updates
      return await runTransaction(db, async (transaction) => {
        const transactionsCollection = collection(db, "transactions");
        const productsCollection = collection(db, "products");
  
        // Validate and generate transaction ID if not provided
        if (!transactionData.transaction_id) {
          transactionData.transaction_id = await generateRandomBuyTransactionId();
        }
  
        // Check if transaction ID already exists
        const existingTransactionQuery = query(
          transactionsCollection,
          where("transaction_id", "==", transactionData.transaction_id)
        );
        const existingTransactionSnapshot = await getDocs(existingTransactionQuery);
        if (!existingTransactionSnapshot.empty) {
          throw new Error(`Transaction ID "${transactionData.transaction_id}" หรือเลขรายการซ้ำ กรุณาลองอีกครั้ง`);
        }
  
        // Process each item in the purchase transaction and add to inventory
        for (const item of transactionData.items) {
          // Find the product by SKU
          const productQuery = query(
            productsCollection,
            where("sku", "==", item.sku)
          );
          const productSnapshot = await getDocs(productQuery);
  
          if (productSnapshot.empty) {
            throw new Error(`Product with SKU ${item.sku} not found`);
          }
  
          const productDoc = productSnapshot.docs[0];
          const productData = productDoc.data();
  
          // Prepare stock update - add to stock
          const updatedStocks = { ...productData.stocks };
          updatedStocks[item.warehouse_id] = (updatedStocks[item.warehouse_id] || 0) + item.quantity;
  
          // Update average purchase price 
          let currentQuantity = 0;
          Object.values(productData.stocks).forEach((val: any) => {
            currentQuantity += val;
          });
  
          const currentTotalValue = (productData.price?.buy_price_average || 0) * currentQuantity;
          const newStockValue = item.price * item.quantity;
          const newTotalQuantity = currentQuantity + item.quantity;
          
          let newAverageBuyPrice = productData.price?.buy_price_average || 0;
          
          // Only calculate new average if adding items
          if (item.quantity > 0) {
            newAverageBuyPrice = (currentTotalValue + newStockValue) / newTotalQuantity;
          }
  
          // Update the product document with new stock and price
          transaction.update(productDoc.ref, {
            stocks: updatedStocks,
            price: {
              ...productData.price,
              buy_price: item.price,  // Update current buy price
              buy_price_average: newAverageBuyPrice  // Update average buy price
            },
            updated_date: Timestamp.now()
          });
        }
  
        // Add the transaction with a custom document ID (transaction_id)
        const transactionDocRef = doc(transactionsCollection, transactionData.transaction_id);
        transaction.set(
          transactionDocRef,
          {
            ...transactionData,
            transaction_type: TransactionType.BUY,
            created_date: Timestamp.now()
          }
        );
  
        return { id: transactionDocRef.id, ...transactionData };
      });
    } catch (error) {
      console.error("Error creating purchase transaction:", error);
      throw error;
    }
  }
  
  // Update the status of a purchase transaction
  export async function updatePurchaseTransactionStatus(
    transaction_id: string, 
    current_status: PurchaseStatus,
    next_status: PurchaseStatus
  ) {
    try {
      return await runTransaction(db, async (transaction) => {
        // Find the transaction by transaction_id
        const transactionsCollection = collection(db, "transactions");
        const transactionQuery = query(
          transactionsCollection,
          where("transaction_id", "==", transaction_id)
        );
  
        const transactionSnapshot = await getDocs(transactionQuery);
  
        // Check if transaction exists
        if (transactionSnapshot.empty) {
          throw new Error(`Transaction with ID "${transaction_id}" not found`);
        }
  
        const transactionDoc = transactionSnapshot.docs[0];
        const transactionData = transactionDoc.data();
  
        // Validate current status
        if (transactionData.status !== current_status) {
          throw new Error(`Current status does not match. Expected ${current_status}, found ${transactionData.status}`);
        }
  
        // Validate status transition
        const allowedNextStatuses = PURCHASE_STATUS_TRANSITIONS[current_status] || [];
        if (!allowedNextStatuses.includes(next_status)) {
          throw new Error(`การปรับสถานะจาก ${current_status} ไปยัง ${next_status} ไม่ถูกต้อง`);
        }
  
        // Prepare update object
        const updateObject: any = {
          status: next_status,
          updated_date: Timestamp.now()
        };
  
        // Special handling for cancelled purchase orders
        if (next_status === PurchaseStatus.CANCELLED && current_status === PurchaseStatus.PENDING) {
          // Reverse the stock addition when canceling a completed purchase
          await handleCancelledPurchaseStockUpdate(transaction, transactionData.items);
        }
  
        // Update transaction status
        transaction.update(transactionDoc.ref, updateObject);
  
        return {
          id: transactionDoc.id,
          ...transactionData,
          ...updateObject
        };
      });
    } catch (error) {
      console.error("Error updating purchase transaction status:", error);
      throw error;
    }
  }
  
  // Helper function to handle stock updates when cancelling a purchase order
  async function handleCancelledPurchaseStockUpdate(
    transaction: any, 
    items: any[]
  ) {
    const productsCollection = collection(db, "products");
  
    for (const item of items) {
      const productQuery = query(
        productsCollection,
        where("sku", "==", item.sku)
      );
  
      const productSnapshot = await getDocs(productQuery);
  
      if (productSnapshot.empty) {
        console.warn(`Product with SKU ${item.sku} not found`);
        continue;
      }
  
      const productDoc = productSnapshot.docs[0];
      const productData = productDoc.data();
  
      // Reduce stocks to reverse the addition
      const updatedStocks = { ...productData.stocks };
  
      // Don't go below zero when removing stock
      if (updatedStocks[item.warehouse_id]) {
        updatedStocks[item.warehouse_id] = Math.max(
          0,
          (updatedStocks[item.warehouse_id] || 0) - item.quantity
        );
      }
  
      transaction.update(productDoc.ref, {
        stocks: updatedStocks
      });
    }
  }
  