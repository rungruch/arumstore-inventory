"use client";
import { db } from "./clientApp";
import { collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { WalletCollection, IncomeTransaction, ExpenseTransaction, TransferTransaction } from "../finance/interface";
import { wallet_type, payment_status, finance_transaction_type } from "../finance/enum";
import { v4 as uuidv4 } from "uuid";
import { create } from "domain";

// Wallet Functions
export const getWallets = async (): Promise<WalletCollection[]> => {
  try {
    const walletsRef = collection(db, "finance_wallet");
    const snapshot = await getDocs(walletsRef);
    const wallets: WalletCollection[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as WalletCollection;
      wallets.push(data);
    });
    
    return wallets;
  } catch (error) {
    console.error("Error getting wallets:", error);
    throw error;
  }
};

export const getWalletById = async (walletId: string): Promise<WalletCollection | null> => {
  try {
    const walletRef = doc(db, "finance_wallet", walletId);
    const walletDoc = await getDoc(walletRef);
    
    if (walletDoc.exists()) {
      return walletDoc.data() as WalletCollection;
    }
    return null;
  } catch (error) {
    console.error("Error getting wallet by ID:", error);
    throw error;
  }
};

export const createWallet = async (walletData: WalletCollection): Promise<string> => {
  try {
    const walletId = walletData.wallet_id || uuidv4();
    const walletRef = doc(db, "finance_wallet", walletId);
    // Check for duplicate wallet_id document
    const existingDoc = await getDoc(walletRef);
    if (existingDoc.exists()) {
      throw new Error(`Wallet with ID "${walletId}" already exists.`);
    }
    await setDoc(walletRef, {
      ...walletData,
      wallet_id: walletId,
      total: walletData.total || 0,
      created_date: Timestamp.now(),
      updated_date: Timestamp.now()
    });
    return walletId;
  } catch (error) {
    console.error("Error creating wallet:", error);
    throw error;
  }
};

export const updateWallet = async (walletId: string, walletData: Partial<WalletCollection>): Promise<void> => {
  try {
    walletData.updated_date = Timestamp.now();
    const walletRef = doc(db, "finance_wallet", walletId);
    await updateDoc(walletRef, walletData);
  } catch (error) {
    console.error("Error updating wallet:", error);
    throw error;
  }
};

export const deleteWallet = async (walletId: string): Promise<void> => {
  try {
    const walletRef = doc(db, "finance_wallet", walletId);
    await deleteDoc(walletRef);
  } catch (error) {
    console.error("Error deleting wallet:", error);
    throw error;
  }
};

export const updateWalletBalance = async (walletId: string, amount: number, isAddition: boolean): Promise<void> => {
  try {
    const walletRef = doc(db, "finance_wallet", walletId);
    const walletDoc = await getDoc(walletRef);
    
    if (walletDoc.exists()) {
      const currentWallet = walletDoc.data() as WalletCollection;
      const newTotal = isAddition 
        ? Number(currentWallet.total || 0) + Number(amount) 
        : Number(currentWallet.total || 0) - Number(amount);
      
      await updateDoc(walletRef, { total: newTotal, updated_date: Timestamp.now() });
    } else {
      throw new Error("Wallet not found");
    }
  } catch (error) {
    console.error("Error updating wallet balance:", error);
    throw error;
  }
};

// Finance Transaction Functions
export const generateRandomFinanceTransactionId = async (): Promise<string> => {
  const currentDate = new Date();
  const year = currentDate.getFullYear().toString().substr(-2);
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const day = currentDate.getDate().toString().padStart(2, '0');
  
  const baseId = `FIN${year}${month}${day}`;
  const randomPart = Math.floor(10000 + Math.random() * 90000).toString();
  
  const transactionId = `${baseId}-${randomPart}`;
  
  // Check if ID already exists
  const transactionsRef = collection(db, "finance_transactions");
  const q = query(transactionsRef, where("transaction_id", "==", transactionId));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return transactionId;
  } else {
    // If ID exists, try again recursively
    return generateRandomFinanceTransactionId();
  }
};

