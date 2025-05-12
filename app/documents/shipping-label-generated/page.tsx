"use client";
// app/document/download/page.tsx (for App Router) 
// OR 
// pages/document/download.tsx (for Pages Router)

import React, { JSX, useEffect, useState, useRef } from 'react';
import { useSearchParams } from "next/navigation";
import { getSellTransactionByTransactionId, getCompanyDetails } from "@/app/firebase/firestore";
import ReceiptDocument from "@/components/template/ShippingLabelDocument";
import { pdf } from '@react-pdf/renderer';
import {TransactionData} from '@/components/interface';

export default function DocumentAutoDownload(): JSX.Element {
  const searchParams = useSearchParams();
  const transaction_id = searchParams.get("transaction_id");
  const redirect = searchParams.get("redirect") || "/documents";
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const downloadInitiatedRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent double downloads by checking if download has already been initiated
    if (downloadInitiatedRef.current) {
      return;
    }

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
        // Set flag to prevent duplicate downloads
        downloadInitiatedRef.current = true;
        
        // Fetch transaction data and company details in parallel
        const [transactionData, companyDetails] = await Promise.all([
          getSellTransactionByTransactionId(transaction_id) as Promise<TransactionData>,
          getCompanyDetails()
        ]);

        if (!transactionData) {
          setError("Transaction not found");
          setIsLoading(false);
          
          // Redirect if transaction not found
          setTimeout(() => {
            window.location.href = `/documents?error=${encodeURIComponent("Transaction not found")}`;
          }, 500);
          
          return;
        }

        // Prepare complete document data
        const documentData: any = {
          storeInfo: {
            name: companyDetails?.name || "บริษัท อินเตอร์เน็ต เมค มี ริช จำกัด",
            branch_name: companyDetails?.branch_name || "(สำนักงานใหญ่)",
            address: companyDetails?.address || "299/128 ถนนวิภาวดีรังสิต แขวงตลาดบางเขน เขตหลักสี่ กรุงเทพมหานคร 10210",
            phone: companyDetails?.phone || "088-178-8669",
            email: companyDetails?.email || "icesouthmanagers@gmail.com",
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
        if (downloadInitiatedRef.current) {
          const link = document.createElement('a');
          link.href = url;
          link.download = `shippingLabel-${documentData.customerInfo.orderNumber}.pdf`;
          document.body.appendChild(link);
          link.click();

          // Clean up
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          // Set flag to prevent further downloads
          downloadInitiatedRef.current = false;
        }
        
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