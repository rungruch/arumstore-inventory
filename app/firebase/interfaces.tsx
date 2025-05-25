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
  shipping_status?: string;
  warehouse_id: string;
  notes: string;
  created_by: string;
  created_date: Timestamp;
  updated_date: Timestamp;
  status_history: StatusChangeEntry[];
  edit_history: OrderHistoryEntry[];
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
  allIncome: number;
  bySellMethod: {
    [method: string]: number;
  };
  skus: {
    name: string,
    sku: string,
    quantity: number,
    totalIncome: number,
    bySellMethod?: {
      [method: string]: {
        quantity: number,
        totalIncome: number
      }
    }
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
    [module: string]: {
      [action: string]: boolean;
    };
  };
  lastLogin: Timestamp;
  created_date: Timestamp;
  updated_date: Timestamp;
  // Enhanced session tracking fields
  lastActive?: Timestamp;
  lastLoginMethod?: 'email' | 'google' | 'facebook';
  lastUserAgent?: string;
  lastIpAddress?: string;
  provider?: string;
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

  export interface StoreInfoFirestore{
    name: string;
    branch_name: string;
    tax_id: string;
    address: string;
    current_address: string;
    eng_name: string;
    eng_branch_name: string;
    eng_address: string;
    eng_current_address: string;
    phone: string;
    email: string;
    fax: string;
    website: string;
    payment_details: string;
    logo_url: string;
    logo_document_url: string;
    quotation_condition: string;
    quotation_shipping_condition: string;
  }



  

  export interface OrderHistoryEntry {
  updated_at: Timestamp;
  created_by: string;
  old_value: any;
  new_value: any;
}

// Define a generic status change entry that can handle different types of status changes
export interface StatusChangeEntry {
  timestamp: Timestamp;
  created_by: string;
  status_type: 'order' | 'shipping' | 'payment'; // Type of status being changed
  old_status: string; // Generic string to handle OrderStatus, ShippingStatus, PaymentStatus
  new_status: string; // Generic string to handle OrderStatus, ShippingStatus, PaymentStatus
}