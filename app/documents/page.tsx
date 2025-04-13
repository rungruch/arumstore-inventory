"use client";
// app/documents/page.tsx (for App Router)
// OR
// pages/documents.tsx (for Pages Router)

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('error');
  const transactionId = searchParams.get('transaction_id');
  
  const [showErrorBanner, setShowErrorBanner] = useState<boolean>(!!errorMessage);

  // Close error banner
  const handleCloseError = () => {
    setShowErrorBanner(false);
  };

  // Retry download for a specific transaction
  const handleRetryDownload = () => {
    if (transactionId) {
      window.location.href = `/document/download?transaction_id=${transactionId}&redirect=/documents`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div className="flex-1 min-w-0">
          </div>
        </div>
        
        {/* Error banner */}
        {showErrorBanner && errorMessage && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className="text-sm text-red-700">
                  {errorMessage}
                </p>
                <div className="mt-3 flex items-center md:mt-0 md:ml-6">
                  {transactionId && (
                    <button
                      onClick={handleRetryDownload}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mr-2"
                    >
                      ลองใหม่
                    </button>
                  )}
                  <button
                    onClick={handleCloseError}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder content - Replace with your actual document listing UI */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-6">
          {!errorMessage ? (
            <p className="text-gray-500">รายการเอกสารจะแสดงที่นี่</p>
          ) : (
            <div className="text-center py-8">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">เกิดข้อผิดพลาดในการดาวน์โหลดเอกสาร</h3>
              <p className="mt-1 text-sm text-gray-500">โปรดตรวจสอบข้อมูลและลองใหม่อีกครั้ง</p>
              
              {transactionId && (
                <div className="mt-6">
                  <button
                    onClick={handleRetryDownload}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                    </svg>
                    ลองดาวน์โหลดอีกครั้ง
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}