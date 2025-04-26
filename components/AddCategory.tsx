import React, { useState } from "react";
import { createProductCategory } from "@/app/firebase/firestore";

interface AddCategoryPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCategoryPopup({ isOpen, onClose }: AddCategoryPopupProps) {
  const [categoryName, setCategoryName] = useState(""); // State for category name
  const [validationError, setValidationError] = useState(""); // State for validation errors
  const [isSubmitting, setIsSubmitting] = useState(false); // State for disabling submit during Firestore errors

  const handleSave = async () => {
    // Validation: Check if the category name is empty
    if (!categoryName.trim()) {
      setValidationError("กรุณากรอกข้อมูลหมวดหมู่"); // Set validation error
      return;
    }

    try {
      setIsSubmitting(true); // Disable the "Save" button during submission
      setValidationError(""); // Clear any validation errors

      await createProductCategory(categoryName); // Call Firestore function
      setCategoryName(""); // Reset the input
      window.location.reload(); // Refresh the page
    } catch (error) {
      setValidationError("เกิดข้อผิดพลาด:" + String(error)); // Show submission error
    } finally {
      setIsSubmitting(false); // Re-enable the "Save" button
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCategoryName(e.target.value); // Update the input value
    setValidationError(""); // Reset the validation error as user types
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent the default form submission behavior
    handleSave(); // Trigger the save logic
  };

  const handleClose = () => {
    setValidationError(""); // Reset validation and submission states
    setCategoryName(""); // Clear the input box
    onClose(); // Call parent-provided onClose handler
  };

  if (!isOpen) return null;

  return (
    <div
      id="popup-overlay"
      onClick={(e) => {
        if ((e.target as HTMLElement).id === "popup-overlay") handleClose(); // Close on clicking outside
      }}
      style={{ backgroundColor: "#00000066" }}
      className="fixed inset-0 flex items-center justify-center z-50"
    >
      <div
        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4 sm:mx-6 sm:max-w-lg dark:bg-zinc-900"
      >
        <h2 className="text-lg font-semibold mb-4 text-center">เพิ่มหมวดหมู่</h2>

        {/* Form Wrapper */}
        <form onSubmit={handleFormSubmit}>
          {/* Input Field */}
          <input
            type="text"
            placeholder="กรุณากรอกหมวดหมู่"
            className={`w-full border p-2 rounded-md mb-4 ${
              validationError ? "border-red-500" : "border-gray-300"
            }`}
            value={categoryName}
            onChange={handleInputChange}
            disabled={isSubmitting} // Disable input while submitting
          />

          {/* Error Message */}
          {validationError && (
            <p className="text-red-500 text-sm mb-4">{validationError}</p>
          )}

          <div className="flex justify-end space-x-2">
            {/* Cancel Button */}
            <button
              type="button" // Ensure this button doesn't trigger form submission
              onClick={handleClose}
              className="bg-gray-300 py-2 px-4 rounded-md hover:bg-gray-400 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all"
            >
              ยกเลิก
            </button>

            {/* Save Button */}
            <button
              type="submit" // This makes it a form submission button
              className={`py-2 px-4 rounded-md text-white ${
                isSubmitting
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-black hover:bg-gray-800"
              } transition`}
              disabled={isSubmitting} // Disable button during submission
            >
              {isSubmitting ? "กำลังโหลด..." : "ตกลง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
