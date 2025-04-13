export interface StoreInfo {
    name: string;
    branch_name: string;
    address: string;
    phone: string;
    email: string;
    tax_id: string;
  }
  
  export interface CustomerInfo {
    name: string;
    address: string;
    branch_name: string;
    branch_id: string;
    tax_id: string;
    phone: string;
    email: string;
  }
  
  export interface OrderInfo {
    date: string;
    orderNumber: string;
    titleDocument: string;
    documentType: string;
    paymentMethod: string;
    documentNote: string;
    receiverSignatureEnabled: boolean;
    senderSignatureEnabled: boolean;
    receiverMoneySignatureEnabled: boolean;
    approverSignatureEnabled: boolean;
    showPriceSummary: boolean;
  }
  
  export interface Item {
    id: string;
    name: string;
    quantity: number;
    unitType: string;
    unitPrice: number;
    total: number;
  }
  
  export interface Totals {
    textTotal: string;
    rawTotal: number;
    discount: number;
    total_amount: number;
    total_amount_no_vat: number;
    total_vat: number;
    shipping_cost: number;
    thaiTotal_amount: string;
  }
  
  export interface PaymentSummary {
    paymentSummaryEnabled: boolean;
    paymentDate: string;
    paymentMethod: string;
    paymentReference: string;
    paymentAmount: number;
  }
  
  export interface DocumentData {
    storeInfo: StoreInfo;
    customerInfo: CustomerInfo;
    orderInfo: OrderInfo;
    paymentSummary: PaymentSummary;
    items: Item[];
    totals: Totals;
  }
  
  export interface TransactionItem {
    sku?: string;
    name?: string;
    quantity?: number;
    unit_type?: string;
    price?: number;
    subtotal?: number;
    discount?: number;
  }
  
  export interface TransactionData {
    transaction_id?: string;
    created_date?: {
      toDate: () => Date;
    };
    client_name?: string;
    client_address?: string;
    branch_name?: string;
    branch_id?: string;
    tax_id?: string;
    client_tel?: string;
    client_email?: string;
    items?: TransactionItem[];
    discount?: number;
    total_amount?: number;
    total_amount_no_vat?: number;
    total_vat?: number;
    shipping_cost?: number;
    payment_method?: string;
  }