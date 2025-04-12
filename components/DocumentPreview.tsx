"use client";
// components/DocumentPreview.tsx
import React, { JSX, useEffect, useState } from 'react';
import ReceiptDocument from '../components/template/TaxInvoiceDocument';
import { getSellTransactionByTransactionId } from "@/app/firebase/firestore";
import { useSearchParams } from "next/navigation";
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';

// Define interfaces for structured data
interface StoreInfo {
  name: string;
  branch_name: string;
  address: string;
  phone: string;
  email: string;
  tax_id: string;
}

interface CustomerInfo {
  name: string;
  address: string;
  branch_name: string;
  branch_id: string;
  tax_id: string;
  phone: string;
  email: string;
}

interface OrderInfo {
  date: string;
  orderNumber: string;
  titleDocument: string;
  documentType: string;
}

interface Item {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Totals {
  textTotal: string;
  rawTotal: number;
  discount: number;
  total_amount: number;
  total_amount_no_vat: number;
  total_vat: number;
  shipping_cost: number;
}

interface DocumentData {
  storeInfo: StoreInfo;
  customerInfo: CustomerInfo;
  orderInfo: OrderInfo;
  items: Item[];
  totals: Totals;
}

interface TransactionItem {
  sku?: string;
  name?: string;
  quantity?: number;
  price?: number;
  subtotal?: number;
  discount?: number;
}

interface TransactionData {
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
}

export default function DocumentPreview(): JSX.Element {
  const searchParams = useSearchParams();
  const transaction_id = searchParams.get("transaction_id");
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction_id) {
      setError("No transaction ID provided");
      setIsLoading(false);
      return;
    }

