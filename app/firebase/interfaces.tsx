// interfaces/warehouse.ts
import { Timestamp } from "firebase/firestore";

export interface Warehouse {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  details: string;
  type: string;
  created_date: Timestamp;
  updated_date: Timestamp;
}

export interface Products {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: {
    buy_price: number;
    sell_price: number;
  };
  stocks: { [key: string]: number }; // Ensure `stocks` is an object with numerical values
  pending_stock: { [key: string]: number }; // Similarly define pending_stock
  updated_date: { toDate: () => Date } | null; // Adjust if needed for your actual structure
  created_date: { toDate: () => Date } | null;
}

export interface SellTransaction {
  id: string;
  transaction_id: string;
  client_id: string;
  status: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
    discount: number;
    subtotal: number;
  }[];
  total_amount: number;
  payment_method: string;
  payment_status: string;
  warehouse_id: string;
  notes: string;
  created_by: string;
  created_date: Timestamp;
  updated_date: Timestamp;
}