import React, { useState, useEffect } from "react";
import { createProductWarehouse, updateProductWarehouse } from "@/app/firebase/firestore";
import { Timestamp } from "firebase/firestore";

interface AddWarehousePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddWarehousePopup({ isOpen, onClose }: AddWarehousePopupProps) {
  const [warehouseData, setWarehouseData] = useState({
    warehouse_name: "",
    details: "",
    type: "คลังมาตรฐาน" // Default value
  });
  const [validationError, setValidationError] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWarehouseData({
      ...warehouseData,
      [name]: value
    });
    setValidationError(""); // Reset validation error when user types
  };

  const validateForm = () => {
    if (!warehouseData.warehouse_name.trim()) {
      setValidationError("กรุณากรอกชื่อคลังสินค้า");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      setValidationError("");

      // Create a warehouse object with timestamps
      const warehouse = {
        ...warehouseData,
        created_date: Timestamp.now(),
        updated_date: Timestamp.now()
      };

      await createProductWarehouse(warehouse.warehouse_name, warehouse.type, warehouse.details);
      
      // Reset form and close
      setWarehouseData({
        warehouse_name: "",
        details: "",
        type: "คลังมาตรฐาน"
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
    setWarehouseData({
      warehouse_name: "",
      details: "",
      type: "คลังมาตรฐาน"
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
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 sm:mx-6 sm:max-w-lg dark:bg-zinc-800">
        <h2 className="text-lg font-semibold mb-4 text-center">เพิ่มคลังสินค้า</h2>

        <form onSubmit={handleFormSubmit}>
          {/* Warehouse Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">ชื่อคลัง</label>
            <input
              type="text"
              name="warehouse_name"
              placeholder="กรุณากรอกชื่อคลัง"
              className={`w-full border p-2 rounded-md ${
                validationError && !warehouseData.warehouse_name ? "border-red-500" : "border-gray-300"
              }`}
              value={warehouseData.warehouse_name}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>

          {/* Warehouse Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">ประเภท</label>
            <select
              name="type"
              className="w-full border border-gray-300 p-2 rounded-md"
              value={warehouseData.type}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="คลังมาตรฐาน">คลังมาตรฐาน</option>
              <option value="คลังค้าปลีก">คลังค้าปลีก</option>
              <option value="คลังค้าส่ง">คลังค้าส่ง</option>
              <option value="คลังการผลิต">คลังการผลิต</option>
              <option value="คลังชั่วคราว">คลังชั่วคราว</option>
            </select>
          </div>

          {/* Warehouse Details */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">รายละเอียด</label>
            <textarea
              name="details"
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
              className="w-full border border-gray-300 p-2 rounded-md min-h-[80px]"
              value={warehouseData.details}
              onChange={handleChange}
              disabled={isSubmitting}
            />
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

interface EditWarehousePopupProps {
  isOpen: boolean;
  onClose: () => void;
  warehouse: any;
  onSuccess?: () => void;
}

export function EditWarehousePopup({ isOpen, onClose, warehouse, onSuccess }: EditWarehousePopupProps) {
  const [warehouseData, setWarehouseData] = useState({
    warehouse_name: "",
    details: "",
    type: "คลังมาตรฐาน"
  });
  const [validationError, setValidationError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (warehouse) {
      setWarehouseData({
        warehouse_name: warehouse.warehouse_name || "",
        details: warehouse.details || "",
        type: warehouse.type || "คลังมาตรฐาน"
      });
      setValidationError("");
    }
  }, [warehouse, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWarehouseData({
      ...warehouseData,
      [name]: value
    });
    setValidationError("");
  };

  const validateForm = () => {
    if (!warehouseData.warehouse_name.trim()) {
      setValidationError("กรุณากรอกชื่อคลังสินค้า");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !warehouse?.id) return;
    try {
      setIsSubmitting(true);
      setValidationError("");
      await updateProductWarehouse(warehouse.id, {
        ...warehouseData,
        updated_date: Timestamp.now(),
      });
      if (onSuccess) onSuccess();
      onClose();
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
    setWarehouseData({
      warehouse_name: "",
      details: "",
      type: "คลังมาตรฐาน"
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
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 sm:mx-6 sm:max-w-lg dark:bg-zinc-800">
        <h2 className="text-lg font-semibold mb-4 text-center">แก้ไขคลังสินค้า</h2>
        <form onSubmit={handleFormSubmit}>
          {/* Warehouse Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">ชื่อคลัง</label>
            <input
              type="text"
              name="warehouse_name"
              placeholder="กรุณากรอกชื่อคลัง"
              className={`w-full border p-2 rounded-md ${validationError && !warehouseData.warehouse_name ? "border-red-500" : "border-gray-300"}`}
              value={warehouseData.warehouse_name}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          </div>
          {/* Warehouse Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">ประเภท</label>
            <select
              name="type"
              className="w-full border border-gray-300 p-2 rounded-md"
              value={warehouseData.type}
              onChange={handleChange}
              disabled={isSubmitting}
            >
              <option value="คลังมาตรฐาน">คลังมาตรฐาน</option>
              <option value="คลังค้าปลีก">คลังค้าปลีก</option>
              <option value="คลังค้าส่ง">คลังค้าส่ง</option>
              <option value="คลังการผลิต">คลังการผลิต</option>
              <option value="คลังชั่วคราว">คลังชั่วคราว</option>
            </select>
          </div>
          {/* Warehouse Details */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">รายละเอียด</label>
            <textarea
              name="details"
              placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)"
              className="w-full border border-gray-300 p-2 rounded-md min-h-[80px]"
              value={warehouseData.details}
              onChange={handleChange}
              disabled={isSubmitting}
            />
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
              className={`py-2 px-4 rounded-md text-white ${isSubmitting ? "bg-gray-500 cursor-not-allowed" : "bg-black hover:bg-gray-800"} transition`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังโหลด..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}