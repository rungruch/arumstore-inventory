import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
// You can use either BarcodeComponent (client-side) or StaticBarcodeComponent (works everywhere)
import BarcodeComponent from './StaticBarcodeComponent';
// import BarcodeComponent from './BarcodeComponent'; // Alternative that uses jsbarcode (client-side only)

// Register Thai font (you'll need to add these font files to your project)
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: '/fonts/THSarabunNew.ttf' }, // Regular font
    { src: '/fonts/THSarabunNew-Bold.ttf', fontWeight: 'bold' },
    { src: '/fonts/THSarabunNew-Italic.ttf', fontStyle: 'italic' },
    { src: '/fonts/THSarabunNew-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontFamily: 'Sarabun',
    fontSize: 12,
  },
  container: {
    border: '1px dashed #999',
    boxSizing: 'border-box',
    padding: 15,
    height: '100%',
    position: 'relative',
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  senderInfo: {
    marginBottom: 5,
  },
  receiverInfo: {
    position: 'absolute',
    right: 15,
    top: '45%',
    textAlign: 'right',
  },
  receiverTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'right',
  },
  addressLine: {
    marginBottom: 2,
  },
  contactInfo: {
    marginBottom: 2,
  },
  barcode: {
    position: 'absolute',
    bottom: 15,
    left: 15,
  },
  barcodeImage: {
    width: 200,
    height: 50,
  },
  barcodeText: {
    fontSize: 10,
    marginTop: 2,
  }
});

// Create Document Component
const ShippingLabelDocument = ({ data }: { data: any }) => (
  <Document>
    <Page size={[420, 295]} style={styles.page}>
      <View style={styles.container}>
        {/* Sender Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ชื่อและที่อยู่ผู้ส่ง</Text>
          <View style={styles.senderInfo}>
            <Text style={styles.addressLine}>{data.storeInfo.name || ''}</Text>
            <Text style={styles.addressLine}>{data.storeInfo.address || ''}</Text>
            <Text style={styles.contactInfo}>
              โทรศัพท์: {data.storeInfo.phone || ''} 
              {data.storeInfo.email && ` อีเมล: ${data.storeInfo.email}`}
              {!data.storeInfo.email && ''}
            </Text>
          </View>
        </View>
        
        {/* Receiver Section */}
        <View style={styles.receiverInfo}>
          <Text style={styles.receiverTitle}>ชื่อและที่อยู่ผู้รับ</Text>
          <Text style={styles.addressLine}>{data.customerInfo.name || ''}</Text>
          <Text style={styles.addressLine}>{data.customerInfo.address || ''}</Text>
          <Text style={styles.contactInfo}>
          {data.customerInfo.phone && ` โทรศัพท์:${data.customerInfo.phone || ''}`}
          </Text>
        </View>
        
{/* Barcode Section */}
<View style={styles.barcode}>
  <BarcodeComponent value={data.customerInfo.orderNumber || ''} />
</View>
      </View>
    </Page>
  </Document>
);

export default ShippingLabelDocument;