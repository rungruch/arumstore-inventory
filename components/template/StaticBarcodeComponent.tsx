import React from 'react';
import { Image, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  barcodeValue: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
});

interface BarcodeProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  style?: any;
  textStyle?: any;
}

/**
 * A barcode component for PDF that uses a barcode generator service instead of client-side JS.
 * This ensures the barcode will always be visible in the PDF, regardless of SSR or CSR rendering.
 */
const BarcodeComponent: React.FC<BarcodeProps> = ({ 
  value, 
  width = 100, 
  height = 30, 
  displayValue = true,
  style = {},
  textStyle = {}
}) => {
  if (!value) {
    return null;
  }
  
  // Use a barcode generation service that returns an image
  // barcodeservice.org is just an example - replace with a real service if needed
  const barcodeUrl = `https://barcodeapi.org/api/code128/${encodeURIComponent(value)}`;
  
  return (
    <View style={[styles.container, style]}>
      <Image src={barcodeUrl} style={{ width, height }} />
    </View>
  );
};

export default BarcodeComponent;
