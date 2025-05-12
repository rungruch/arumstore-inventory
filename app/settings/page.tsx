"use client"
import React, { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AddContactGroup from "@/components/AddContactGroup";
import AddShippingMethod from "@/components/AddShippingMethod";
import AddSalesMethod from "@/components/AddSalesMethod";

const menu = [
  { key: "company", label: "บริษัท / ร้านค้า" },
  { key: "shipping", label: "ตั้งค่าช่องทางจัดส่ง" },
  { key: "sales", label: "ตั้งค่าช่องทางการขาย" },
  { key: "contact-group", label: "ตั้งค่ากลุ่มผู้ติดต่อ" },
];

export default function SettingsPage() {
  const [selected, setSelected] = useState("company");

  return (
    <ProtectedRoute>
      <div className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">ตั้งค่า</h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-white dark:bg-zinc-800 rounded-lg shadow p-4 flex-shrink-0 h-fit">
            <nav>
              <ul className="space-y-1">
                {menu.map((item) => (
                  <li key={item.key}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded font-medium transition-colors ${
                        selected === item.key
                          ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-800 hover:text-white"
                      }`}
                      onClick={() => setSelected(item.key)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          
          {/* Main Content */}
          <main className="flex-1 bg-white dark:bg-zinc-800 rounded-lg shadow p-6">
            {selected === "company" && (
              <div>
                <h2 className="text-xl font-semibold mb-6">ข้อมูลบริษัท/ร้านค้า</h2>
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left: Form */}
                  <form className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="col-span-2 text-lg font-semibold mb-2">ข้อมูลบริษัท/ร้านค้า</div>
                    <div>
                      <label className="block text-sm font-medium mb-1">บริษัท/ร้านค้า</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="text" placeholder="Chan Shop" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">เลขผู้เสียภาษี</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="text" placeholder="1103049044488" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ชื่อสาขา/รหัส</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="text" placeholder="BR001" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ที่อยู่</label>
                      <textarea className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" rows={2} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ที่อยู่สำหรับใบเสร็จ</label>
                      <textarea className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" rows={2} />
                    </div>
                    <div className="col-span-2 text-base font-semibold mt-4 mb-2">(English)</div>
                    <div>
                      <label className="block text-sm font-medium mb-1">บริษัท/ร้านค้า (English)</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="text" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ชื่อสาขา/รหัส (English)</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="text" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ที่อยู่ (English)</label>
                      <textarea className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" rows={2} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">ที่อยู่สำหรับใบเสร็จ (English)</label>
                      <textarea className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" rows={2} />
                    </div>
                    <div className="col-span-2 text-lg font-semibold mt-6 mb-2">ข้อมูลติดต่อ</div>
                    <div>
                      <label className="block text-sm font-medium mb-1">เบอร์โทรศัพท์</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="text" placeholder="0810513095" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">อีเมล</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="email" placeholder="toucans.advents.4d@icloud.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">โทรสาร (Fax)</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="text" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Website</label>
                      <input className="w-full border rounded px-3 py-2 dark:bg-zinc-700 dark:border-zinc-600" type="text" />
                    </div>
                    <div className="col-span-2 mt-6">
                      <button type="submit" className="w-fit h-fit p-2 px-4 text-sm rounded-md text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded text-sm transition-colors">บันทึก</button>
                    </div>
                  </form>
                  {/* Right: Logo Upload */}
                  <div className="flex flex-col items-center justify-start min-w-[180px]">
                    <div className="mb-2 text-sm font-medium">รูปโลโก้บริษัท/ร้านค้า</div>
                    <div className="w-36 h-36 bg-gray-100 dark:bg-zinc-700 border border-dashed border-gray-300 dark:border-zinc-600 rounded flex items-center justify-center">
                      <span className="text-gray-400 text-5xl">
                        <svg width="64" height="64" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e5e7eb" className="dark:fill-zinc-600"/><path d="M8 16v-5a4 4 0 118 0v5" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><rect x="9" y="16" width="6" height="2" rx="1" fill="#9ca3af"/></svg>
                      </span>
                    </div>
                    <button className="mt-3 px-4 py-1.5 bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-200 rounded text-sm font-medium transition-colors">อัปโหลดโลโก้</button>
                  </div>
                </div>
              </div>
            )}
            
            {selected === "shipping" && (
              <div>
                <h2 className="text-xl font-semibold mb-1">ช่องทางการจัดส่ง</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">จัดการช่องทางการจัดส่ง</p>
                <AddShippingMethod />
              </div>
            )}
            
            {selected === "sales" && (
              <div>
                <h2 className="text-xl font-semibold mb-1">ช่องทางการขาย</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">จัดการช่องทางการขาย</p>
                <AddSalesMethod />
              </div>
            )}
            
            {selected === "contact-group" && (
                <div>
                  <h2 className="text-xl font-semibold mb-1">กลุ่มผู้ติดต่อ</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">จัดการกลุ่มผู้ติดต่อ</p>
                  <AddContactGroup />
                </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
