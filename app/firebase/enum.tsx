export enum OrderStatus {
    PENDING = "PENDING",
    SHIPPING = "SHIPPING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED"
  }

  export enum OrderStatusDisplay {
    PENDING = "รอยืนยัน",
    SHIPPING = "กำลังจัดส่ง",
    COMPLETED = "เสร็จสิ้น",
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
  
