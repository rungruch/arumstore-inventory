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