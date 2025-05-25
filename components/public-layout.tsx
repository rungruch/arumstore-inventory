"use client";

import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function PublicLayout({ 
  children, 
  title = "Arum Store", 
  description = "ระบบจัดการคลังสินค้า" 
}: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Optional Header for Public Pages */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <div className="text-sm text-gray-600">
              {description}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Optional Footer for Public Pages */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            © 2024 Arum Store. สงวนลิขสิทธิ์.
          </div>
        </div>
      </footer>
    </div>
  );
}
