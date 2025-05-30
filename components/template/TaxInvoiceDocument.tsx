import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { Bold } from 'lucide-react';

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
    padding: 30,
    fontFamily: 'Sarabun',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  pagetitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  storeInfo: {
    fontSize: 12,
    marginBottom: 1,
  },
  barcode: {
    marginBottom: 5,
    textAlign: 'center',
  },
  flexRow: {
    flexDirection: 'row',
  },
  customerInfoBox: {
    border: '1px solid #e0e0e0',
    padding: 10,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  infoLabel: {
    width: '5%',
    fontWeight: 'bold',
  },
  infoValue: {
    width: '45%',
  },
  infoColumn: {
    width: '50%',
  },
  table: {
    marginTop: 10,
    border: '1px solid #e0e0e0',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderBottom: '1px solid #e0e0e0',
    borderTop: '1px solid #e0e0e0',
    textAlign: 'center',
    fontWeight: 'bold',
    padding: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #e0e0e0',
    padding: 5,
  },
  tableCol1: { width: '5%', textAlign: 'center', borderRight: '1px solid #e0e0e0' },
  tableCol2: { width: '15%', borderRight: '1px solid #e0e0e0'},
  tableCol3: { width: '30%', borderRight: '1px solid #e0e0e0' },
  tableCol4: { width: '15%', textAlign: 'center',  borderRight: '1px solid #e0e0e0' },
  tableCol5: { width: '15%', textAlign: 'right', borderRight: '1px solid #e0e0e0' },
  tableCol6: { width: '20%', textAlign: 'right' },
  tableCol1_data: { width: '5%', textAlign: 'center', borderRight: '1px solid #e0e0e0' },
  tableCol2_data: { width: '15%', textAlign: 'center', borderRight: '1px solid #e0e0e0',},
  tableCol3_data: { width: '30%', borderRight: '1px solid #e0e0e0'},
  tableCol4_data: { width: '15%', textAlign: 'center',  borderRight: '1px solid #e0e0e0'},
  tableCol5_data: { width: '15%', textAlign: 'right', borderRight: '1px solid #e0e0e0'},
  tableCol6_data: { width: '20%', textAlign: 'right' },
  totalItemsRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '1px solid #e0e0e0',
  },
  totalsSection: {
    flexDirection: 'row',
  },
  emptySpace: {
    width: '65%',
  },
  totalsTable: {
    width: '38%',
  },
  totalsRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '1px solid #e0e0e0',
  },
  totalsLabel: {
    width: '50%',
    textAlign: 'right',
  },
  totalsValue: {
    width: '50%',
    textAlign: 'right',
  },
  grandTotalRow: {
    flexDirection: 'row',
    padding: 5,
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
  },
  paymentSection: {
    marginTop: 5,
  },
  paymentTitle: {
    borderBottom: '1px solid #000',
    paddingBottom: 2,
    marginBottom: 5,
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  paymentTotal: {
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    padding: 5,
  },
  signatureSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: '50px',
    marginTop: 45,
  },
  signature: {
    width: '22%',
    textAlign: 'center',
  },
  signatureLine: {
    borderTop: '1px solid #000',
    marginBottom: 5,
  }
});

