export enum OrderStatus {
    PENDING = "PENDING",
    SHIPPING = "SHIPPING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED",
    FAILED = "FAILED"
  }

  export enum OrderStatusDisplay {
    PENDING = "รอชำระ",
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