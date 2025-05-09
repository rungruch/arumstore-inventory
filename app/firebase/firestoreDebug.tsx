import {
  collection,
  getDocs,
  query,
  writeBatch,
  deleteDoc,
  doc,
  limit
} from "firebase/firestore";

import { db } from "@/app/firebase/clientApp";

/**
 * Deletes all documents in a collection in batches
 * @param collectionName The collection name to delete documents from
 * @returns Promise with count of deleted documents
 */
export async function deleteAllDocumentsInCollection(collectionName: string): Promise<number> {
  const collectionRef = collection(db, collectionName);
  let totalDeleted = 0;
  let batchSize = 0;

  do {
    // Get a batch of documents to delete
    const q = query(collectionRef, limit(500));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      break; // No more documents to delete
    }
    
    // Create a batch operation
    const batch = writeBatch(db);
    querySnapshot.forEach((document) => {
      batch.delete(doc(db, collectionName, document.id));
    });
    
    // Commit the batch
    await batch.commit();
    
    // Update counters
    batchSize = querySnapshot.size;
    totalDeleted += batchSize;
    
    console.log(`Deleted ${totalDeleted} documents from ${collectionName}`);
    
  } while (batchSize > 0);
  
  return totalDeleted;
}

/**
 * Delete all products from the database
 * @returns Promise with the count of deleted products
 */
export async function deleteAllProducts(): Promise<number> {
  return deleteAllDocumentsInCollection("products");
}

/**
 * Delete all transactions from the database
 * @returns Promise with the count of deleted transactions
 */
export async function deleteAllTransactions(): Promise<number> {
  return deleteAllDocumentsInCollection("transactions");
}

/**
 * Delete all warehouses from the database
 * @returns Promise with the count of deleted warehouses
 */
export async function deleteAllWarehouses(): Promise<number> {
  return deleteAllDocumentsInCollection("product_warehouse");
}

/**
 * Delete all categories from the database
 * @returns Promise with the count of deleted categories
 */
export async function deleteAllCategories(): Promise<number> {
  return deleteAllDocumentsInCollection("product_category");
}

/**
 * Delete stats data
 * @returns Promise with the count of deleted stats
 */
export async function deleteAllStats(): Promise<number> {
  return deleteAllDocumentsInCollection("hourly_stats");
}

/**
 * Reset all data in the database
 * @returns Object with counts of deleted documents by collection
 */
export async function resetAllData(): Promise<Record<string, number>> {
  const results = {
    products: await deleteAllProducts(),
    transactions: await deleteAllTransactions(), 
    warehouses: await deleteAllWarehouses(),
    categories: await deleteAllCategories(),
    stats: await deleteAllStats()
  };
  
  return results;
}