// Create Document Component
const TaxInvoiceDocument = ({ data }: { data: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <Image 
        src="/local/logo.png"
        style={{ 
          width: 90,
          height: 90,
          objectFit: 'contain',
          marginRight: 10
        }} 
          />
          <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{data.storeInfo.name} {data.storeInfo.branch_name}</Text>
        <Text style={styles.storeInfo}>{data.storeInfo.address}</Text>
        <Text style={styles.storeInfo}>โทรศัพท์: {data.storeInfo.phone}  อีเมล: {data.storeInfo.email}</Text>
        <Text style={styles.storeInfo}>เลขประจำตัวผู้เสียภาษี: {data.storeInfo.tax_id}</Text>
          </View>
        </View>
        
        <View>
          <View  style={{ flex: 1, flexDirection: 'column', alignItems: 'center' }}>
          <Text style={styles.pagetitle}>{data.orderInfo.titleDocument}</Text>
          <Text style={{textAlign: 'center', fontWeight: 'bold'}}>{data.orderInfo.documentType}</Text>
          </View>
          <Text style={{ textAlign: 'right', marginTop: 2 }}>เลขที่เอกสาร : {data.orderInfo.orderNumber}</Text>
          <Text style={{ textAlign: 'right'}}>วันที่ : {data.orderInfo.date}</Text>
          {(data.orderInfo.showQuotationSection === true) && (
          <>
          <Text style={{ textAlign: 'right' }}>เครดิต : {data.orderInfo.quotationCredit} วัน</Text>
          <Text style={{ textAlign: 'right' }}>วันที่ครบกำหนด : {data.orderInfo.quotationExpiredate}</Text>
          </>
          )}
        </View>
      </View>

      {/* Customer Info Box */}
      <View style={styles.customerInfoBox}>

        <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { width: '6%' }]}>ชื่อผู้ซื้อ:</Text>
            <Text style={[styles.infoValue, { width: '35%' }]}>{data.customerInfo.name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { width: '4%' }]}>ที่อยู่:</Text>
          <Text style={[styles.infoValue, { width: '90%' }]}>{data.customerInfo.address}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <View style={styles.flexRow}>
              <Text style={[styles.infoLabel, { width: '14%' }]}>ชื่อสาขา:</Text>
              <Text style={styles.infoValue}>{data.customerInfo.branch_name}</Text>
            </View>
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.flexRow}>
              <Text style={[styles.infoLabel, { width: '14%' }]}>รหัสสาขา:</Text>
              <Text style={styles.infoValue}>{data.customerInfo.branch_id}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { width: '16%' }]}>เลขประจำตัวผู้เสียภาษี:</Text>
          <Text style={styles.infoValue}>{data.customerInfo.tax_id}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <View style={styles.flexRow}>
              <Text style={[styles.infoLabel, { width: '7%' }]}>โทร:</Text>
              <Text style={styles.infoValue}>{data.customerInfo.phone}</Text>
            </View>
          </View>
          <View style={styles.infoColumn}>
            <View style={styles.flexRow}>
              <Text style={[styles.infoLabel, { width: '9%' }]}>อีเมล:</Text>
              <Text style={styles.infoValue}>{data.customerInfo.email}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Items Table */}
      <View style={styles.table}>
        
        <View style={styles.tableHeader}>
          <Text style={styles.tableCol1}>ลำดับ</Text>
          <Text style={styles.tableCol2}>รหัสสินค้า</Text>
          <Text style={styles.tableCol3}>ชื่อสินค้า</Text>
          <Text style={styles.tableCol4}>จำนวน</Text>
          {(data.orderInfo.titleDocument !== 'ใบส่งสินค้า') && (
          <>
            <Text style={styles.tableCol5}>ราคา/หน่วย</Text>
            <Text style={styles.tableCol5}>ส่วนลด/หน่วย</Text>
            <Text style={styles.tableCol6}>จำนวนเงิน</Text>
          </>
          )}
          {(data.orderInfo.titleDocument === 'ใบส่งสินค้า') && (
          <>
            <Text style={styles.tableCol6}>จำนวนได้รับ</Text>
          </>
          )}
        </View>

        {data.items.map((item : any, index : any) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.tableCol1}>{index + 1}</Text>
            <Text style={styles.tableCol2_data}>{item.id}</Text>
            <Text style={styles.tableCol3_data}>  {item.name}</Text>
            <Text style={styles.tableCol4_data}>{item.quantity} {item.unitType}</Text>
            {(data.orderInfo.titleDocument !== 'ใบส่งสินค้า') && (
            <>
            <Text style={styles.tableCol5_data}>{item.unitPrice.toLocaleString()}  </Text>
            <Text style={styles.tableCol5_data}>{item.discount.toLocaleString()}  </Text>
            <Text style={styles.tableCol6_data}>{item.total.toLocaleString()}</Text>
            </>
            )}
            {(data.orderInfo.titleDocument === 'ใบส่งสินค้า') && (
            <>
            </>
            )}
          </View>
        ))}

