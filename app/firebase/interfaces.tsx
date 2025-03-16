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