export const getFinanceTransactions = async (limitCount?: number): Promise<(IncomeTransaction | ExpenseTransaction | TransferTransaction)[]> => {
  try {
    const transactionsRef = collection(db, "finance_transactions");
    const q = query(transactionsRef, orderBy("created_date", "desc"), limit(limitCount || 10));
    const snapshot = await getDocs(q);
    
    const transactions: (IncomeTransaction | ExpenseTransaction | TransferTransaction)[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as (IncomeTransaction | ExpenseTransaction | TransferTransaction);
      transactions.push(data);
    });
    
    return transactions;
  } catch (error) {
    console.error("Error getting finance transactions:", error);
    throw error;
  }
};

export const getIncomeTransactions = async (limitCount?: number): Promise<IncomeTransaction[]> => {
  try {
    const transactionsRef = collection(db, "finance_transactions");
    const q = query(
      transactionsRef, 
      where("transaction_type", "==", finance_transaction_type.INCOME),
      orderBy("created_date", "desc"),
      limit(limitCount || 10)
    );
    const snapshot = await getDocs(q);
    
    const transactions: IncomeTransaction[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as IncomeTransaction;
      transactions.push(data);
    });
    
    return transactions;
  } catch (error) {
    console.error("Error getting income transactions:", error);
    throw error;
  }
};

export const getExpenseTransactions = async (limitCount?: number): Promise<ExpenseTransaction[]> => {
  try {
    const transactionsRef = collection(db, "finance_transactions");
    const q = query(
      transactionsRef, 
      where("transaction_type", "==", finance_transaction_type.EXPENSE),
      orderBy("created_date", "desc"),
      limit(limitCount || 10)
    );
    const snapshot = await getDocs(q);
    
    const transactions: ExpenseTransaction[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as ExpenseTransaction;
      transactions.push(data);
    });
    
    return transactions;
  } catch (error) {
    console.error("Error getting expense transactions:", error);
    throw error;
  }
};

export const getTransferTransactions = async (): Promise<TransferTransaction[]> => {
  try {
    const transactionsRef = collection(db, "finance_transactions");
    const q = query(
      transactionsRef, 
      where("transaction_type", "==", finance_transaction_type.TRANSFER),
      orderBy("created_date", "desc")
    );
    const snapshot = await getDocs(q);
    
    const transactions: TransferTransaction[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data() as TransferTransaction;
      transactions.push(data);
    });
    
    return transactions;
  } catch (error) {
    console.error("Error getting transfer transactions:", error);
    throw error;
  }
};

