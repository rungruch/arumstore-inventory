import React, { useState } from "react";
import { createContact } from "@/app/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { Contact } from "@/app/firebase/interfaces";

interface AddContactPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddContactPopup({ isOpen, onClose }: AddContactPopupProps) {
  const [contactData, setContactData] = useState({
    name: "",
    client_id: "",
    tax_reference: {
      tax_id: "",
      branch_name: "",
      branch_number: ""
    },
    contact_info: {
      name: "",
      email: "",
      phone: "",
      home_phone: "",
      fax: ""
    },
    social_media: {
      facebook: "",
      line: "",
      instagram: ""
    },
    address: "",
    group: "",
    notes: ""
  });
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      if (parent === "tax_reference" || parent === "contact_info" || parent === "social_media") {
        setContactData(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        }));
      }
    } else {
      setContactData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setValidationError("");
  };

  const validateForm = () => {
    if (!contactData.name.trim()) {
      setValidationError("กรุณากรอกชื่อผู้ติดต่อ");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setValidationError("");

      const contact = {
        ...contactData,
        created_date: Timestamp.now(),
        updated_date: Timestamp.now()
      };

      await createContact(contact);
      
      setContactData({
        name: "",
        client_id: "",
        tax_reference: {
          tax_id: "",
          branch_name: "",
          branch_number: ""
        },
        contact_info: {
          name: "",
          email: "",
          phone: "",
          home_phone: "",
          fax: ""
        },
        social_media: {
          facebook: "",
          line: "",
          instagram: ""
        },
        address: "",
        group: "",
        notes: ""
      });
      window.location.reload();
    } catch (error) {
      setValidationError("เกิดข้อผิดพลาด: " + String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  const handleClose = () => {
    setValidationError("");
    setContactData({
      name: "",
      client_id: "",
      tax_reference: {
        tax_id: "",
        branch_name: "",
        branch_number: ""
      },
      contact_info: {
        name: "",
        email: "",
        phone: "",
        home_phone: "",
        fax: ""
      },
      social_media: {
        facebook: "",
        line: "",
        instagram: ""
      },
      address: "",
      group: "",
      notes: ""
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="popup-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === "popup-overlay") handleClose();
      }}
      className="fixed inset-0 flex items-center justify-center z-50 bg-[#00000066] dark:bg-[#00000099]"
    >
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 sm:mx-6 sm:max-w-lg max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
        <h2 className="text-lg font-semibold mb-4 text-center">เพิ่มผู้ติดต่อ</h2>

        <form onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-1 gap-4">
            {/* Basic Information */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">ข้อมูลพื้นฐาน</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">ชื่อ *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="กรุณากรอกชื่อ"
                    className={`w-full border p-2 rounded-md ${
                      validationError && !contactData.name ? "border-red-500" : "border-gray-300"
                    }`}
                    value={contactData.name}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Tax Information */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">ข้อมูลภาษี</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">เลขประจำตัวผู้เสียภาษี</label>
                  <input
                    type="text"
                    name="tax_reference.tax_id"
                    className="w-full border border-gray-300 p-2 rounded-md"
                    value={contactData.tax_reference.tax_id}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">ชื่อสาขา</label>
                  <input
                    type="text"
                    name="tax_reference.branch_name"
                    className="w-full border border-gray-300 p-2 rounded-md"
                    value={contactData.tax_reference.branch_name}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">เลขที่สาขา</label>
                  <input
                    type="text"
                    name="tax_reference.branch_number"
                    className="w-full border border-gray-300 p-2 rounded-md"
                    value={contactData.tax_reference.branch_number}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">ข้อมูลการติดต่อ</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">ผู้ติดต่อ</label>
                  <input
                    type="text"
                    name="contact_info.name"
                    className="w-full border border-gray-300 p-2 rounded-md"
                    value={contactData.contact_info.name}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">เบอร์มือถือ</label>
                    <input
                      type="tel"
                      name="contact_info.phone"
                      className="w-full border border-gray-300 p-2 rounded-md"
                      value={contactData.contact_info.phone}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">เบอร์บ้าน</label>
                    <input
                      type="tel"
                      name="contact_info.home_phone"
                      className="w-full border border-gray-300 p-2 rounded-md"
                      value={contactData.contact_info.home_phone}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">อีเมล</label>
                    <input
                      type="email"
                      name="contact_info.email"
                      className="w-full border border-gray-300 p-2 rounded-md"
                      value={contactData.contact_info.email}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">แฟกซ์</label>
                    <input
                      type="tel"
                      name="contact_info.fax"
                      className="w-full border border-gray-300 p-2 rounded-md"
                      value={contactData.contact_info.fax}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">โซเชียลมีเดีย</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">Facebook</label>
                    <input
                      type="text"
                      name="social_media.facebook"
                      className="w-full border border-gray-300 p-2 rounded-md"
                      value={contactData.social_media.facebook}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">Line</label>
                    <input
                      type="text"
                      name="social_media.line"
                      className="w-full border border-gray-300 p-2 rounded-md"
                      value={contactData.social_media.line}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">Instagram</label>
                    <input
                      type="text"
                      name="social_media.instagram"
                      className="w-full border border-gray-300 p-2 rounded-md"
                      value={contactData.social_media.instagram}
                      onChange={handleChange}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">ข้อมูลเพิ่มเติม</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">ที่อยู่</label>
                  <textarea
                    name="address"
                    className="w-full border border-gray-300 p-2 rounded-md"
                    value={contactData.address}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">กลุ่ม</label>
                  <input
                    type="text"
                    name="group"
                    className="w-full border border-gray-300 p-2 rounded-md"
                    value={contactData.group}
                    onChange={handleChange}
                    disabled={isSubmitting}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200 ">หมายเหตุ</label>
                  <textarea
                    name="notes"
                    className="w-full border border-gray-300 p-2 rounded-md"
                    value={contactData.notes}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {validationError && (
            <p className="text-red-500 text-sm mb-4">{validationError}</p>
          )}

          <div className="flex justify-end space-x-2">
            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleClose}
              className="bg-gray-300 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-all"
            >
              ยกเลิก
            </button>

            {/* Save Button */}
            <button
              type="submit"
              className={`py-2 px-4 rounded-md text-white ${
                isSubmitting
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-black hover:bg-gray-800"
              } transition`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังโหลด..." : "ตกลง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}