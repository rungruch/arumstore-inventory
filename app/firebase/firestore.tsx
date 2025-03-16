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
  getCountFromServer
} from "firebase/firestore";

import { db } from "@/app/firebase/clientApp";
import { Warehouse } from "@/app/firebase/interfaces";

// Existing code from your file...

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

interface Category {
  id: string;
  category_name: string;
  created_at: Timestamp;
  stock?: number;
  value?: number;
}

export async function getProductCategoryPaginated(lastDoc = null, pageSize = 10) {
  try {
    let q = query(collection(db, "product_category"), orderBy("created_at", "desc"), limit(pageSize));

    // If there's a last document (for next page), start after it
    if (lastDoc) {
      q = query(collection(db, "product_category"), orderBy("created_at", "desc"), startAfter(lastDoc), limit(pageSize));
    }

    const querySnapshot = await getDocs(q);
    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]; // Track last doc for pagination

    return {
      categories: querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
      lastDoc: lastVisible, // Store last document to fetch the next page
    };
  } catch (error) {
    console.error("Error fetching paginated categories:", error);
    return { categories: [], lastDoc: null };
  }
}

export async function getTotalCategoryCount() {
  try {
    const categoryCollection = collection(db, "product_category");
    const snapshot = await getCountFromServer(categoryCollection);
    return snapshot.data().count;
  } catch (error) {
    console.error("Error fetching category count:", error);
    return 0;
  }
}

export async function createProductCategory(categoryName: string) {
  try {
    // First check if a category with this name already exists
    const categoryQuery = query(
      collection(db, "product_category"),
      where("category_name", "==", categoryName)
    );
    
    const existingCategories = await getDocs(categoryQuery);
    
    if (!existingCategories.empty) {
      throw new Error(`หมวดหมู่ "${categoryName}" มีข้อมูลอยู่แล้ว`);
    }
    
    // If no existing category found, create a new one
    const newCategory = {
      category_name: categoryName,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, "product_category"), newCategory);
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
    const querySnapshot = await getDocs(
      startsWith(
        collection(db, 'product_category'),
        'category_name',
        partialName
      )
    );

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
export async function getProductWarehousePaginated(lastDoc = null, pageSize = 10) {
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
      console.log(d)
    return d
  } catch (error) {
    console.error("Error fetching paginated warehouses:", error);
    return { warehouses: [] as Warehouse[], lastDoc: null };
  }
}

export async function createProduct(productData: any) {
  try {
      const productsCollection = collection(db, "products");
      const docRef = await addDoc(productsCollection, productData);
      return { id: docRef.id, ...productData };
  } catch (error) {
      console.error("Error adding product:", error);
      throw new Error("ไม่สามารถเพิ่มสินค้าได้");
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

export async function createProductWarehouse(name: string, type:string, details: string = ""): Promise<Warehouse> {
  try {
    // First check if a warehouse with this name already exists
    const warehouseQuery = query(
      collection(db, "product_warehouse"),
      where("warehouse_name", "==", name)
    );
    
    const existingWarehouses = await getDocs(warehouseQuery);
    
    if (!existingWarehouses.empty) {
      throw new Error(`คลังสินค้า "${name}" มีข้อมูลอยู่แล้ว`);
    }
    
    // Generate a warehouse_id
    const warehouseId = await getNextWarehouseId();
    console.log(warehouseId)
    
    // Define the new warehouse with the correct type
    const newWarehouse: Omit<Warehouse, 'id'> = {
      warehouse_id: warehouseId,
      warehouse_name: name,
      type: type,
      details: details,
      created_date: Timestamp.now(),
      updated_date: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, "product_warehouse"), newWarehouse);
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

async function getNextWarehouseId(): Promise<string> {
    try {
      const counterDocRef = doc(db, 'counters', 'warehouse');
      
      return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterDocRef);
        
        // Default starting ID
        let nextId = 1;
        
        if (counterDoc.exists()) {
          const data = counterDoc.data();
          // Make sure we have a valid currentId value before incrementing
          nextId = (typeof data.currentId === 'number' && !isNaN(data.currentId))
            ? data.currentId + 1
            : 1;
        }
        
        // Format the ID as a string with WH prefix and padded zeros
        const formattedId = `WH${nextId.toString().padStart(5, '0')}`;
        
        // Update the counter document
        transaction.set(counterDocRef, { currentId: nextId });
        
        return formattedId;
      });
    } catch (error) {
      console.error("Error generating warehouse ID:", error);
      
      // In case of transaction failure, generate a unique fallback ID
      // Using timestamp to ensure uniqueness
      const timestamp = new Date().getTime();
      const fallbackId = `WH${timestamp.toString().slice(-5).padStart(5, '0')}`;
      
      console.warn(`Transaction failed, using fallback warehouse ID: ${fallbackId}`);
      return fallbackId;
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
export async function getProductPaginated(lastDoc = null, pageSize = 10) {
  try {
    let q = query(collection(db, "products"), orderBy("created_date", "desc"), limit(pageSize));

    // If there's a last document (for next page), start after it
    if (lastDoc) {
      q = query(collection(db, "products"), orderBy("created_date", "desc"), startAfter(lastDoc), limit(pageSize));
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
  const snapshot = await getCountFromServer(productsRef);
  return snapshot.data().count;
}

export async function getProductByName(partialName: string): Promise<Warehouse[]> {
  try {
    // Execute the query
    const querySnapshot = await getDocs(
      startsWith(
        collection(db, 'products'),
        'name',
        partialName
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
  }}


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