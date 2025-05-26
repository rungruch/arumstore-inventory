export enum OrderStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    SHIPPING = "SHIPPING",
    CANCELLED = "CANCELLED"
  }

  export enum PaymentStatus {
    PENDING = "NONE",
    COMPLETED = "PAID",
    PENDING_REFUND = "PENDING_REFUND",
    REFUNDED = "REFUNDED"
  }

  export enum PaymentStatusDisplay {
    NONE = "รอชำระ",
    PAID = "ชำระแล้ว",
    PENDING_REFUND = "รอคืนเงิน",
    REFUNDED = "คืนเงินแล้ว"
  }

  export enum ShippingStatus {
    PENDING = "PENDING",
    SHIPPED = "SHIPPED"
  }

  export enum ShippingStatusDisplay {
    PENDING = "รอดำเนินการ",
    SHIPPED = "จัดส่งแล้ว"
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
    APPROVED = "APPROVED",
    SHIPPING = "SHIPPING",
    CANCELLED = "CANCELLED"
  }

  export enum PaymentStatusFilter {
    ALL = "ALL",
    PENDING = "NONE",
    COMPLETED = "PAID",
    PENDING_REFUND = "PENDING_REFUND",
    REFUNDED = "REFUNDED"
  }

  export enum ShippingStatusFilter {
    ALL = "ALL",
    PENDING = "PENDING",
    SHIPPED = "SHIPPED"
  }

  export enum OrderStatusDisplay {
    PENDING = "รออนุมัติ",
    APPROVED = "อนุมัติแล้ว",
    SHIPPING = "เก็บปลายทาง",
    CANCELLED = "ยกเลิก"
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

  enum DeliveryType {
    PICKUP = "PICKUP",
    SHIPPING = "SHIPPING"
  }
  
  export const STATUS_TRANSITIONS: { [key in OrderStatus]: OrderStatus[] } = {
    [OrderStatus.PENDING]: [
      OrderStatus.APPROVED,
      OrderStatus.SHIPPING, 
      OrderStatus.CANCELLED
    ],
    [OrderStatus.APPROVED]: [OrderStatus.CANCELLED], // Allow cancellation of approved orders
    [OrderStatus.SHIPPING]: [
      OrderStatus.CANCELLED
    ],
    [OrderStatus.CANCELLED]: []
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

  export const PAYMENT_STATUS_TRANSITIONS: { [key in PaymentStatus]: PaymentStatus[] } = {
    [PaymentStatus.PENDING]: [
      PaymentStatus.COMPLETED,
      PaymentStatus.PENDING_REFUND
    ],
    [PaymentStatus.COMPLETED]: [
      PaymentStatus.PENDING_REFUND
    ],
    [PaymentStatus.PENDING_REFUND]: [
      PaymentStatus.REFUNDED,
      PaymentStatus.COMPLETED // Allow returning to completed if refund is cancelled
    ],
    [PaymentStatus.REFUNDED]: [] // Terminal state
  };
