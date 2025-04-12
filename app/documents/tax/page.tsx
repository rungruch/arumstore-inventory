// app/document/page.js (for App Router)
// OR
// pages/document.js (for Pages Router)

import React from 'react';
import DocumentPreview from "@/components/DocumentPreview";

export default function DocumentPage() {
  return (
    <div className="container mx-auto p-5">
      <h1 className="text-2xl font-bold mb-4">พิมพ์เอกสาร</h1>
      <DocumentPreview />
    </div>
  );
}