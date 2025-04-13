"use client";
// components/DocumentPreview.tsx
import React, { JSX, useEffect, useState } from 'react';
import ReceiptDocument from '../components/template/TaxInvoiceDocument';
import { getSellTransactionByTransactionId } from "@/app/firebase/firestore";
import { useSearchParams } from "next/navigation";
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { bahttext } from "bahttext";
import {StoreInfo, CustomerInfo, OrderInfo, Item, Totals, PaymentSummary, DocumentData, TransactionItem, TransactionData} from '../components/interface';

export default function DocumentPreview(): JSX.Element {
  const searchParams = useSearchParams();
  const transaction_id = searchParams.get("transaction_id");
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Add a key state to force re-renders
  const [pdfKey, setPdfKey] = useState<number>(Date.now());

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
          unitType: item.unit_type || 'ชิ้น',
          unitPrice: item.price || 0,
          total: (item.subtotal || 0),
          discount: (item.discount ?? 0),
        })) : [];

        // Calculate total amount
        const rawtotalAmount: number = transactionData.items.reduce((acc:any, product:any) => acc + (product.subtotal || 0), 0);
        const rawtotalDiscount: number = transactionData.items.reduce((acc:any, product:any) => acc + (product.quantity || 0) * (product.discount || 0), 0);
      
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
            documentNote: "",
            paymentMethod: transactionData.payment_method || 'เงินสด',
            receiverSignatureEnabled: true,
            senderSignatureEnabled: false,
            receiverMoneySignatureEnabled: true,
            approverSignatureEnabled: false,
            showPriceSummary: true,
          },
          paymentSummary: {
            paymentSummaryEnabled: false,
            paymentDate: formattedDate,
            paymentMethod: transactionData.payment_method || 'เงินสด',
            paymentReference: '',
            paymentAmount: transactionData.total_amount || 0,
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
            thaiTotal_amount: bahttext(transactionData.total_amount || 0)
          }
        };

        setDocumentData(formattedDocumentData);
        setIsLoading(false);
        // Generate a new key when data changes
        setPdfKey(Date.now());
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
    
    // Update key to force PDF re-render when data changes
    setPdfKey(Date.now());
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
                <option value="ใบส่งสินค้า" />
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

        <h3 className="font-medium mb-2">หมวดชำระเงิน</h3>
        <div className="mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={documentData.paymentSummary.paymentSummaryEnabled}
                onChange={(e) =>
                handleChange(
                { target: { value: e.target.checked } } as any,
                'paymentSummary',
                'paymentSummaryEnabled'
                )
                }
                className="w-4 h-4"
              />
              <label>แสดงหมวดชำระเงิน</label>
              </div>
              <div className="relative">
              <input
              type="text"
              list="paymentMethodOptions"
              placeholder="ชำระเงินด้วย"
              value={documentData.orderInfo.paymentMethod}
              onChange={(e) => handleChange(e as any, 'orderInfo', 'paymentMethod')}
              className="w-full p-2 border rounded"
              />
              <datalist id="paymentMethodOptions">
              <option value="เงินสด" />
              <option value="โอนเงินผ่านธนาคาร" />
              <option value="เช็คธนาคาร" />
              </datalist>
            </div>

                <input
                type="text"
                placeholder="อ้างอิงการชำระเงิน"
                value={documentData.paymentSummary.paymentReference}
                onChange={(e) => handleChange(e, 'paymentSummary', 'paymentReference')}
                className="w-full p-2 border rounded"
                />
                <input
                type="date"
                placeholder="วันที่ชำระเงิน"
                value={(() => {
                  const thaiDate = documentData.paymentSummary.paymentDate;
                  if (!thaiDate) return '';
                  
                  // Extract year, month, and day from Thai date format
                  const parts = thaiDate.split(' ');
                  if (parts.length !== 3) return '';
                  
                  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                          'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
                  
                  const day = parts[0];
                  const month = (thaiMonths.indexOf(parts[1]) + 1).toString().padStart(2, '0');
                  const year = parseInt(parts[2]) - 543;
                  
                  return `${year}-${month}-${day.padStart(2, '0')}`;
                })()}
                onChange={(e) => {
                const date = new Date(e.target.value);
                const formattedDate = date.toLocaleString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
                handleChange(
                  { target: { value: formattedDate } } as any,
                  'paymentSummary',
                  'paymentDate'
                );
                }}
                className="w-full p-2 border rounded"
              />
            
            </div>
        </div>

        <h3 className="font-medium mb-2">อื่นๆ</h3>
        <div className="mb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={documentData.orderInfo.showPriceSummary}
                onChange={(e) =>
                handleChange(
                { target: { value: e.target.checked } } as any,
                'orderInfo',
                'showPriceSummary'
                )
                }
                className="w-4 h-4"
              />
              <label>แสดงราคาสรุปยอด</label>
              </div>
              <textarea
                placeholder="หมายเหตุ"
                value={documentData.orderInfo.documentNote}
                onChange={(e) => handleChange(e as any, 'orderInfo', 'documentNote')}
                className="w-full p-2 border rounded"
                rows={3}
              />
              <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={documentData.orderInfo.receiverSignatureEnabled}
                onChange={(e) =>
                handleChange(
                { target: { value: e.target.checked } } as any,
                'orderInfo',
                'receiverSignatureEnabled'
                )
                }
                className="w-4 h-4"
              />
              <label>แสดงผู้รับสินค้า</label>
              </div>

              <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={documentData.orderInfo.senderSignatureEnabled}
                onChange={(e) =>
                handleChange(
                { target: { value: e.target.checked } } as any,
                'orderInfo',
                'senderSignatureEnabled'
                )
                }
                className="w-4 h-4"
              />
              <label>แสดงผู้ส่งสินค้า</label>
              </div>

              <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={documentData.orderInfo.receiverMoneySignatureEnabled}
                onChange={(e) =>
                handleChange(
                { target: { value: e.target.checked } } as any,
                'orderInfo',
                'receiverMoneySignatureEnabled'
                )
                }
                className="w-4 h-4"
              />
              <label>แสดงผู้รับเงิน</label>
              </div>

              <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={documentData.orderInfo.approverSignatureEnabled}
                onChange={(e) =>
                handleChange(
                { target: { value: e.target.checked } } as any,
                'orderInfo',
                'approverSignatureEnabled'
                )
                }
                className="w-4 h-4"
              />
              <label>แสดงผู้อนุมัติ</label>
              </div>
              
            </div>
        </div>

        {/* Download Button */}
        <div className="mt-7">
          <PDFDownloadLink
            key={`download-${pdfKey}`}
            document={<ReceiptDocument key={`receipt-doc-${pdfKey}`} data={documentData} />}
            fileName={`receipt-${documentData.orderInfo.orderNumber}.pdf`}
            className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {({ loading }) => (loading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด')}
          </PDFDownloadLink>
        </div>
      </div>

      {/* PDF Preview */}
      <div className="w-full lg:w-2/3 h-[800px] border rounded-lg">
        <PDFViewer 
          key={`viewer-${pdfKey}`}
          width="100%" 
          height="100%" 
          className="border-0"
        >
          <ReceiptDocument 
            key={`receipt-view-${pdfKey}`} 
            data={documentData} 
          />
        </PDFViewer>
      </div>
    </div>
  );
}