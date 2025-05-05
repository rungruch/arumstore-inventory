export enum wallet_type_display {
    NONE = "ไม่ระบุ",
    CASH = "เงินสด",
    BANK = "ธนาคาร",
    EWALLET = "กระเป๋าเงินอิเล็กทรอนิกส์",
    PROMTPAY = "พร้อมเพย์",
  }
export enum wallet_type {
    NONE = "NONE",
    CASH = "CASH",
    BANK = "BANK",
    EWALLET = "EWALLET",
    PROMTPAY = "PROMTPAY",
  }
export enum payment_status {
    PENDING = "PENDING",
    COMPLETED = "COMPLETED",
    CANCELLED = "CANCELLED",
    FAILED = "FAILED",
  }

export enum payment_status_display {
    PENDING = "รอดำเนินการ",
    COMPLETED = "เสร็จสมบูรณ์",
    CANCELLED = "ยกเลิก",
    FAILED = "ล้มเหลว",
  }

  export enum finance_transaction_type {
    INCOME = "INCOME",
    EXPENSE = "EXPENSE",
    TRANSFER = "TRANSFER"
}