"use client";
// app/document/download/page.tsx (for App Router) 
// OR 
// pages/document/download.tsx (for Pages Router)

import React, { JSX, useEffect, useState } from 'react';
import { useSearchParams } from "next/navigation";
import { getSellTransactionByTransactionId } from "@/app/firebase/firestore";
import ReceiptDocument from "@/components/template/ShippingLabelDocument";
import { pdf } from '@react-pdf/renderer';
import { bahttext } from "bahttext";
import {StoreInfo, CustomerInfo, OrderInfo, Item, Totals, PaymentSummary, DocumentData, TransactionItem, TransactionData} from '@/components/interface';

export default function DocumentAutoDownload(): JSX.Element {
  const searchParams = useSearchParams();
  const transaction_id = searchParams.get("transaction_id");
  const redirect = searchParams.get("redirect") || "/documents";
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transaction_id) {
      setError("No transaction ID provided");
      setIsLoading(false);
      
      // Redirect if no transaction ID
      setTimeout(() => {
        window.location.href = `/documents?error=${encodeURIComponent("No transaction ID provided")}`;
      }, 500);
      
      return;
    }

    const fetchAndGeneratePDF = async (): Promise<void> => {
      try {
        // Fetch transaction data
        const transactionData = await getSellTransactionByTransactionId(transaction_id) as TransactionData;
        
        if (!transactionData) {
          setError("Transaction not found");
          setIsLoading(false);
          
          // Redirect if transaction not found
          setTimeout(() => {
            window.location.href = `/documents?error=${encodeURIComponent("Transaction not found")}`;
          }, 500);
          
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
        const rawtotalAmount: number = transactionData.items?.reduce((acc: number, product: TransactionItem) => 
          acc + (product.subtotal || 0), 0) || 0;
        
        const rawtotalDiscount: number = transactionData.items?.reduce((acc: number, product: TransactionItem) => 
          acc + (product.quantity || 0) * (product.discount || 0), 0) || 0;
      
        // Format date from Firestore timestamp
        const formattedDate: string = transactionData.created_date ? 
          new Date(transactionData.created_date.toDate()).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }) : "-";

        // Prepare complete document data
        const documentData: any = {
          storeInfo: {
            name: "บริษัท อินเตอร์เน็ต เมค มี ริช จำกัด",
            branch_name: "(สำนักงานใหญ่)",
            address: "299/128 ถนนวิภาวดีรังสิต แขวงตลาดบางเขน เขตหลักสี่ กรุงเทพมหานคร 10210",
            phone: "088-178-8669",
            email: "icesouthmanagers@gmail.com",
          },
          customerInfo: {
            orderNumber: transactionData.transaction_id || '',
            name: transactionData.client_name || '',
            address: transactionData.client_address || '',
            phone: transactionData.client_tel || '',
            email: transactionData.client_email || '',
          }
        };

        // Generate the PDF blob
        const blob = await pdf(
          <ReceiptDocument data={documentData} />
        ).toBlob();

        // Create a URL for the Blob
        const url = URL.createObjectURL(blob);

        // Create an anchor element and programmatically trigger the download
        const link = document.createElement('a');
        link.href = url;
        link.download = `ShippingLabel-${documentData.customerInfo.orderNumber}.pdf`;
        document.body.appendChild(link);
        link.click();

        // Clean up
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        setIsLoading(false);
        
        // Redirect after short delay to allow download to start
        setTimeout(() => {
          window.close();
        }, 1000);
        
      } catch (error) {
        console.error("Error generating PDF:", error);
        setError("Failed to generate PDF");
        setIsLoading(false);
        
      }
    };

    fetchAndGeneratePDF();
  }, [transaction_id, redirect]);

  // Minimalist UI that's essentially invisible
  return (
    <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', height: '1px', width: '1px', overflow: 'hidden' }}>
      {isLoading ? "กำลังดาวน์โหลด..." : error ? `เกิดข้อผิดพลาด: ${error}` : "ดาวน์โหลดสำเร็จ กำลังเปลี่ยนหน้า..."}
    </div>
  );
}