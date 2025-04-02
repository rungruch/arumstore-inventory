// components/ReceiptDocument.js
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Create styles

Font.register({
    family: 'Sarabun',
    fonts: [
      { src: '/fonts/THSarabunNew.ttf' }, // Regular font
      { src: '/fonts/THSarabunNew-Bold.ttf', fontWeight: 'bold' },
      { src: '/fonts/THSarabunNew-Italic.ttf', fontStyle: 'italic' },
      { src: '/fonts/THSarabunNew-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' }
    ]
  });


const styles = StyleSheet.create({
  page: { 
    padding: 30,
    fontFamily: 'Sarabun',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    textAlign: 'right',
  },
  storeInfo: {
    fontSize: 10,
    marginBottom: 20,
  },
  section: {
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    borderBottomStyle: 'solid',
    paddingBottom: 5,
    paddingTop: 5,
  },
  column: {
    fontSize: 10,
  },
  tableHeader: {
    backgroundColor: '#f1f1f1',
    fontWeight: 'bold',
  },
  w10: { width: '10%' },
  w15: { width: '15%' },
  w20: { width: '20%' },
  w40: { width: '40%' },
  right: { textAlign: 'right' },
  barcode: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  totals: {
    fontSize: 10,
    marginTop: 20,
    textAlign: 'right',
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 80,
  },
  signature: {
    width: '22%',
    borderTopWidth: 1,
    borderTopColor: '#000000',
    paddingTop: 5,
    fontSize: 10,
    textAlign: 'center',
  },
});

// Define the data structure
interface ReceiptData {
  storeInfo: {
    name: string;
    phone: string;
    email: string;
  };
  orderInfo: {
    orderNumber: string;
    date: string;
  };
  customerInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totals: {
    subtotal: number;
    discount: number;
    shipping: number;
    grandTotal: number;
  };
}

// Create Document Component
const ReceiptDocument = ({ data }: { data: ReceiptData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text>{data.storeInfo.name}</Text>
          <Text style={styles.storeInfo}>โทรศัพท์: {data.storeInfo.phone}, อีเมล: {data.storeInfo.email}</Text>
        </View>
        <View>
          <Text style={styles.title}>ใบเสร็จรับเงิน</Text>
          {/* Placeholder for barcode */}
          <Text style={styles.barcode}>| | | | | | | | | | | | | | |</Text>
          <Text style={{ fontSize: 10, textAlign: 'center' }}>{data.orderInfo.orderNumber}</Text>
        </View>
      </View>

      {/* Customer & Order Info */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <View style={{ width: '50%' }}>
          <Text style={{ fontSize: 10 }}>ลูกค้า:</Text>
          <Text style={{ fontSize: 10 }}>{data.customerInfo.name}</Text>
          <Text style={{ fontSize: 10 }}>{data.customerInfo.address}</Text>
          <Text style={{ fontSize: 10 }}>โทรศัพท์: {data.customerInfo.phone}</Text>
          <Text style={{ fontSize: 10 }}>อีเมล: {data.customerInfo.email}</Text>
        </View>
        <View style={{ width: '50%' }}>
          <Text style={{ fontSize: 10 }}>วันที่: {data.orderInfo.date}</Text>
          <Text style={{ fontSize: 10 }}>เลขที่: {data.orderInfo.orderNumber}</Text>
        </View>
      </View>

      {/* Items Table */}
      <View>
        {/* Table Header */}
        <View style={[styles.row, styles.tableHeader]}>
          <Text style={[styles.column, styles.w10]}>#</Text>
          <Text style={[styles.column, styles.w15]}>รหัสสินค้า</Text>
          <Text style={[styles.column, styles.w40]}>ชื่อสินค้า</Text>
          <Text style={[styles.column, styles.w10, styles.right]}>จำนวน</Text>
          <Text style={[styles.column, styles.w15, styles.right]}>มูลค่าต่อหน่วย</Text>
          <Text style={[styles.column, styles.w10, styles.right]}>รวม</Text>
        </View>

        {/* Table Rows */}
        {data.items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={[styles.column, styles.w10]}>{index + 1}</Text>
            <Text style={[styles.column, styles.w15]}>{item.id}</Text>
            <Text style={[styles.column, styles.w40]}>{item.name}</Text>
            <Text style={[styles.column, styles.w10, styles.right]}>{item.quantity}</Text>
            <Text style={[styles.column, styles.w15, styles.right]}>{item.unitPrice.toLocaleString()}</Text>
            <Text style={[styles.column, styles.w10, styles.right]}>{item.total.toLocaleString()}</Text>
          </View>
        ))}

        {/* Total Row */}
        <View style={styles.row}>
          <Text style={[styles.column, styles.w10]}></Text>
          <Text style={[styles.column, styles.w15]}></Text>
          <Text style={[styles.column, styles.w40]}>รวมทั้งหมด</Text>
          <Text style={[styles.column, styles.w10, styles.right]}>{data.items.reduce((sum, item) => sum + item.quantity, 0)}</Text>
          <Text style={[styles.column, styles.w15, styles.right]}></Text>
          <Text style={[styles.column, styles.w10, styles.right]}>{data.totals.subtotal.toLocaleString()}</Text>
        </View>
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        <Text>ส่วนลด ({data.totals.discount}%): {data.totals.discount.toLocaleString()} บาท</Text>
        <Text>ค่าส่ง (ไปรษณีย์ไทย): {data.totals.shipping.toLocaleString()} บาท</Text>
        <Text style={styles.grandTotal}>มูลค่ารวมสุทธิ: {data.totals.grandTotal.toLocaleString()} บาท</Text>
        <Text style={{ fontSize: 8 }}>(แปดหมื่นสี่พันหกร้อยบาทถ้วน)</Text>
      </View>

      {/* Payment Section */}
      <View style={{ marginTop: 40, fontSize: 10 }}>
        <Text>การชำระเงิน/Payment</Text>
        <Text>วันที่ชำระ: 22/12/2567</Text>
        <Text>1. บัตรเครดิต: {data.totals.grandTotal.toLocaleString()} บาท</Text>
        <Text>ยอดชำระ: {data.totals.grandTotal.toLocaleString()} บาท</Text>
      </View>

      {/* Signature Section */}
      <View style={styles.signatureSection}>
        <View style={styles.signature}>
          <Text>ผู้รับสินค้า</Text>
          <Text style={{ marginTop: 30 }}>วันที่</Text>
        </View>
        <View style={styles.signature}>
          <Text>ผู้ส่งสินค้า</Text>
          <Text style={{ marginTop: 30 }}>วันที่</Text>
        </View>
        <View style={styles.signature}>
          <Text>ผู้รับเงิน</Text>
          <Text style={{ marginTop: 30 }}>วันที่</Text>
        </View>
        <View style={styles.signature}>
          <Text>ผู้อนุมัติ</Text>
          <Text style={{ marginTop: 30 }}>วันที่</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export default ReceiptDocument;