    const fetchTransactionData = async (): Promise<void> => {
      try {
        setIsLoading(true);
        const transactionData: any = await getSellTransactionByTransactionId(transaction_id);
        
        if (!transactionData) {
          setError("Transaction not found");
          setIsLoading(false);
          return;
        }

        // Format products from transaction data
        const products: Item[] = transactionData?.items ? transactionData.items.map((item: TransactionItem) => ({
          id: item.sku || '',
          name: item.name || '',
          quantity: item.quantity || 0,
          unitPrice: item.price || 0,
          total: (item.subtotal || 0),
          discount: (item.discount ?? 0),
        })) : [];

        console.log(transactionData);
        console.log(transactionData.items);
        // Calculate total amount
        const rawtotalAmount: number = transactionData.items.reduce((acc:any, product:any) => acc + (product.subtotal || 0), 0);
        const rawtotalDiscount: number = transactionData.items.reduce((acc:any, product:any) => acc + (product.quantity || 0) * (product.discount || 0), 0);

        console.log("rawtotalAmount", rawtotalAmount);
        console.log("rawtotalDiscount", rawtotalDiscount);
      
        // Format date from Firestore timestamp
        const formattedDate: string = transactionData.created_date ? 
          new Date(transactionData.created_date.toDate()).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) : "-";

        // Prepare complete document data
        const formattedDocumentData: DocumentData = {
          storeInfo: {
            name: "บริษัท อินเตอร์เน็ต เมค มี ริช จำกัด",
            branch_name: "(สำนักงานใหญ่)",
            address: "299/128 ถนนวิภาวดีรังสิต แขวงตลาดบางเขน เขตหลักสี่ กรุงเทพมหานคร 10210",
            phone: "088-178-8669",
            email: "icesouthmanagers@gmail.com",
            tax_id: "0105566043410"
          },
          customerInfo: {
            name: transactionData.client_name || '',
            address: transactionData.client_address || '',
            branch_name: transactionData.branch_name || '',
            branch_id: transactionData.branch_id || '',
            tax_id: transactionData.tax_id || '',
            phone: transactionData.client_tel || '',
            email: transactionData.client_email || '',
          },
          orderInfo: {
            date: formattedDate,
            orderNumber: transactionData.transaction_id || '',
            titleDocument: "ใบกำกับภาษี/ใบเสร็จรับเงิน",
            documentType: "ต้นฉบับ",
          },
          items: products,
          totals: {
            textTotal: "บาท",
            rawTotal: rawtotalAmount || 0,
            discount: rawtotalDiscount || 0,
            total_amount: transactionData.total_amount || 0,
            total_amount_no_vat: transactionData.total_amount_no_vat || 0,
            total_vat: transactionData.total_vat || 0,
            shipping_cost: transactionData.shipping_cost || 0,
          }
        };

        setDocumentData(formattedDocumentData);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching transaction data:", error);
        setError("Failed to fetch transaction data");
        setIsLoading(false);
      }
    };

    fetchTransactionData();
  }, [transaction_id]);

  // Handle form changes to update document data
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    section: keyof DocumentData, 
    field: string
  ): void => {
    if (!documentData) return;
    
    setDocumentData({
      ...documentData,
      [section]: {
        ...documentData[section],
        [field]: e.target.value
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (error) {
    console.error("Error:", error);
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</div>
      </div>
    );
  }

  if (!documentData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">ไม่พบข้อมูลเอกสาร</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Configuration Panel */}
      <div className="w-full lg:w-1/3 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">แก้ไขข้อมูลเอกสาร</h2>

        <h3 className="font-medium mb-2">หัวเอกสาร/สำเนา-ต้นฉบับ/วันที่/หมวดผู้ซื้อ/หมายเหตุ/ตัวเลือกลายเซนต์</h3>
        <h3 className="font-medium mb-2">หัวข้อเอกสาร</h3>
        <div className="mb-4">
            <div className="space-y-2">
              <div className="relative">
              <input
                type="text"
                list="titleDocumentOptions"
                placeholder="ชื่อเอกสาร"
                value={documentData.orderInfo.titleDocument}
                onChange={(e) => handleChange(e as any, 'orderInfo', 'titleDocument')}
                className="w-full p-2 border rounded"
              />
              <datalist id="titleDocumentOptions">
                <option value="ใบกำกับภาษี/ใบเสร็จรับเงิน" />
                <option value="ใบกำกับภาษี" />
                <option value="ใบเสร็จรับเงิน" />
                <option value="ใบวางบิล" />
                <option value="ใบแจ้งหนี้" />
              </datalist>
              </div>
              <select
              value={documentData.orderInfo.documentType}
              onChange={(e) => handleChange(e as any, 'orderInfo', 'documentType')}
              className="w-full p-2 border rounded"
              >
              <option value="ต้นฉบับ">ต้นฉบับ</option>
              <option value="สำเนา">สำเนา</option>
              </select>
            </div>
        </div>
        <h3 className="font-medium mb-2">รายการผู้ซื้อ</h3>
        <div className="mb-4">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="ชื่อผู้ซื้อ"
              value={documentData.customerInfo.name}
              onChange={(e) => handleChange(e, 'customerInfo', 'name')}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="ที่อยู่ผู้ซื้อ"
              value={documentData.customerInfo.address}
              onChange={(e) => handleChange(e, 'customerInfo', 'address')}
              className="w-full p-2 border rounded"
            />

            <input
              type="text"
              placeholder="ชื่อสาขา"
              value={documentData.customerInfo.branch_name}
              onChange={(e) => handleChange(e, 'customerInfo', 'branch_name')}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="รหัสสาขา"
              value={documentData.customerInfo.branch_id}
              onChange={(e) => handleChange(e, 'customerInfo', 'branch_id')}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="เลขประจำตัวผู้เสียภาษี"
              value={documentData.customerInfo.tax_id}
              onChange={(e) => handleChange(e, 'customerInfo', 'tax_id')}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="เบอร์โทรศัพท์"
              value={documentData.customerInfo.phone}
              onChange={(e) => handleChange(e, 'customerInfo', 'phone')}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              placeholder="อีเมล"
              value={documentData.customerInfo.email}
              onChange={(e) => handleChange(e, 'customerInfo', 'email')}
              className="w-full p-2 border rounded"
            />
            
          </div>
        </div>

        {/* Download Button */}
        <div className="mt-4">
          <PDFDownloadLink
            document={<ReceiptDocument data={documentData} />}
            fileName={`receipt-${documentData.orderInfo.orderNumber}.pdf`}
            className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {({ loading }) => (loading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF')}
          </PDFDownloadLink>
        </div>
      </div>

      {/* PDF Preview */}
      <div className="w-full lg:w-2/3 h-[800px] border rounded-lg">
        <PDFViewer width="100%" height="100%" className="border-0">
          <ReceiptDocument data={documentData} />
        </PDFViewer>
      </div>
    </div>
  );
}