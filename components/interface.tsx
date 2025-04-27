import { Timestamp } from "firebase/firestore";

export interface StoreInfo {
    name: string;
    branch_name: string;
    address: string;
    phone: string;
    email: string;
    tax_id: string;
    transferPaymentInfo: string;
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
    buyerSignatureEnabled: boolean;
    sellerSignatureEnabled: boolean;
    receiverSignatureEnabled: boolean;
    senderSignatureEnabled: boolean;
    receiverMoneySignatureEnabled: boolean;
    approverSignatureEnabled: boolean;
    showPriceSummary: boolean;
    showStoretransferPaymentInfo: boolean;
    showQuotationSection: boolean;
    quotationCondition: string;
    quotationShippingCondition: string;
    quotationCredit: string;
    quotationExpiredate: string
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

  export interface newTransactionItem {
    initial_quantity: number;
    subtotal: number;
    price: number;
    quantity: number;
    unit_type: string;
    warehouse_id: string;
    sku: string;
    name: string;
    discount?: number;
  }
  
  export interface newTransaction {
    id?: string;
    notes: string;
    tax_id: string;
    client_name: string;
    branch_id: string;
    shipping_cost: string;
    total_vat: number;
    sell_method: string;
    updated_by: string;
    total_amount: number;
    payment_method: string;
    warehouse: string;
    client_address: string;
    shipping_method: string;
    client_id: string;
    vat_type: string;
    status: string;
    created_date: Timestamp;
    payment_status: string;
    client_description: string;
    transaction_id: string;
    client_email: string;
    transaction_type: string;
    created_by: string;
    branch_name: string;
    client_tel: string;
    items: newTransactionItem[];
    total_amount_no_vat: number;
    updated_date: Timestamp;
  }

  export interface ExcelExportRow {
    'ลำดับ': string;
    'รหัสรายการ': string;
    'ชื่อ': string;
    'วันที่': string;
    'เลขที่ผู้เสียภาษี': string;
    'ค่าส่ง': string;
    'ยอดรวม': string;
    'ภาษีมูลค่าเพิ่ม': string;
    'ยอดสุทธิ': string;
    'สถานะ': string;
  }