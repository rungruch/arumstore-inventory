import { wallet_type, payment_status, finance_transaction_type } from "./enum";
import { Timestamp } from "firebase/firestore";


// Wallet Collection = finance_wallet
// Finance Transaction Collection = finance_transaction (keeps IncomeTransaction, ExpenseTransaction, TransferTransaction)

export interface WalletCollection {
    wallet_id: string;
    wallet_name: string;
    wallet_type: wallet_type;
    bank_provider: string;
    bank_account: string;
    bank_account_name: string;
    total: number;
    payment_image?: string;
}

export interface FinanceTransactionItem {
    name: string;
    type: string;
    amount: string;
}

export interface FinancePatmentDetails {
    payment_method: string;
    patment_date: Timestamp;
    wallet_id: string;
    patment_amount: number;
}

export interface IncomeTransaction {
    transaction_id?: string;
    transaction_type?: finance_transaction_type.INCOME;
    created_date?: Timestamp
    updated_date?: Timestamp;
    client_name?: string;
    client_address?: string;
    branch_name?: string;
    branch_id?: string;
    tax_id?: string;
    client_tel?: string;
    client_email?: string;
    items?: FinanceTransactionItem[];
    total_amount?: number;
    total_amount_no_vat?: number;
    total_vat?: number;
    notes?: string;
    payment_status?: payment_status;
    payment_deatils?:FinancePatmentDetails;
}

export interface ExpenseTransaction {
    transaction_id?: string;
    transaction_type?: finance_transaction_type.EXPENSE;
    created_date?: Timestamp
    updated_date?: Timestamp;
    client_name?: string;
    client_address?: string;
    branch_name?: string;
    branch_id?: string;
    tax_id?: string;
    client_tel?: string;
    client_email?: string;
    items?: FinanceTransactionItem[];
    total_amount?: number;
    total_amount_no_vat?: number;
    total_vat?: number;
    notes?: string;
    payment_status?: payment_status;
    payment_deatils?:FinancePatmentDetails;
}     

export interface TransferTransaction {
    transaction_id?: string;
    transaction_type?: finance_transaction_type.TRANSFER;
    from_wallet_id?: string;
    to_wallet_id?: string;
    created_date?: Timestamp
    updated_date?: Timestamp;
    total_amount?: number;
}     