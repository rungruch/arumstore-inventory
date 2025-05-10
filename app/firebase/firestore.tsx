import {
  collection,
  onSnapshot,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  orderBy,
  Timestamp,
  runTransaction,
  where,
  addDoc,
  getFirestore,
  limit,
  startAt, 
  startAfter,
  endAt,
  CollectionReference,
  getCountFromServer,
  setDoc,
  deleteDoc
} from "firebase/firestore";

import { db } from "@/app/firebase/clientApp";
import { Warehouse, Contact, TransferTransaction, ProductCategoryCount } from "@/app/firebase/interfaces";
import { OrderStatus,OrderStatusFilter, TransactionType, STATUS_TRANSITIONS, ProductStatus, TransferStatus } from "@/app/firebase/enum";
import { get } from "http";


export async function getProducts() {
  try {
    const q = query(
      collection(db, "products"),
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching products: ", error);
    return [];
  }
}


export async function getProductCategoryCount(): Promise<ProductCategoryCount> {
      // Get all products to count by category
    const productsSnapshot = await getDocs(query(collection(db, "products"), where("status", "==", ProductStatus.ACTIVE)));
    
    // Create a map of category IDs to product counts
    const categoryCounts: { [key: string]: number } = {};
    const categoryIncome: { [key: string]: number } = {};
    const categoryPendingIncome: { [key: string]: number } = {};
    
    productsSnapshot.forEach(doc => {
      const product = doc.data();
      if (product.category) {
      // Count products per category
      categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
      
      // Calculate total income based on buy_price and current stock
      const buyPrice = product.price?.buy_price || 0;
      
      // Calculate current stock value (without pending)
      const totalStock = product.stocks ? 
        Object.values(product.stocks).reduce((sum: number, qty: any) => sum + (Number(qty) || 0), 0) : 0;
      categoryIncome[product.category] = (categoryIncome[product.category] || 0) + (totalStock * buyPrice);
      
      // Calculate pending stock value separately
      const totalPendingStock = product.pending_stock ? 
        Object.values(product.pending_stock).reduce((sum: number, qty: any) => sum + (Number(qty) || 0), 0) : 0;

      categoryPendingIncome[product.category] = (categoryPendingIncome[product.category] || 0) + ((totalPendingStock) * buyPrice);
      }
    });
    
    // Transform into the required format
    const ProductCategoryCountcategoryCounts: { [key: string]: { count: number; totalIncome: number; totalPendingIncome: number; } } = {};
    
    Object.keys(categoryCounts).forEach(category => {
      ProductCategoryCountcategoryCounts[category] = {
      count: categoryCounts[category],
      totalIncome: categoryIncome[category] || 0,
      totalPendingIncome: categoryPendingIncome[category] || 0
      };
    });

    return {
      date: Timestamp.now(),
      skus:
        {
          ...ProductCategoryCountcategoryCounts
        }
    } as ProductCategoryCount;
}



export async function getProductCategoryPaginated(lastDoc: any = null, pageSize: number = 10) {
  try {
    let q = query(collection(db, "product_category"), orderBy("created_at", "desc"),limit(pageSize));

    // If there's a last document (for next page), start after it
    if (lastDoc) {
      q = query(collection(db, "product_category"), orderBy("created_at", "desc"), startAfter(lastDoc), limit(pageSize));
    }
    
    const querySnapshot = await getDocs(q);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]; // Track last doc for pagination


    const docRef = doc(db, "hourly_stats", "product_category_count");
    const docSnap = await getDoc(docRef);

    let categoryCountData: ProductCategoryCount

    if (!docSnap.exists()) {

      // Get product category count data
      categoryCountData = await getProductCategoryCount();
      
      // Set the data in the hourly_stats document
      await setDoc(doc(db, "hourly_stats", "product_category_count"), categoryCountData);
    }
    else {
      categoryCountData = docSnap.data() as ProductCategoryCount;

      // If the data is older than 1 hour, refresh it
      if (categoryCountData.date.seconds < Date.now() / 1000 - 3600) {
      
        // Get product category count data
        categoryCountData = await getProductCategoryCount();
        
        // Set the data in the hourly_stats document
        await setDoc(doc(db, "hourly_stats", "product_category_count"), categoryCountData);
      }
    }
    
    return {
      categories: querySnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data(),
      })),
      skuCount: categoryCountData,
      lastDoc: lastVisible, // Store last document to fetch the next page
    };
  } catch (error) {
    console.error("Error fetching paginated categories:", error);
    return { categories: [], lastDoc: null };
  }
}

export async function getTotalCategoryCount() {
  try {
    const categoryCollection = query(
      collection(db, "product_category"),
    );
    const snapshot = await getCountFromServer(categoryCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching category count:", error);
    return 0;
  }
}

export async function createProductCategory(categoryName: string) {
  try {
    // First check if a category with this name already exists by document ID
    const docRef = doc(collection(db, "product_category"), categoryName);
    const existingCategory = await getDoc(docRef);

    if (existingCategory.exists()) {
      throw new Error(`หมวดหมู่ "${categoryName}" มีข้อมูลอยู่แล้ว`);
    }
    
    // If no existing category found, create a new one
    const newCategory = {
      category_name: categoryName,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };

    await setDoc(docRef, newCategory);
    return { id: docRef.id, ...newCategory };
  } catch (error) {
    throw error; // Re-throw the error to handle it in the calling function
  }
}

function startsWith(
  collectionRef: CollectionReference,
  fieldName: string,
  term: string
) {
  return query(
    collectionRef,
    orderBy(fieldName),
    startAt(term),
    endAt(term + '~')
  );
}

export async function getProductCategoryByName(partialName: string) {
  try {
    // Execute the query
    const q = query(
      collection(db, 'product_category'),
      orderBy('category_name'),
      startAt(partialName),
      endAt(partialName + '~'),
    );
    const querySnapshot = await getDocs(q);
    // Map the results into an array of category objects
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching category by partial name:", error);
    throw error;
  }
}

// New warehouse functions
export async function getProductWarehousePaginated(lastDoc: any = null, pageSize: number = 10) {
  try {
    let q = query(collection(db, "product_warehouse"), orderBy("created_date", "desc"), limit(pageSize));

    // If there's a last document (for next page), start after it
    if (lastDoc) {
      q = query(collection(db, "product_warehouse"), orderBy("created_date", "desc"), startAfter(lastDoc), limit(pageSize));
    }

    const querySnapshot = await getDocs(q);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]; // Track last doc for pagination

    // Use the Warehouse interface when mapping document data
    const d = {
        warehouses: querySnapshot.docs.map((doc) => ({ 
          id: doc.id, 
          ...doc.data() 
        } as Warehouse)),
        lastDoc: lastVisible, // Store last document to fetch the next page
      }
    return d
  } catch (error) {
    console.error("Error fetching paginated warehouses:", error);
    return { warehouses: [] as Warehouse[], lastDoc: null };
  }
}