{(data.orderInfo.showPriceSummary === true) && (
        <View style={styles.totalItemsRow}>
        {(data.paymentSummary.paymentSummaryEnabled === false) && (
          <Text style={{ width: '65%', textAlign: 'left', borderRight: '1px solid #e0e0e0'}}>  ชำระเงินด้วย {data.orderInfo.paymentMethod}</Text>
        )}
        {(data.paymentSummary.paymentSummaryEnabled === true) && (
          <Text style={{ width: '65%', textAlign: 'left', borderRight: '1px solid #e0e0e0'}}></Text>
        )}
          <Text style={{ width: '18%', textAlign: 'right'}}>รวม</Text>
          <Text style={{ width: '17%', textAlign: 'right'}}>{data.totals.rawTotal.toLocaleString()} บาท</Text>
        </View>
        )}
      </View>

      {/* Totals Section */}
      {(data.orderInfo.showPriceSummary === true) && (
      <View style={styles.totalsSection}>
        <View style={styles.emptySpace}>
        <Text style={{ fontStyle: 'italic', fontSize: 12, marginTop: 5 }}>
            จำนวนเงินรวมทั้งสิ้น
          </Text>
          <Text style={{ fontStyle: 'italic', fontSize: 12, marginTop: 5 }}>
            ({data.totals.thaiTotal_amount})
          </Text>
          <Text style={{ fontWeight: 'bold',fontSize: 12, marginTop: 5 }}>
            หมายเหตุ: {data.orderInfo.documentNote}
          </Text>
          {(data.orderInfo.showQuotationSection === true) && (
          <Text style={{ fontWeight: 'bold',fontSize: 12, marginTop: 5 }}>
            {`เงื่อนไข: ${data.orderInfo.quotationCondition}\nการจัดส่ง: ${data.orderInfo.quotationShippingCondition}`}
          </Text>
          )}
          {(data.orderInfo.showStoretransferPaymentInfo === true) && (
          <Text style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: 12, marginTop: 5 }}>
            สามารถชำระเงินได้ที่: {data.storeInfo.transferPaymentInfo}
          </Text>
          )}
      
        </View>

        <View style={styles.totalsTable}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>ส่วนลด</Text>
            <Text style={styles.totalsValue}>{data.totals.discount.toLocaleString()}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>ราคารวมทั้งสิ้น</Text>
            <Text style={styles.totalsValue}>{data.totals.total_amount_no_vat.toLocaleString()}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>จำนวนภาษีมูลค่าเพิ่ม 7%</Text>
            <Text style={styles.totalsValue}>{data.totals.total_vat.toLocaleString()}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>ค่าส่ง</Text>
            <Text style={styles.totalsValue}>{data.totals.shipping_cost.toLocaleString()}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.totalsLabel}>จำนวนเงินรวมทั้งสิ้น</Text>
            <Text style={styles.totalsValue}>{data.totals.total_amount.toLocaleString()}</Text>
          </View>
        </View>
      </View>
      )}

      {/* Payment Section */}
      {(data.paymentSummary.paymentSummaryEnabled === true) && (
              <View style={styles.paymentSection}>
              <Text style={styles.paymentTitle}>การชำระเงิน</Text>
              <View style={styles.paymentRow}>
                <Text>วันที่ชำระ : {data.paymentSummary.paymentDate}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text>1. {data.orderInfo.paymentMethod}</Text>
                <Text style={{ marginLeft: 'auto' }}>{data.paymentSummary.paymentReference}</Text>
              </View>
              <View style={styles.paymentTotal}>
                <Text style={{ width: '80%', textAlign: 'right' }}>ยอดชำระ :</Text>
                <Text style={{ width: '20%', textAlign: 'right' }}>{data.paymentSummary.paymentAmount} บาท</Text>
              </View>
            </View>
      )}

      {/* Signature Section */}
      <View style={[styles.signatureSection]}>
      {(data.orderInfo.buyerSignatureEnabled === true) && (
          <View style={styles.signature}>
            <Text style={styles.signatureLine}></Text>
            <Text>ผู้ซื้อ</Text>
            <Text style={{ marginTop: 0 }}>วันที่ ..............................................</Text>
          </View>
        )}
       {(data.orderInfo.sellerSignatureEnabled === true) && (
          <View style={styles.signature}>
            <Text style={styles.signatureLine}></Text>
            <Text>ผู้ขาย</Text>
            <Text style={{ marginTop: 0 }}>วันที่ ..............................................</Text>
          </View>
        )}
        {(data.orderInfo.receiverSignatureEnabled === true) && (
          <View style={styles.signature}>
            <Text style={styles.signatureLine}></Text>
            <Text>ผู้รับสินค้า</Text>
            <Text style={{ marginTop: 0 }}>วันที่ ..............................................</Text>
          </View>
        )}
        {(data.orderInfo.senderSignatureEnabled === true) && (
          <View style={styles.signature}>
            <Text style={styles.signatureLine}></Text>
            <Text>ผู้ส่งสินค้า</Text>
            <Text style={{ marginTop: 0 }}>วันที่ ..............................................</Text>
          </View>
        )}
        {(data.orderInfo.receiverMoneySignatureEnabled === true) && (
          <View style={styles.signature}>
            <Text style={styles.signatureLine}></Text>
            <Text>ผู้รับเงิน</Text>
            <Text style={{ marginTop: 0 }}>วันที่ ..............................................</Text>
          </View>
        )}
        {(data.orderInfo.approverSignatureEnabled === true) && (
          <View style={styles.signature}>
            <Text style={styles.signatureLine}></Text>
            <Text>ผู้อนุมัติ</Text>
            <Text style={{ marginTop: 0 }}>วันที่ ..............................................</Text>
          </View>
        )}
      </View>
    </Page>
  </Document>
);

export default TaxInvoiceDocument;