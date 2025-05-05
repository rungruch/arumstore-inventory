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

export interface PurchaseTransaction {
  id: string;
  transaction_id: string;
  supplier_id: string;
  supplier_name: string;
  status: string;
  items: {
    sku: string;
    name: string;
    quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    unit_type: string;
    warehouse_id: string;
  }[];
  total_amount: number;
  total_vat: number;
  total_amount_no_vat: number;
  payment_method: string;
  payment_status: string;
  warehouse: string;
  tax_id: string;
  branch_name: string;
  branch_id: string;
  supplier_address: string;
  supplier_tel: string;
  supplier_email: string;
  notes: string;
  created_by: string;
  updated_by: string;
  created_date: Timestamp;
  updated_date: Timestamp;
}

export interface TransferTransaction {
  transaction_id: string;
  transaction_type: string;
  status: string;
  items: {
    sku: string;
    quantity: number;
    subtotal: number;
  }[];
  warehouse: string;
  to_warehouse: string;
  notes: string;
  created_by: string;
  updated_by: string;
  created_date: Timestamp;
  updated_date: Timestamp;
}
export interface TransferTransactionImport {
  transaction_id: string;
  items: {
    sku: string;
    quantity: number;

  }[];
  warehouse: string;
  to_warehouse: string;
  notes: string;
  created_by: string;
  updated_by: string;
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

export interface MonthlyIncome {
  str_date: string; // date in format yyyy-mm // 2025-04
  date: Timestamp; //calculate date
  created_date: Timestamp;
  allIncome:number
  skus: {
    name:string,
    sku:string,
    quantity:number,
    totalIncome:number
  }[]
}
export interface YearlyIncome {
  date: Timestamp;
  created_date: Timestamp;
  allIncome:number
  skus: {
    name:string,
    sku:string,
    quantity:number,
    totalIncome:number
  }[]
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'staff';
  permissions: {
    sales: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
    products: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
    customers: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
    purchases: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
    finance: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
    users: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    };
  };
  lastLogin: Timestamp;
  created_date: Timestamp;
  updated_date: Timestamp;
}

export interface ProductCategoryCount {
  date: Timestamp;
  skus: {
    [any: string]: {
      count: number;
      totalIncome: number;
      totalPendingIncome: number;
    }
  }
}[]