export async function createProduct(productData: any) {
  try {
      const productsCollection = collection(db, "products");
      const docRef = doc(productsCollection, productData.sku);
      // Check for duplicate document ID
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        throw new Error(`Product with SKU "${productData.sku}" already exists.`);
      }
      await setDoc(docRef, productData);
      return { id: docRef.id, ...productData };
  } catch (error) {
      console.error("Error adding product:", error);
      throw new Error("ไม่สามารถเพิ่มสินค้าได้");
  }
}

 async function updateProductbySKU(sku: string, updateData: any) {
  try {
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("sku", "==", sku));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error(`Product with SKU ${sku} not found`);
    }

    const productDoc = querySnapshot.docs[0];
    await updateDoc(productDoc.ref, {
      ...updateData,
      updated_date: Timestamp.now()
    });

    return {
      id: productDoc.id,
      ...productDoc.data(),
      ...updateData
    };
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
}

 async function deleteProductBySKU(sku: string) {
  try {
    const productsRef = collection(db, "products");
    const q = query(productsRef, where("sku", "==", sku));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error(`Product with SKU ${sku} not found`);
    }

    const productDoc = querySnapshot.docs[0];
    await updateDoc(productDoc.ref, {
      status: ProductStatus.DELETED,
      updated_date: Timestamp.now()
    });

    return {
      id: productDoc.id,
      sku: sku,
      deleted: true
    };
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

export async function updateProductbyId(productId: string, updateData: any) {
  try {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      ...updateData,
      updated_date: Timestamp.now()
    });
    const updatedDoc = await getDoc(productRef);
    return {
      id: productId,
      ...updatedDoc.data()
    };
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
}

export async function deleteProductById(productId: string) {
  try {
    const productRef = doc(db, "products", productId);
    await updateDoc(productRef, {
      status: ProductStatus.DELETED,
      updated_date: Timestamp.now()
    });
    return {
      id: productId,
      deleted: true
    };
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

export async function getTotalWarehouseCount() {
  try {
    const warehouseCollection = collection(db, "product_warehouse");
    const snapshot = await getCountFromServer(warehouseCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching warehouse count:", error);
    return 0;
  }
}

export async function createProductWarehouse(name: string, type: string, details: string = ""): Promise<Warehouse> {
  try {
    // First check if a warehouse with this name already exists (by document ID)
    const docRef = doc(collection(db, "product_warehouse"), name);
    const existingDoc = await getDoc(docRef);

    if (existingDoc.exists()) {
      throw new Error(`คลังสินค้า "${name}" มีข้อมูลอยู่แล้ว`);
    }

    // Define the new warehouse with the correct type
    const newWarehouse: Omit<Warehouse, 'id'> = {
      warehouse_id: name,
      warehouse_name: name,
      type: type,
      details: details,
      created_date: Timestamp.now(),
      updated_date: Timestamp.now()
    };

    await setDoc(docRef, newWarehouse);
    // Return the new warehouse with its Firestore ID
    return { id: docRef.id, ...newWarehouse } as Warehouse;
  } catch (error) {
    throw error; // Re-throw the error to handle it in the calling function
  }
}

export async function getProductWarehouseByName(partialName: string): Promise<Warehouse[]> {
  try {
    // Execute the query
    const querySnapshot = await getDocs(
      startsWith(
        collection(db, 'product_warehouse'),
        'warehouse_name',
        partialName
      )
    );

    // Map the results and type them as Warehouse[]
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as Warehouse));
  } catch (error) {
    console.error("Error fetching warehouse by partial name:", error);
    throw error;
  }
}

  export async function generateRandomSKU(): Promise<string> {
    const productsCollection = collection(db, 'products');
  
    return runTransaction(db, async (transaction) => {
      let sku: string;
      let skuExists: boolean;
      let retries = 0;
      const maxRetries = 5; // Adjust as needed
      do {
        if (retries >= maxRetries) {
          throw new Error('Failed to generate unique SKU after multiple retries.');
        }
        sku = `SKU_${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`; // Generate random SKU
        const skuQuery = query(productsCollection, where('sku', '==', sku));
        const skuSnapshot = await getDocs(skuQuery);
        skuExists = !skuSnapshot.empty;
        retries++;
      } while (skuExists);
      return sku;
    });
  }

// New warehouse functions
export async function getProductPaginated(lastDoc: any = null, pageSize: number = 10, statusFilter: ProductStatus) {
  try {
    let q = query(collection(db, "products"), where("status", "==", statusFilter), orderBy("created_date", "desc"), limit(pageSize));

    // If there's a last document (for next page), start after it
    if (lastDoc) {
      q = query(collection(db, "products"), where("status", "==", statusFilter), orderBy("created_date", "desc"), startAfter(lastDoc), limit(pageSize));
    }

    const querySnapshot = await getDocs(q);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]; // Track last doc for pagination

    // Use the Warehouse interface when mapping document data
    const d = {
        data: querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        lastDoc: lastVisible, // Store last document to fetch the next page
      }
    return d
  } catch (error) {
    console.error("Error fetching paginated products:", error);
    return { data: [], lastDoc: null };
  }
}


