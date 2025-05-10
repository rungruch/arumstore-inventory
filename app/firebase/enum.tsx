export enum OrderStatus {
    PENDING = "PENDING",
    SHIPPING = "SHIPPING",
    SHIPPED = "SHIPPED",
    PICKED_UP = "PICKED_UP",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
  }

  export enum TransferStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
  }

  export enum PurchaseStatus {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
  }

  export enum PurchaseStatusDisplay {
    PENDING = "รอดำเนินการ",
    COMPLETED = "เสร็จสมบูรณ์",
    CANCELLED = "ยกเลิก",
    FAILED = "ล้มเหลว"
  }

  export enum PurchaseStatusFilter {
    ALL = "ALL",
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
  }

  export enum ProductStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    DELETED = "DELETED"
  }

  export enum OrderStatusFilter {
    ALL = "ALL",
    PENDING = "PENDING",
    SHIPPING = "SHIPPING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
  }

  export enum OrderStatusDisplay {
    PENDING = "รออนุมัติ",
    SHIPPING = "เตรียมส่ง",
    SHIPPED = "จัดส่งแล้ว",
    PICKED_UP = "รับสินค้าแล้ว",
    CANCELLED = "ยกเลิก",
    FAILED = "ล้มเหลว",
    COMPLETED = "เสร็จสมบูรณ์"
  }

  export enum TransactionType {
    BUY = "BUY",
    SELL = "SELL",
    REFUND = "REFUND",
    TRANFER = "TRANSFER",
    ADJUST = "ADJUST",
  }

  export enum VatType {
    VAT0 = "VAT0",
    VAT7 = "VAT7",
    NO_VAT = "NO_VAT",
  }

  export enum DeliveryType {
    PICKUP = "PICKUP",
    SHIPPING = "SHIPPING"
  }
  
  export const STATUS_TRANSITIONS: { [key in OrderStatus]: OrderStatus[] } = {
    [OrderStatus.PENDING]: [
      OrderStatus.SHIPPING, 
      OrderStatus.CANCELLED
    ],
    [OrderStatus.SHIPPING]: [
      OrderStatus.SHIPPED, 
      OrderStatus.PICKED_UP,
      OrderStatus.CANCELLED
    ],
    [OrderStatus.SHIPPED]: [
      OrderStatus.FAILED
    ],
    [OrderStatus.PICKED_UP]: [
      OrderStatus.FAILED
    ],
    [OrderStatus.CANCELLED]: [],
    [OrderStatus.FAILED]: []
  };
  
  export const PURCHASE_STATUS_TRANSITIONS: { [key in PurchaseStatus]: PurchaseStatus[] } = {
    [PurchaseStatus.PENDING]: [
      PurchaseStatus.COMPLETED, 
      PurchaseStatus.CANCELLED
    ],
    [PurchaseStatus.COMPLETED]: [
    ],
    [PurchaseStatus.CANCELLED]: [],
    [PurchaseStatus.FAILED]: []
  };
