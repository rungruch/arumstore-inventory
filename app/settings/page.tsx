"use client"
import React, { useState, useEffect } from "react";
import Image from "next/image";
import ProtectedRoute from "@/components/ProtectedRoute";
import AddContactGroup from "@/components/AddContactGroup";
import AddShippingMethod from "@/components/AddShippingMethod";
import AddSalesMethod from "@/components/AddSalesMethod";
import { getCompanyDetails, updateCompanyDetails } from "@/app/firebase/firestore";
import { storage } from "@/app/firebase/clientApp";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Timestamp } from "firebase/firestore";
import { StoreInfoFirestore } from "@/app/firebase/interfaces";
import Modal from "@/components/modal";
import { ModalTitle } from "@/components/enum";
import { useAuth } from '@/app/contexts/AuthContext';

const menu = [
  { key: "company", label: "บริษัท / ร้านค้า" },
  { key: "shipping", label: "ตั้งค่าช่องทางจัดส่ง" },
  { key: "sales", label: "ตั้งค่าช่องทางการขาย" },
  { key: "contact-group", label: "ตั้งค่ากลุ่มผู้ติดต่อ" },
];

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const [selected, setSelected] = useState("company");
  const [companyDetails, setCompanyDetails] = useState<StoreInfoFirestore>({
    name: "",
    branch_name: "",
    tax_id: "",
    address: "",
    current_address: "",
    eng_name: "",
    eng_branch_name: "",
    eng_address: "",
    eng_current_address: "",
    phone: "",
    email: "",
    fax: "",
    website: "",
    payment_details: "",
    logo_url: "",
    logo_document_url: "",
    quotation_condition: "",
    quotation_shipping_condition: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [docLogoFile, setDocLogoFile] = useState<File | null>(null);
  const [docLogoPreview, setDocLogoPreview] = useState<string>("");
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: "",
    message: ""
  });
  
  // Fetch company details when component mounts
  useEffect(() => {
    async function fetchCompanyDetails() {
      try {
        setIsLoading(true);
        const data = await getCompanyDetails();
        if (data) {
          setCompanyDetails(data);
          if (data.logo_url) {
            setLogoPreview(data.logo_url);
          }
          if (data.logo_document_url) {
            setDocLogoPreview(data.logo_document_url);
          }
        }
      } catch (error) {
        console.error("Error fetching company details:", error);
        setModalState({
          isOpen: true,
          title: ModalTitle.ERROR,
          message: `เกิดข้อผิดพลาดในการโหลดข้อมูล: ${error instanceof Error ? error.message : String(error)}`
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCompanyDetails();
  }, []);

  return (
    <ProtectedRoute module='settings' actions={["view", "edit", "delete", "create"]} requireAll={true}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">ตั้งค่าระบบ</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">จัดการข้อมูลบริษัท ช่องทางการขาย และการตั้งค่าต่างๆ</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-gray-700 to-gray-800 rounded-xl shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 p-4 flex-shrink-0 h-fit">
            <nav>
              <ul className="space-y-1">
                {menu.map((item) => (
                  <li key={item.key}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                        selected === item.key
                          ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-md"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-700 hover:to-gray-800 hover:text-white hover:shadow-sm"
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
          <main className="flex-1 bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-700 p-6">
            {selected === "company" && (
              <div>
                <Modal 
                  isOpen={modalState.isOpen} 
                  onClose={() => setModalState({...modalState, isOpen: false})} 
                  title={modalState.title} 
                  message={modalState.message}
                />
                <h2 className="text-xl font-semibold mb-6">ข้อมูลบริษัท/ร้านค้า</h2>
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
                  </div>
                ) : (
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left: Form */}
                  <form className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6" onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setIsSaving(true);
                      
                      // Create a sanitized copy of the details with no undefined values
                      const sanitizedDetails: StoreInfoFirestore = {
                        name: companyDetails.name || "",
                        branch_name: companyDetails.branch_name || "",
                        tax_id: companyDetails.tax_id || "",
                        address: companyDetails.address || "",
                        current_address: companyDetails.current_address || "",
                        eng_name: companyDetails.eng_name || "",
                        eng_branch_name: companyDetails.eng_branch_name || "",
                        eng_address: companyDetails.eng_address || "",
                        eng_current_address: companyDetails.eng_current_address || "",
                        phone: companyDetails.phone || "",
                        email: companyDetails.email || "",
                        fax: companyDetails.fax || "",
                        website: companyDetails.website || "",
                        payment_details: companyDetails.payment_details || "",
                        logo_url: companyDetails.logo_url || "",
                        logo_document_url: companyDetails.logo_document_url || "",
                        quotation_condition: companyDetails.quotation_condition || "",
                        quotation_shipping_condition: companyDetails.quotation_shipping_condition || ""
                      };
                      
                      // Handle main logo upload if there's a new file
                      if (logoFile) {
                        try {
                          const fileName = `company_logo_${Date.now()}_${logoFile.name.replace(/\s+/g, '_')}`;
                          const storageRef = ref(storage, `company_logos/${fileName}`);
                          await uploadBytes(storageRef, logoFile);
                          const downloadURL = await getDownloadURL(storageRef);
                          
                          // Update the sanitized details with the new logo URL
                          sanitizedDetails.logo_url = downloadURL;
                          
                          // Also update preview for the UI
                          setLogoPreview(downloadURL);
                        } catch (uploadError) {
                          console.error("Error uploading logo:", uploadError);
                          // Continue with saving other details even if logo upload fails
                        }
                      }
                      
                      // Handle document logo upload if there's a new file
                      if (docLogoFile) {
                        try {
                          const fileName = `document_logo_${Date.now()}_${docLogoFile.name.replace(/\s+/g, '_')}`;
                          const storageRef = ref(storage, `company_logos/${fileName}`);
                          await uploadBytes(storageRef, docLogoFile);
                          const downloadURL = await getDownloadURL(storageRef);
                          
                          // Update the sanitized details with the new document logo URL
                          sanitizedDetails.logo_document_url = downloadURL;
                        } catch (uploadError) {
                          console.error("Error uploading document logo:", uploadError);
                          // Continue with saving other details even if logo upload fails
                        }
                      }
                      
                      // Now save the sanitized company details
                      await updateCompanyDetails(sanitizedDetails);
                      
                      setModalState({
                        isOpen: true,
                        title: ModalTitle.SUCCESS,
                        message: "บันทึกข้อมูลสำเร็จ",
                      });
                      
                    } catch (error) {
                      console.error("Error saving company details:", error);
                      setModalState({
                        isOpen: true,
                        title: ModalTitle.ERROR,
                        message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}`,
                      });
                    } finally {
                      setIsSaving(false);
                    }
                  }}>
                    <div className="col-span-2 text-lg font-semibold mb-4 pb-2 border-b border-gray-200 dark:border-zinc-600 text-gray-800 dark:text-gray-200">ข้อมูลบริษัท/ร้านค้า</div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">บริษัท/ร้านค้า</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="text" 
                        value={companyDetails.name || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">เลขผู้เสียภาษี</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="text" 
                        value={companyDetails.tax_id || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, tax_id: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">ชื่อสาขา/รหัส</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="text" 
                        value={companyDetails.branch_name || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, branch_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">ที่อยู่สำหรับใบเสร็จ</label>
                      <textarea 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none" 
                        rows={3} 
                        value={companyDetails.address || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, address: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">ที่อยู่</label>
                      <textarea 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none" 
                        rows={3} 
                        value={companyDetails.current_address || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, current_address: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 text-base font-semibold mt-6 mb-4 pb-2 border-b border-gray-200 dark:border-zinc-600 text-gray-800 dark:text-gray-200">(English)</div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">บริษัท/ร้านค้า (English)</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="text" 
                        value={companyDetails.eng_name || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, eng_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">ชื่อสาขา/รหัส (English)</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="text" 
                        value={companyDetails.eng_branch_name || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, eng_branch_name: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">ที่อยู่ (English)</label>
                      <textarea 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none" 
                        rows={3} 
                        value={companyDetails.eng_address || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, eng_address: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">ที่อยู่สำหรับใบเสร็จ (English)</label>
                      <textarea 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none" 
                        rows={3} 
                        value={companyDetails.eng_current_address || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, eng_current_address: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 text-lg font-semibold mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-zinc-600 text-gray-800 dark:text-gray-200">ข้อมูลติดต่อ</div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">เบอร์โทรศัพท์</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="text" 
                        value={companyDetails.phone || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, phone: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">อีเมล</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="email" 
                        placeholder="email@example.com" 
                        value={companyDetails.email || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, email: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">โทรสาร (Fax)</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="text" 
                        value={companyDetails.fax || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, fax: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Website</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" 
                        type="text" 
                        value={companyDetails.website || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, website: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">รายละเอียดการชำระเงิน</label>
                      <textarea 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none" 
                        rows={4} 
                        placeholder="ข้อมูลบัญชีธนาคารหรือช่องทางการชำระเงิน" 
                        value={companyDetails.payment_details || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, payment_details: e.target.value})}
                      />
                    </div>
                    
                    <div className="col-span-2 text-lg font-semibold mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-zinc-600 text-gray-800 dark:text-gray-200">ข้อมูลใบเสนอราคา</div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">เงื่อนไขการชำระเงิน</label>
                      <input 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        type="text"
                        value={companyDetails.quotation_condition || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, quotation_condition: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">เงื่อนไขการจัดส่ง</label>
                      <textarea 
                        className="w-full border border-gray-300 dark:border-zinc-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-zinc-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none" 
                        rows={3}
                        value={companyDetails.quotation_shipping_condition || ""}
                        onChange={(e) => setCompanyDetails({...companyDetails, quotation_shipping_condition: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 mt-8 pt-6 border-t border-gray-200 dark:border-zinc-600">
                      <button 
                        type="submit" 
                        className={`px-6 py-3 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${isSaving ? "opacity-50 cursor-not-allowed" : ""}`}
                        disabled={isSaving}
                      >
                        {isSaving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                      </button>
                    </div>
                  </form>
                  
                  {/* Right: Logo Uploads */}
                  <div className="flex flex-col items-center justify-start min-w-[200px] space-y-8">
                    {/* Main Logo */}
                    <div className="w-full flex flex-col items-center bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-600">
                      <div className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">รูปโลโก้บริษัท/ร้านค้า</div>
                      <div className="w-40 h-40 bg-white dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl flex items-center justify-center overflow-hidden relative hover:border-gray-400 dark:hover:border-zinc-500 transition-colors duration-200">
                        {logoPreview ? (
                          <Image 
                            src={logoPreview} 
                            alt="Company Logo" 
                            width={160} 
                            height={160} 
                            className="object-contain rounded-lg"
                          />
                        ) : (
                          <div className="text-center">
                            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" className="mx-auto mb-2 text-gray-400 dark:text-zinc-500">
                              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                              <path d="M8 16v-5a4 4 0 118 0v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <rect x="9" y="16" width="6" height="2" rx="1" fill="currentColor" opacity="0.6"/>
                            </svg>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">ไม่มีโลโก้</p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        id="logo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              if (e.target?.result) {
                                setLogoPreview(e.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="logo-upload"
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        อัปโหลดโลโก้
                      </label>
                    </div>
                    
                    {/* Document Logo */}
                    <div className="w-full flex flex-col items-center bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-600">
                      <div className="mb-4 text-sm font-semibold text-gray-800 dark:text-gray-200">โลโก้สำหรับเอกสาร</div>
                      <div className="w-40 h-40 bg-white dark:bg-zinc-800 border-2 border-dashed border-gray-300 dark:border-zinc-600 rounded-xl flex items-center justify-center overflow-hidden relative hover:border-gray-400 dark:hover:border-zinc-500 transition-colors duration-200">
                        {docLogoPreview ? (
                          <Image 
                            src={docLogoPreview} 
                            alt="Document Logo" 
                            width={160} 
                            height={160} 
                            className="object-contain rounded-lg"
                          />
                        ) : companyDetails.logo_document_url ? (
                          <Image 
                            src={companyDetails.logo_document_url} 
                            alt="Document Logo" 
                            width={160} 
                            height={160} 
                            className="object-contain rounded-lg"
                          />
                        ) : (
                          <div className="text-center">
                            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" className="mx-auto mb-2 text-gray-400 dark:text-zinc-500">
                              <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.1"/>
                              <path d="M10 8h4v8h-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M7 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <p className="text-xs text-gray-500 dark:text-zinc-400">ไม่มีโลโก้เอกสาร</p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        id="doc-logo-upload"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDocLogoFile(file);
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              if (e.target?.result) {
                                const result = e.target.result as string;
                                setDocLogoPreview(result);
                                // This will be uploaded when the form is submitted
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <label
                        htmlFor="doc-logo-upload"
                        className="mt-4 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        อัปโหลดโลโก้เอกสาร
                      </label>
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}
            
            {selected === "shipping" && (
              <div className="space-y-6">
                <div className="border-b border-gray-200 dark:border-zinc-600 pb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">ช่องทางการจัดส่ง</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">จัดการช่องทางการจัดส่งสำหรับการขายสินค้า</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-600">
                  <AddShippingMethod />
                </div>
              </div>
            )}
            
            {selected === "sales" && (
              <div className="space-y-6">
                <div className="border-b border-gray-200 dark:border-zinc-600 pb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">ช่องทางการขาย</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">จัดการช่องทางการขายและแพลตฟอร์มต่างๆ</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-600">
                  <AddSalesMethod />
                </div>
              </div>
            )}
            
            {selected === "contact-group" && (
              <div className="space-y-6">
                <div className="border-b border-gray-200 dark:border-zinc-600 pb-4">
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">กลุ่มผู้ติดต่อ</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">จัดการกลุ่มผู้ติดต่อสำหรับการจัดหมวดหมู่ลูกค้าและซัพพลายเออร์</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-600">
                  <AddContactGroup />
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