// Get the total count of products for pagination
export const getTotalProductCount = async () => {
  const productsRef = collection(db, "products");
  const q = query(productsRef, where("status", "==", ProductStatus.ACTIVE));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

// Get the total count of products 
export const getTotalSellTransactionCount = async () => {
  const sellTranRef = collection(db, "transactions");
  const q = query(sellTranRef, where("transaction_type", "==", TransactionType.SELL));
  const snapshot = await getCountFromServer(q);
  return snapshot.data().count;
}

 async function getProductBySKU(sku: string) {
  try {
    // Execute the query
    const querySnapshot = await getDocs(
      query(collection(db, 'products'), where('sku', '==', sku), limit(1))
    );

    // Check if the SKU exists
    if (querySnapshot.empty) {
      throw new Error(`Product with SKU ${sku} not found`);
    }

    // Map the results into an array of category objects
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching category by partial name:", error);
    throw error;
  }
}

export async function getProductByName(partialName: string, statusFilter: ProductStatus): Promise<Warehouse[]> {
  try {
    // Execute the query
    const querySnapshot = await getDocs(
      query(
        collection(db, 'products'),
        orderBy('name'),
        startAt(partialName),
        endAt(partialName + '\uf8ff'),
        where("status", "==", statusFilter)
      )
    );

    // Map the results and type them as Warehouse[]
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as any));
  } catch (error) {
    console.error("Error fetching products by partial name:", error);
    throw error;
  }
}
export async function getSellTransactionbyName(partialName: string) {
  try {
    // Execute the query
    const querySnapshot = await getDocs(
      query(
        collection(db, 'transactions'),
        where("transaction_type", "==", TransactionType.SELL),
        orderBy('client_name'),
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
    console.error("Error fetching transactions by customer name:", error);
    throw error;
  }
}

export async function getSellTransactionByTransactionId(transactionId: string) {
  try {
    const transactionRef = doc(db, "transactions", transactionId);
    const transactionSnap = await getDoc(transactionRef);

    if (!transactionSnap.exists()) {
      return null;
    }

    return {
      id: transactionSnap.id,
      ...transactionSnap.data()
    };

  } catch (error) {
    console.error("Error fetching transaction by ID:", error);
    throw error;
  }
}


export async function getProductCategory() {
  try {
    const q = query(
      collection(db, "product_category"),
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching Category: ", error);
    throw error;
  }
}


export async function getProductWarehouse() {
  try {
    const q = query(
      collection(db, "product_warehouse"),
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching Warehouse: ", error);
    throw error;
  }}

  export async function generateRandomSellTransactionId(): Promise<string> {
    const transactionsCollection = collection(db, "transactions");
  
    return runTransaction(db, async (transaction) => {
      // Query to find the latest 'SELL' transaction
      const sellQuery = query(
        transactionsCollection,
        where("transaction_type", "==", TransactionType.SELL),
        orderBy("created_date", "desc"), // Assuming 'createdAt' is a timestamp field
        limit(1)
      );
  
      const sellSnapshot = await getDocs(sellQuery);
      let newTransactionId: string;
  
      if (!sellSnapshot.empty) {
        // Extract the latest transaction_id
        const latestTransaction = sellSnapshot.docs[0].data();
        const latestTransactionId = latestTransaction.transaction_id;
  
        // Extract the numeric part from the latestTransactionId (e.g., 'SELL-YYMMDD-1' -> 1)
        const match = latestTransactionId.match(/S-\d{6}-(\d+)/);
        const lastNumber = match ? parseInt(match[1], 10) : 0;
  
        // Generate the new transaction_id
        const today = new Date();
        const yy = today.getFullYear().toString().slice(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const datePart = `${yy}${mm}${dd}`;
  
        newTransactionId = `S-${datePart}-${lastNumber + 1}`;
      } else {
        // If no transactions exist, start with 'SELL-YYMMDD-1'
        const today = new Date();
        const yy = today.getFullYear().toString().slice(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const datePart = `${yy}${mm}${dd}`;
  
        newTransactionId = `S-${datePart}-1`;
      }
  
      return newTransactionId;
    });
  }

  export async function generateRandomTransferTransactionId(): Promise<string> {
    const transactionsCollection = collection(db, "transactions");
  
    return runTransaction(db, async (transaction) => {
      // Query to find the latest 'SELL' transaction
      const sellQuery = query(
        transactionsCollection,
        where("transaction_type", "==", TransactionType.TRANFER),
        orderBy("created_date", "desc"), // Assuming 'createdAt' is a timestamp field
        limit(1)
      );
  
      const sellSnapshot = await getDocs(sellQuery);
      let newTransactionId: string;
  
      if (!sellSnapshot.empty) {
        // Extract the latest transaction_id
        const latestTransaction = sellSnapshot.docs[0].data();
        const latestTransactionId = latestTransaction.transaction_id;
  
        // Extract the numeric part from the latestTransactionId (e.g., 'SELL-YYMMDD-1' -> 1)
        const match = latestTransactionId.match(/T-\d{6}-(\d+)/);
        const lastNumber = match ? parseInt(match[1], 10) : 0;
  
        // Generate the new transaction_id
        const today = new Date();
        const yy = today.getFullYear().toString().slice(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const datePart = `${yy}${mm}${dd}`;
  
        newTransactionId = `T-${datePart}-${lastNumber + 1}`;
      } else {
        // If no transactions exist, start with 'SELL-YYMMDD-1'
        const today = new Date();
        const yy = today.getFullYear().toString().slice(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const datePart = `${yy}${mm}${dd}`;
  
        newTransactionId = `T-${datePart}-1`;
      }
  
      return newTransactionId;
    });
  }

  export async function generateRandomAdjustTransactionId(): Promise<string> {
    const transactionsCollection = collection(db, "transactions");
  
    return runTransaction(db, async (transaction) => {
      // Query to find the latest 'SELL' transaction
      const sellQuery = query(
        transactionsCollection,
        where("transaction_type", "==", TransactionType.ADJUST),
        orderBy("created_date", "desc"), // Assuming 'createdAt' is a timestamp field
        limit(1)
      );
  
      const sellSnapshot = await getDocs(sellQuery);
      let newTransactionId: string;
  
      if (!sellSnapshot.empty) {
        // Extract the latest transaction_id
        const latestTransaction = sellSnapshot.docs[0].data();
        const latestTransactionId = latestTransaction.transaction_id;
  
        // Extract the numeric part from the latestTransactionId (e.g., 'SELL-YYMMDD-1' -> 1)
        const match = latestTransactionId.match(/A-\d{6}-(\d+)/);
        const lastNumber = match ? parseInt(match[1], 10) : 0;
  
        // Generate the new transaction_id
        const today = new Date();
        const yy = today.getFullYear().toString().slice(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const datePart = `${yy}${mm}${dd}`;
  
        newTransactionId = `A-${datePart}-${lastNumber + 1}`;
      } else {
        // If no transactions exist, start with 'SELL-YYMMDD-1'
        const today = new Date();
        const yy = today.getFullYear().toString().slice(-2);
        const mm = (today.getMonth() + 1).toString().padStart(2, "0");
        const dd = today.getDate().toString().padStart(2, "0");
        const datePart = `${yy}${mm}${dd}`;
  
        newTransactionId = `A-${datePart}-1`;
      }
  
      return newTransactionId;
    });
  }

  async function createSellTransactionWithStockDeduction(transactionData: any) {
    try {
      // Run a transaction to ensure atomic updates
      return await runTransaction(db, async (transaction) => {
        const transactionsCollection = collection(db, "transactions");
        const productsCollection = collection(db, "products");
  
        // Validate and generate transaction ID if not provided
        if (!transactionData.transaction_id) {
          transactionData.transaction_id = await generateRandomSellTransactionId();
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
  
        // Process each item in the transaction
        if (!Array.isArray(transactionData.items)) {
          throw new Error("Invalid transaction data: 'items' must be an array");
        }
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
  
          // Validate stock availability
          const currentStock = productData.stocks?.[item.warehouse_id] || 0;
          if (currentStock < item.quantity) {
            throw new Error(`Insufficient stock for product ${item.name} (SKU: ${item.sku})`);
          }
  
          // Prepare stock update
          const updatedStocks = { ...productData.stocks };
          updatedStocks[item.warehouse_id] = (updatedStocks[item.warehouse_id] || 0) - item.quantity;
  
          const updatedPendingStocks = { ...productData.pending_stock };
          updatedPendingStocks[item.warehouse_id] = 
            (updatedPendingStocks[item.warehouse_id] || 0) + item.quantity;
  
          // Update the product document
          transaction.update(productDoc.ref, {
            stocks: updatedStocks,
            pending_stock: updatedPendingStocks
          });
        }
  
        // Add the transaction
        const docRef = doc(transactionsCollection, transactionData.transaction_id);
        transaction.set(docRef, {
          ...transactionData,
          transaction_type: TransactionType.SELL,
          created_date: new Date()
        });
  
        return { id: docRef.id, ...transactionData };
      });
    } catch (error) {
      console.error("Error creating sell transaction:", error);
      throw error;
    }
  }

  export async function createSellTransactionWithStockDeductionv2(transactionData: any) {
    try {
      // Run a transaction to ensure atomic updates
      return await runTransaction(db, async (transaction) => {
        const transactionsCollection = collection(db, "transactions");
        const productsCollection = collection(db, "products");
  
        // Validate and generate transaction ID if not provided
        if (!transactionData.transaction_id) {
          transactionData.transaction_id = await generateRandomSellTransactionId();
        }
  
        // Check if transaction ID already exists by directly checking the document ID
        const transactionDocRef = doc(transactionsCollection, transactionData.transaction_id);
        const existingTransactionDoc = await getDoc(transactionDocRef);

        if (existingTransactionDoc.exists()) {
          throw new Error(`Transaction ID "${transactionData.transaction_id}" หรือเลขรายการซ้ำ กรุณาลองอีกครั้ง`);
        }
  
        // Process each item in the transaction
        for (const item of transactionData.items) {
          // Find the product by SKU
            const productDocRef = doc(productsCollection, item.sku);
            const productSnapshot = await getDoc(productDocRef);
  
          if (!productSnapshot.exists()) {
            throw new Error(`Product with SKU ${item.sku} not found`);
          }
          const productData = productSnapshot.data();

          // Product data is guaranteed to exist at this point

          const updatedPendingStocks = { ...productData.pending_stock };
          updatedPendingStocks[item.warehouse_id] = 
            (updatedPendingStocks[item.warehouse_id] || 0) + item.quantity;

          // Update the product document
          transaction.update(productSnapshot.ref, {
            pending_stock: updatedPendingStocks
          });
        }
  
        // Add the transaction
        const docRef = doc(transactionsCollection, transactionData.transaction_id);
        transaction.set(docRef, {
          ...transactionData,
          transaction_type: TransactionType.SELL,
          created_date: new Date()
        });
  
        return { id: docRef.id, ...transactionData };
      });
    } catch (error) {
      console.error("Error creating sell transaction:", error);
      throw error;
    }
  }

  // New warehouse functions
export async function getSellTransactionPaginated(lastDoc: any = null, pageSize: number = 10, statusFilter?: OrderStatusFilter) {
  try {
    let baseQuery = collection(db, "transactions");
    let conditions = [where("transaction_type", "==", TransactionType.SELL)];
    
    if (statusFilter) {
      if (statusFilter === OrderStatusFilter.COMPLETED)
        {
        conditions.push(where("status", "in", [OrderStatus.PICKED_UP, OrderStatus.SHIPPED]));
        }      
        else if (statusFilter === OrderStatusFilter.ALL)
      {}
      else {conditions.push(where("status", "==", statusFilter));}
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
    console.error("Error fetching paginated products:", error);
    return { data: [], lastDoc: null, count:0 };
  }
}

export async function updateOrderTransactionStatus(
  transaction_id: string, 
  current_status: OrderStatus,
  next_status: OrderStatus
) {
  try {
    return await runTransaction(db, async (transaction) => {
      // Find the transaction by transaction_id
      const transactionsCollection = collection(db, "transactions");
      const transactionDocRef = doc(transactionsCollection, transaction_id);
      const transactionDoc = await getDoc(transactionDocRef);

      // Check if transaction exists
      if (!transactionDoc.exists()) {
        throw new Error(`Transaction with ID "${transaction_id}" not found`);
      }

      const transactionData = transactionDoc.data();

      // Validate current status
      if (transactionData.status !== current_status) {
        throw new Error(`Current status does not match. Expected ${current_status}, found ${transactionData.status}`);
      }

      // Validate status transition
      const allowedNextStatuses = STATUS_TRANSITIONS[current_status] || [];
      if (!allowedNextStatuses.includes(next_status)) {
        throw new Error(`การปรับสถานะจาก ${current_status} ไปยัง ${next_status} ไม่ถูกต้อง`);
      }

      // Prepare update object
      const updateObject: any = {
        status: next_status,
        updated_date: Timestamp.now() // Use Firestore Timestamp
      };

      // Special handling for specific status transitions
      if (next_status === OrderStatus.SHIPPING) {
        // Clear pending stock when order is in shipping
        await handleShippingOrderStockUpdate(transaction, transactionData.items);
      } else if (next_status === OrderStatus.CANCELLED) {
        if(current_status === OrderStatus.SHIPPING) {
        // Restore stock when order is cancelled
        await handleCancelledOrderStockUpdateShipping(transaction, transactionData.items);
        }

        if(current_status === OrderStatus.PENDING) {
          // Restore stock when order is cancelled
          await handleCancelledOrderStockUpdatePending(transaction, transactionData.items);
        }
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
    console.error("Error updating order transaction status:", error);
    throw error;
  }
}

// Helper function to handle stock updates for shipping orders
async function handleShippingOrderStockUpdate(
  transaction: any, 
  items: any[]
) {
  const productsCollection = collection(db, "products");
  const productDocs: { doc: any, data: any, item: any }[] = [];
  
  // First pass: validate stock availability for all items
  for (const item of items) {
    const productDocRef = doc(productsCollection, item.sku);
    const productSnapshot = await getDoc(productDocRef);

    if (!productSnapshot.exists()) {
      console.warn(`Product with SKU ${item.sku} not found`);
      continue;
    }

    const productDoc = productSnapshot;
    const productData = productSnapshot.data();

    // Validate stock availability
    const currentStock = productData.stocks?.[item.warehouse_id] || 0;
    if (currentStock < item.quantity) {
      throw new Error(`สินค้าไม่เพียงพอสำหรับรายการ ${item.name || item.sku} (คลัง: ${item.warehouse_id}, ต้องการ: ${item.quantity})`);
    }
    
    // Store document reference and data for the second pass
    productDocs.push({ doc: productDoc, data: productData, item });
  }

  // Second pass: update stocks for all items (only if all validations pass)
  for (const { doc, data, item } of productDocs) {
    // Reduce stocks and update pending stock
    const updatedStocks = { ...data.stocks };
    const updatedPendingStocks = { ...data.pending_stock };

    // Actually reduce the stock since we validated it's available
    updatedStocks[item.warehouse_id] = (updatedStocks[item.warehouse_id] || 0) - item.quantity;
    
    // Reduce pending stock
    if (updatedPendingStocks[item.warehouse_id]) {
      updatedPendingStocks[item.warehouse_id] = Math.max(
      0,
      (updatedPendingStocks[item.warehouse_id] || 0) - item.quantity
      );
    }

    transaction.update(doc.ref, {
      stocks: updatedStocks,
      pending_stock: updatedPendingStocks
    });
  }
}

// Helper function to handle stock restoration for cancelled orders
async function handleCancelledOrderStockUpdateShipping(
  transaction: any, 
  items: any[]
) {
  const productsCollection = collection(db, "products");

  for (const item of items) {
    const productDocRef = doc(productsCollection, item.sku);
    const productSnapshot = await getDoc(productDocRef);

    if (!productSnapshot.exists()) {
      console.warn(`Product with SKU ${item.sku} not found`);
      continue;
    }

    const productDoc = productSnapshot;
    const productData = productSnapshot.data();

    // Restore stocks and remove from pending stock
    const updatedStocks = { ...productData.stocks };

    // Restore stock
    updatedStocks[item.warehouse_id] = (updatedStocks[item.warehouse_id] || 0) + item.quantity;

    transaction.update(productDoc.ref, {
      stocks: updatedStocks,
    });
  }
}

async function handleCancelledOrderStockUpdatePending(
  transaction: any, 
  items: any[]
) {
  const productsCollection = collection(db, "products");

  for (const item of items) {
    const productDocRef = doc(productsCollection, item.sku);
    const productSnapshot = await getDoc(productDocRef);

    if (!productSnapshot.exists()) {
      console.warn(`Product with SKU ${item.sku} not found`);
      continue;
    }

    const productDoc = productSnapshot;
    const productData = productSnapshot.data();

    // Restore stocks and remove from pending stock
    const updatedPendingStocks = { ...productData.pending_stock };

    // Remove from pending stock
    if (updatedPendingStocks[item.warehouse_id]) {
      updatedPendingStocks[item.warehouse_id] = Math.max(
        0, 
        (updatedPendingStocks[item.warehouse_id] || 0) - item.quantity
      );
    }

    transaction.update(productDoc.ref, {
      pending_stock: updatedPendingStocks
    });
  }

} 



export async function createTransferTransactionCompleted(
  transaction_id: string,
  items: { sku: string; quantity: number }[],
  warehouse: string,
  to_warehouse: string,
  notes: string = "",
  createdBy: string,
  updated_by: string,
  status: TransferStatus = TransferStatus.COMPLETED
): Promise<TransferTransaction> {
  try {
    return await runTransaction(db, async (transaction) => {
      if (warehouse === to_warehouse) {
        throw new Error("ไม่สามารถโอนย้ายสินค้าภายในคลังเดียวกันได้");
      }

      const productsRef = collection(db, "products");
      const transactionRef = collection(db, "transactions");
      
// Check for duplicate transaction_id document
      const transferDoc = doc(transactionRef, transaction_id);
      const existingDoc = await getDoc(transferDoc);
      if (existingDoc.exists()) {
        throw new Error(`Transfer transaction with ID "${transaction_id}" already exists.`);
      }

      // Generate transaction ID (you might want to implement your own logic)
      const transferItems = [];

      // Process each item
      for (const item of items) {
        // Find the product by SKU
        const productDoc = doc(productsRef, item.sku);
        const productSnapshot = await getDoc(productDoc);

        if (!productSnapshot.exists()) {
          throw new Error(`Product with SKU ${item.sku} not found`);
        }

        const productData = productSnapshot.data();

        // Initialize or get current stocks
        const currentStocks = productData.stocks || {};
        const fromStock = currentStocks[warehouse] || 0;

        // Validate stock availability
        if (fromStock < item.quantity) {
          throw new Error(`Insufficient stock for SKU ${item.sku} in warehouse ${warehouse}`);
        }

        // Calculate new stock values
        const updatedStocks = {
          ...currentStocks,
          [warehouse]: fromStock - item.quantity,
          [to_warehouse]: (currentStocks[to_warehouse] || 0) + item.quantity
        };

        // Update the product document
        transaction.update(productDoc, {
          stocks: updatedStocks,
          updated_date: Timestamp.now()
          ,
          warehouse: Array.isArray(productData.warehouse)
            ? (productData.warehouse.includes(to_warehouse)
                ? productData.warehouse
                : [...productData.warehouse, to_warehouse])
            : productData.warehouse === to_warehouse
              ? [to_warehouse]
              : productData.warehouse
                ? [productData.warehouse, to_warehouse]
                : [to_warehouse]
        });

        // Add to transfer items
        transferItems.push({
          sku: item.sku,
          quantity: item.quantity,
          subtotal: item.quantity * (productData.price || 0)
        });
      }

      // Create transfer transaction document
      const transferTransaction: TransferTransaction = {
        transaction_id: transaction_id,
        transaction_type: TransactionType.TRANFER,
        status: status,
        items: transferItems,
        warehouse: warehouse,
        to_warehouse: to_warehouse,
        notes: notes,
        created_by: createdBy,
        updated_by: updated_by,
        created_date: Timestamp.now(),
        updated_date: Timestamp.now()
      };


      transaction.set(transferDoc, transferTransaction);

      return {
        id: transferDoc.id,
        ...transferTransaction
      } as TransferTransaction;
    });
  } catch (error) {
    console.error("Error updating stock batch:", error);
    throw error;
  }
}

export async function createAdjustStockTransaction(
  transaction_id: string,
  item: { sku: string; quantity: number, newBuyPrice: number },
  to_warehouse: string,
  notes: string = "",
  createdBy: string,
  updated_by: string,
  status: TransferStatus = TransferStatus.COMPLETED
): Promise<TransferTransaction> {
  try {
    return await runTransaction(db, async (transaction) => {
      const productsRef = collection(db, "products");
      const transactionRef = collection(db, "transactions");

      // Get the product document directly by SKU
      const productDoc = doc(productsRef, item.sku);
      const productSnapshot = await getDoc(productDoc);

      if (!productSnapshot.exists()) {
        throw new Error(`Product with SKU ${item.sku} not found`);
      }

      const productData = productSnapshot.data();

      // Initialize or get current stocks
      const currentStocks = productData.stocks || {};

      // Replace stock value for the warehouse instead of adding
      const updatedStocks = {
        ...currentStocks,
        [to_warehouse]: item.quantity // Direct replacement instead of addition
      };

      // Calculate new average buy price considering existing stock and new stock
      const currentBuyPrice = productData.price?.buy_price_average || 0;
      const currentTotalStock = Object.values(currentStocks).reduce<number>((sum, qty) => sum + (Number(qty) || 0), 0);
      const currentTotalValue = currentBuyPrice * currentTotalStock;

      if (item.newBuyPrice == 0) {
        item.newBuyPrice = currentBuyPrice;
      }

      // Calculate new total value including new stock
      const newStockValue = item.newBuyPrice * item.quantity;
      const newTotalStock = Object.values(updatedStocks).reduce<number>((sum, qty) => sum + (Number(qty) || 0), 0);
      const newAverageBuyPrice = (currentTotalValue + newStockValue) / (newTotalStock + currentTotalStock);

      // Update the product document
      transaction.update(productDoc, {
        stocks: updatedStocks,
        updated_date: Timestamp.now(),
        price: {
          ...productData.price,
          buy_price_average: newAverageBuyPrice
        }
      });
      // Create adjust transaction document
      const adjustTransaction: TransferTransaction = {
        transaction_id: transaction_id,
        transaction_type: TransactionType.ADJUST,
        status: status,
        items: [{
          sku: item.sku,
          quantity: item.quantity,
          subtotal: item.quantity * (productData.price || 0)
        }],
        warehouse: "",
        to_warehouse: to_warehouse,
        notes: notes,
        created_by: createdBy,
        updated_by: updated_by,
        created_date: Timestamp.now(),
        updated_date: Timestamp.now()
      };

      const adjustDoc = doc(transactionRef, transaction_id);
      transaction.set(adjustDoc, adjustTransaction);

      return {
        id: adjustDoc.id,
        ...adjustTransaction
      } as TransferTransaction;
    });
  } catch (error) {
    console.error("Error updating stock batch:", error);
    throw error;
  }
}

export const updateShippingDetails = async (
  transactionId: string, 
  shippingDetails: {
    shipping_date: Date,
    shipping_method: string,
    recipient_name: string,
    tracking_number?: string,
    image: string
  }
) => {
  const transactionRef = doc(db, "transactions", transactionId);
  const transactionSnap = await getDoc(transactionRef);

  if (!transactionSnap.exists()) {
    throw new Error(`Transaction with ID "${transactionId}" not found`);
  }

  await updateDoc(transactionRef, {
    shipping_details: shippingDetails
  });
};

export const updatePaymentDetails = async (
  transactionId: string, 
  payment_status: string,
  payment_method: string,
  PaymentDetails: {
    payment_date: Date,
    payment_amount: number,
    image: string
  }
) => {
  const transactionRef = doc(db, "transactions", transactionId);
  const transactionSnap = await getDoc(transactionRef);

  if (!transactionSnap.exists()) {
    throw new Error(`Transaction with ID "${transactionId}" not found`);
  }

  await updateDoc(transactionRef, {
    payment_status: payment_status,
    payment_method: payment_method,
    payment_details: PaymentDetails
  });
};


// Get paginated contacts
export async function getContactsPaginated(lastDoc: any = null, pageSize: number = 10) {
  try {
    let q = query(collection(db, "contacts"), orderBy("created_date", "desc"), limit(pageSize));

    // If there's a last document (for next page), start after it
    if (lastDoc) {
      q = query(collection(db, "contacts"), orderBy("created_date", "desc"), startAfter(lastDoc), limit(pageSize));
    }

    const querySnapshot = await getDocs(q);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]; // Track last doc for pagination

    return {
      contacts: querySnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      })),
      lastDoc: lastVisible,
    };
  } catch (error) {
    console.error("Error fetching paginated contacts:", error);
    return { contacts: [] as Contact[], lastDoc: null };
  }
}

// Get total count of contacts
export async function getTotalContactsCount() {
  try {
    const contactsCollection = collection(db, "contacts");
    const snapshot = await getCountFromServer(contactsCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching contacts count:", error);
    return 0;
  }
}


// Search contacts by name
export async function getContactsByName(partialName: string) {
  try {
    // Execute the query with range-based search
    const querySnapshot = await getDocs(
      query(
        collection(db, 'contacts'),
        orderBy('name'),
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
    console.error("Error fetching contacts by partial name:", error);
    throw error;
  }
}

// Create a new contact
export async function createContact(contactData: Omit<Contact, 'id' | 'created_date' | 'updated_date'>): Promise<Contact> {
  try {
    // Check if a contact with this name already exists
    const contactQuery = query(
      collection(db, "contacts"),
      where("name", "==", contactData.name)
    );
    
    const existingContacts = await getDocs(contactQuery);
    
    if (!existingContacts.empty) {
      throw new Error(`ผู้ติดต่อ "${contactData.name}" มีข้อมูลอยู่แล้ว`);
    }
    
      contactData.client_id = await generateClientId();
    
    // Add timestamps
    const newContact = {
      ...contactData,
      created_date: Timestamp.now(),
      updated_date: Timestamp.now()
    };

    const docRef = doc(collection(db, "contacts"), newContact.client_id);
    await setDoc(docRef, newContact);
    
    // Return the new contact with its Firestore ID
    return { id: docRef.id, ...newContact } as Contact;
  } catch (error) {
    console.error("Error creating contact:", error);
    throw error;
  }
}

export async function generateClientId(): Promise<string> {
  const contactsCollection = collection(db, 'contacts');

  return runTransaction(db, async (transaction) => {
    let contact_id: string;
    let skuExists: boolean;
    let retries = 0;
    const maxRetries = 5; // Adjust as needed
    do {
      if (retries >= maxRetries) {
        throw new Error('Failed to generate unique contact after multiple retries.');
      }
      contact_id = `C_${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`; // Generate random SKU
      const skuQuery = query(contactsCollection, where('contact_id', '==', contact_id));
      const skuSnapshot = await getDocs(skuQuery);
      skuExists = !skuSnapshot.empty;
      retries++;
    } while (skuExists);
    return contact_id;
  });
}

// Update an existing contact
export async function updateContact(contactId: string, contactData: Partial<Contact>): Promise<Contact> {
  try {
    const contactRef = doc(db, "contacts", contactId);
    const contactDoc = await getDoc(contactRef);
    if (!contactDoc.exists()) {
      throw new Error(`ไม่พบข้อมูลผู้ติดต่อ ID: ${contactId}`);
    }
    const updatedData = {
      ...contactData,
      updated_date: Timestamp.now()
    };
    await updateDoc(contactRef, updatedData);
    return {
      ...contactDoc.data(),
      ...updatedData
    } as Contact;
  } catch (error) {
    console.error("Error updating contact:", error);
    throw error;
  }
}

// Delete a contact
export async function deleteContact(contactId: string): Promise<void> {
  try {
    const contactRef = doc(db, "contacts", contactId);
    const contactDoc = await getDoc(contactRef);
    
    if (!contactDoc.exists()) {
      throw new Error(`ไม่พบข้อมูลผู้ติดต่อ ID: ${contactId}`);
    }
    
    // Here you could implement additional checks before deletion
    // e.g., check if the contact is referenced elsewhere
    
    await updateDoc(contactRef, { 
      deleted: true,
      updated_date: Timestamp.now()
    });
    
    // Alternatively, you could completely delete the document:
    // await deleteDoc(contactRef);
    
  } catch (error) {
    console.error("Error deleting contact:", error);
    throw error;
  }
}

export async function deleteContactById(contactId: string): Promise<void> {
  try {
    const contactRef = doc(db, "contacts", contactId);
    await updateDoc(contactRef, { 
      deleted: true,
      updated_date: Timestamp.now()
    });
  } catch (error) {
    console.error("Error deleting contact:", error);
    throw error;
  }
}

// Get all contacts (no pagination)
export async function getAllContacts() {
  try {
    const q = query(
      collection(db, "contacts"),
      orderBy("name", "asc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching all contacts:", error);
    return [];
  }
}

export async function getSellTransactionsByDate(startDate: Date, endDate: Date) {
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(23, 59, 59, 999)
  try {
    const q = query(
      collection(db, "transactions"),
      where("transaction_type", "==", TransactionType.SELL),
      where("status", "!=", OrderStatus.CANCELLED),
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
    console.error("Error fetching sell transactions by date:", error);
    return [];
  }
}

export async function deleteProductCategory(categoryId: string) {
  try {
    const categoryRef = doc(db, "product_category", categoryId);
    await deleteDoc(categoryRef);
    return { id: categoryId, deleted: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}

export async function getProductByID(productId: string) {
  try {
    const productRef = doc(db, "products", productId);
    const productSnap = await getDoc(productRef);
    if (!productSnap.exists()) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    return { id: productSnap.id, ...productSnap.data() };
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    throw error;
  }
}

export async function deleteProductWarehouse(warehouseId: string) {
  try {
    const categoryRef = doc(db, "product_warehouse", warehouseId);
    await deleteDoc(categoryRef);
    return { id: warehouseId, deleted: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
}

export async function updateProductWarehouse(warehouseId: string, updateData: any) {
  try {
    const warehouseRef = doc(db, "product_warehouse", warehouseId);
    await updateDoc(warehouseRef, {
      ...updateData,
      updated_date: Timestamp.now()
    });
    const updatedDoc = await getDoc(warehouseRef);
    return {
      id: warehouseId,
      ...updatedDoc.data()
    };
  } catch (error) {
    console.error("Error updating warehouse:", error);
    throw error;
  }
}

export async function getProductFilterCategory(categoryId: string, lastDoc: any = null, pageSize: number = 10) {
  try {
    // Create query with category filter
    let q = query(
      collection(db, "products"), 
      where("status", "==", ProductStatus.ACTIVE),
      where("category", "==", categoryId),
      orderBy("created_date", "desc"), 
      limit(pageSize)
    );

    // If there's a last document (for next page), start after it
    if (lastDoc) {
      q = query(
        collection(db, "products"),
        where("status", "==", ProductStatus.ACTIVE),
        where("category", "==", categoryId),
        orderBy("created_date", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]; // Track last doc for pagination

    // Get total count for this category
    const countQuery = query(
      collection(db, "products"),
      where("status", "==", ProductStatus.ACTIVE),
      where("category", "==", categoryId)
    );
    const countSnapshot = await getCountFromServer(countQuery);
    const totalCount = countSnapshot.data().count;

    return {
      data: querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      lastDoc: lastVisible,
      totalCount
    }
  } catch (error) {
    console.error("Error fetching filtered products by category:", error);
    return { data: [], lastDoc: null, totalCount: 0 };
  }
}

export async function getProductFilterWarehouse(warehouseName: string, lastDoc: any = null, pageSize: number = 10) {
  try {
    // warehouseName is the document ID, so fetch the warehouse document directly
    const warehouseDocRef = doc(db, "product_warehouse", warehouseName);
    const warehouseDoc = await getDoc(warehouseDocRef);

    if (!warehouseDoc.exists()) {
      // No warehouse with this ID found
      return { data: [], lastDoc: null, totalCount: 0, hasMore: false };
    }

    const warehouseId = warehouseDoc.id;
    
    // Use array-contains query on the warehouse field instead of client-side filtering
    let q = query(
      collection(db, "products"),
      where("status", "==", ProductStatus.ACTIVE),
      where("warehouse", "array-contains", warehouseId),
      orderBy("created_date", "desc"),
      limit(pageSize)
    );

    // If there's a last document (for next page), start after it
    if (lastDoc) {
      q = query(
        collection(db, "products"),
        where("status", "==", ProductStatus.ACTIVE),
        where("warehouse", "array-contains", warehouseId),
        orderBy("created_date", "desc"),
        startAfter(lastDoc),
        limit(pageSize)
      );
    }

    const querySnapshot = await getDocs(q);
    
    // Last visible document for pagination
    const lastVisible = querySnapshot.docs.length > 0 ? 
                        querySnapshot.docs[querySnapshot.docs.length - 1] : null;

    // Get the count for this warehouse filter
    const countQuery = query(
      collection(db, "products"),
      where("status", "==", ProductStatus.ACTIVE),
      where("warehouse", "array-contains", warehouseId)
    );
    const countSnapshot = await getCountFromServer(countQuery);
    const totalCount = countSnapshot.data().count;

    // Add the warehouse name to the result for reference
    return {
      data: querySnapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data(),
        filtered_by_warehouse: {
          id: warehouseId,
          name: warehouseName
        }
      })),
      lastDoc: lastVisible,
      totalCount,
      hasMore: totalCount > (lastDoc ? querySnapshot.docs.length + pageSize : querySnapshot.docs.length),
      warehouseInfo: {
        id: warehouseId,
        name: warehouseName,
        ...warehouseDoc.data()
      }
    }
  } catch (error) {
    console.error("Error fetching filtered products by warehouse name:", error);
    return { data: [], lastDoc: null, totalCount: 0, hasMore: false };
  }
}

// Combined filter function for both category and warehouse
export async function getProductFiltered(filters: {
  category?: string,
  warehouse?: string
}, lastDoc: any = null, pageSize: number = 10) {
  try {
    // If filtering by both warehouse and category, we need client-side filtering
    if (filters.category && filters.warehouse) {
      // Start with category filter since it can be done on the database
      const categoryResult = await getProductFilterCategory(filters.category, lastDoc, pageSize * 5);
      
      // Then filter by warehouse client-side
      const filteredProducts = categoryResult.data.filter(product => {
        const prod = product as { id: string; stocks?: Record<string, number> };
        return (
          prod.stocks &&
          prod.stocks[filters.warehouse!] !== undefined &&
          prod.stocks[filters.warehouse!] > 0
        );
      });
      
      // Paginate results
      const paginatedProducts = filteredProducts.slice(0, pageSize);
      const lastVisible = paginatedProducts.length > 0 ? 
        categoryResult.lastDoc : null;
      
      return {
        data: paginatedProducts,
        lastDoc: lastVisible,
        totalCount: filteredProducts.length,
        hasMore: filteredProducts.length > pageSize
      }
    } 
    
    // If filtering just by category
    else if (filters.category) {
      return await getProductFilterCategory(filters.category, lastDoc, pageSize);
    } 
    
    // If filtering just by warehouse
    else if (filters.warehouse) {
      console.log("Fetching products filtered by warehouse:", filters.warehouse);
      return await getProductFilterWarehouse(filters.warehouse, lastDoc, pageSize);
    } 
    
    // If no filters, return regular paginated products
    else {
      const result = await getProductPaginated(lastDoc, pageSize, ProductStatus.ACTIVE);
      const totalCount = await getTotalProductCount();
      
      return {
        data: result.data,
        lastDoc: result.lastDoc,
        totalCount
      }
    }
  } catch (error) {
    console.error("Error in getProductFiltered:", error);
    return { data: [], lastDoc: null, totalCount: 0 };
  }
}
