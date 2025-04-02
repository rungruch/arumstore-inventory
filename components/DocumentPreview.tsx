"use client";
// components/DocumentPreview.js
import React, { use, useState } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import ReceiptDocument from '../components/template/TaxInvoiceDocument';

export default function DocumentPreview() {
  const [documentData, setDocumentData] = useState({
    storeInfo: {
      name: "บริษัท อินเตอร์เน็ต เมค มี ริช จำกัด",
      branch_name: "(สำนักงานใหญ่)",
      address: "299/128 ถนนวิภาวดีรังสิต แขวงตลาดบางเขน เขตหลักสี่ กรุงเทพมหานคร 10210",
      phone: "088-178-8669",
      email: "icesouthmanagers@gmail.com",
      tax_id: "0105566043410"
    },
    customerInfo: {
      name: "บริษัท X",
      address: "234 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10220",
      branch_name: "สาขาใหญ่",
      branch_id: "0779",
      tax_id: "0105566043410",
      phone: "025567890",
      email: "you@zortshop.com",
    },
    orderInfo: {
      date: "22 มีนาคม 2567",
      orderNumber: "SO-2024012003",
    },
    items: [
      { id: 'P0003', name: 'ช็อปสุวรรณภูมิ 2', quantity: 10, unitPrice: 10000, total: 100000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },
      { id: 'P0002', name: 'ช็อปสุวรรณภูมิ 1', quantity: 10, unitPrice: 500, total: 5000 },

    ],
    totals: {
        textTotal:"บาท",
        subtotal: 105000,
        discount: 20,
        shipping: 600,
        grandTotal: 84600,
    }
  });

  // Handle form changes to update document data
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, section: 'storeInfo' | 'customerInfo' | 'orderInfo' | 'totals', field: string) => {
    setDocumentData({
      ...documentData,
      [section]: {
        ...documentData[section],
        [field]: e.target.value
      }
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Configuration Panel */}
      <div className="w-full lg:w-1/3 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">แก้ไขข้อมูลเอกสาร</h2>

        
        {/* Store Info Form */}
        <div className="mb-4 hidden">
          <h3 className="font-medium mb-2">Store Information</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Store Name"
              value={documentData.storeInfo.name}
              onChange={(e) => handleChange(e, 'storeInfo', 'name')}
              className="w-full p-2 border rounded"
            />
            {/* Add more input fields for other store info */}
          </div>
        </div>
        <h3 className="font-medium mb-2">หัวเอกสาร/สำเนา-ต้นฉบับ/วันที่/หมวดผู้ซื้อ/หมายเหตุ/ตัวเลือกลายเซนต์</h3>
        <h3 className="font-medium mb-2"></h3>
        <h3 className="font-medium mb-2">รายการผู้ซื้อ</h3>

        {/* Customer Info Form */}
        <div className="mb-4" >
          <h3 className="font-medium mb-2">ชื่อผู้ซื้อ</h3>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Customer Name"
              value={documentData.customerInfo.name}
              onChange={(e) => handleChange(e, 'customerInfo', 'name')}
              className="w-full p-2 border rounded"
            />
            {/* Add more input fields for other customer info */}
          </div>
        </div>

        {/* Items Form (simplified) */}
        <div className="mb-4 hidden ">
          <h3 className="font-medium mb-2">Items</h3>
          {/* Add form to edit items */}
        </div>

        {/* Download Button */}
        <div className="mt-4">
          <PDFDownloadLink
            document={<ReceiptDocument data={documentData} />}
            fileName="receipt.pdf"
            className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF')}
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