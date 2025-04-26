export enum OrderStatus {
    PENDING = "PENDING",
    SHIPPING = "SHIPPING",
    SHIPPED = "SHIPPED",
    PICKED_UP = "PICKED_UP",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
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
    FAILED = "ล้มเหลว"
  }

  export enum TransactionType {
    BUY = "BUY",
    SELL = "SELL",
    REFUND = "REFUND"
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