export const getTransactionById = async (transactionId: string): Promise<IncomeTransaction | ExpenseTransaction | TransferTransaction | null> => {
  try {
    const transactionsRef = collection(db, "finance_transactions");
    const q = query(transactionsRef, where("transaction_id", "==", transactionId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return doc.data() as (IncomeTransaction | ExpenseTransaction | TransferTransaction);
    }
    
    return null;
  } catch (error) {
    console.error("Error getting transaction by ID:", error);
    throw error;
  }
};

export const createIncomeTransaction = async (transactionData: IncomeTransaction): Promise<string> => {
  try {
    const transactionId = transactionData.transaction_id || await generateRandomFinanceTransactionId();
    const transactionRef = doc(db, "finance_transactions", transactionId);
    // Check for duplicate transaction_id document
    const existingDoc = await getDoc(transactionRef);
    if (existingDoc.exists()) {
      throw new Error(`Finance transaction with ID "${transactionId}" already exists.`);
    }
    const transactionToSave = {
      ...transactionData,
      transaction_id: transactionId,
      transaction_type: finance_transaction_type.INCOME,
      created_date: transactionData.created_date || Timestamp.now(),
      updated_date: Timestamp.now()
    };
    await setDoc(transactionRef, transactionToSave);
    // Update wallet balance if payment is completed
    if (transactionData.payment_status === payment_status.COMPLETED && 
        transactionData.payment_deatils && 
        transactionData.payment_deatils.wallet_id && 
        transactionData.total_amount) {
      await updateWalletBalance(
        transactionData.payment_deatils.wallet_id,
        transactionData.total_amount,
        true // Add to wallet
      );
    }
    return transactionId;
  } catch (error) {
    console.error("Error creating income transaction:", error);
    throw error;
  }
};

export const createExpenseTransaction = async (transactionData: ExpenseTransaction): Promise<string> => {
  try {
    const transactionId = transactionData.transaction_id || await generateRandomFinanceTransactionId();
    const transactionRef = doc(db, "finance_transactions", transactionId);
    // Check for duplicate transaction_id document
    const existingDoc = await getDoc(transactionRef);
    if (existingDoc.exists()) {
      throw new Error(`Finance transaction with ID "${transactionId}" already exists.`);
    }
    const transactionToSave = {
      ...transactionData,
      transaction_id: transactionId,
      transaction_type: finance_transaction_type.EXPENSE,
      created_date: transactionData.created_date || Timestamp.now(),
      updated_date: Timestamp.now()
    };
    await setDoc(transactionRef, transactionToSave);
    // Update wallet balance if payment is completed
    if (transactionData.payment_status === payment_status.COMPLETED && 
        transactionData.payment_deatils && 
        transactionData.payment_deatils.wallet_id && 
        transactionData.total_amount) {
      await updateWalletBalance(
        transactionData.payment_deatils.wallet_id,
        transactionData.total_amount,
        false // Subtract from wallet
      );
    }
    return transactionId;
  } catch (error) {
    console.error("Error creating expense transaction:", error);
    throw error;
  }
};

export const createTransferTransaction = async (transactionData: TransferTransaction): Promise<string> => {
  try {
    const transactionId = transactionData.transaction_id || await generateRandomFinanceTransactionId();
    const transactionRef = doc(db, "finance_transactions", transactionId);
    // Check for duplicate transaction_id document
    const existingDoc = await getDoc(transactionRef);
    if (existingDoc.exists()) {
      throw new Error(`Finance transaction with ID "${transactionId}" already exists.`);
    }
    const transactionToSave = {
      ...transactionData,
      transaction_id: transactionId,
      transaction_type: finance_transaction_type.TRANSFER,
      created_date: transactionData.created_date || Timestamp.now(),
      updated_date: Timestamp.now()
    };
    await setDoc(transactionRef, transactionToSave);
    // Update wallet balances for transfer
    if (transactionData.from_wallet_id && transactionData.to_wallet_id && transactionData.total_amount) {
      await updateWalletBalance(
        transactionData.from_wallet_id,
        transactionData.total_amount,
        false // Subtract from source wallet
      );
      await updateWalletBalance(
        transactionData.to_wallet_id,
        transactionData.total_amount,
        true // Add to destination wallet
      );
    }
    return transactionId;
  } catch (error) {
    console.error("Error creating transfer transaction:", error);
    throw error;
  }
};

export const updateTransactionStatus = async (
  transactionId: string, 
  status: payment_status, 
  walletId?: string,
  image?: string
): Promise<void> => {
  try {
    const transactionRef = doc(db, "finance_transactions", transactionId);
    const transactionDoc = await getDoc(transactionRef);
    
    if (transactionDoc.exists()) {
      const transaction = transactionDoc.data() as (IncomeTransaction | ExpenseTransaction);
      
      // If we're changing from a non-completed status to completed, update wallet
      if (transaction.payment_status !== payment_status.COMPLETED && 
          status === payment_status.COMPLETED &&
          walletId && 
          transaction.total_amount) {
        
        const isIncome = transaction.transaction_type === finance_transaction_type.INCOME;
        
        // Update payment details with wallet ID
        const paymentDetails = {
          ...transaction.payment_deatils,
          wallet_id: walletId,
          payment_image: image || "",
        };
        
        await updateDoc(transactionRef, { 
          payment_status: status,
          payment_deatils: paymentDetails,
          updated_date: Timestamp.now() 
        });
        
        // Update wallet balance
        await updateWalletBalance(
          walletId,
          transaction.total_amount,
          isIncome // Add for income, subtract for expense
        );
      } else {
        // Just update status
        await updateDoc(transactionRef, { 
          payment_status: status,
          updated_date: Timestamp.now() 
        });
      }
    }
  } catch (error) {
    console.error("Error updating transaction status:", error);
    throw error;
  }
};