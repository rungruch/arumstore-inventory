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
    buy_price_average: number;
  };
  stocks: { [key: string]: number }; // Ensure `stocks` is an object with numerical values
  pending_stock: { [key: string]: number }; // Similarly define pending_stock
  updated_date: { toDate: () => Date } | null; // Adjust if needed for your actual structure
  created_date: { toDate: () => Date } | null;
  sku_image: string;
  unit_type: string;
  barcode: string;
  delivery_details: {
    height_cm: number;
    weight_kg: number;
    length_cm: number;
    width_cm: number;
  };
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

export interface Contact {
  client_id: string;
  name: string;
  tax_reference?: {
    tax_id?: string;
    branch_name?: string;
    branch_number?: string;
  };
  contact_info?: {
    name?: string;
    email?: string;
    phone?: string;
    home_phone?: string;
    fax?: string;
  };
  social_media?: {
    facebook?: string;
    line?: string;
    instagram?: string;
  };
  address?: string;
  group?: string;
  notes?: string;
  created_date: Timestamp;
  updated_date: Timestamp;
}