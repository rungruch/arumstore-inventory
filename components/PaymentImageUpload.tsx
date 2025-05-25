"use client";

import { useState, useRef } from "react";
import { updatePaymentImage } from "@/app/firebase/firestore";
import { getFile, uploadFile } from "@/app/firebase/storage";
import { Camera, Upload, CheckCircle, AlertCircle, X } from "lucide-react";

interface PaymentImageUploadProps {
  transactionId: string;
  currentImage?: string;
  onUploadSuccess?: () => void;
}

export default function PaymentImageUpload({
  transactionId,
  currentImage,
  onUploadSuccess
}: PaymentImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB');
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      // Upload to Firebase Storage
      const folder = "payment-proofs/";
      const imagePath = await uploadFile(selectedFile, folder);
      const imageUrl = await getFile(imagePath);

      // Update transaction with payment image
      await updatePaymentImage(transactionId, imageUrl);

      setSuccess(true);
      setShowUploader(false);
      setSelectedFile(null);
      setPreviewUrl(null);

      // Call success callback
      if (onUploadSuccess) {
        onUploadSuccess();
      }

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);

    } catch (error) {
      console.error("Upload failed:", error);
      setError(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowUploader(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
  };

  if (success) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3 text-green-600 dark:text-green-400">
          <CheckCircle className="w-6 h-6" />
          <div>
            <h3 className="font-medium">อัปโหลดสำเร็จ!</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">หลักฐานการชำระเงินได้รับการบันทึกแล้ว</p>
          </div>
        </div>
      </div>
    );
  }

  if (!showUploader) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
          <Camera className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          หลักฐานการชำระเงิน
        </h3>
        
        {currentImage ? (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={currentImage}
                alt="หลักฐานการชำระเงิน"
                className="w-full max-w-sm mx-auto rounded-lg border border-gray-200 dark:border-gray-600"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <button
              onClick={() => setShowUploader(true)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>อัปโหลดหลักฐานใหม่</span>
            </button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-3">ยังไม่มีหลักฐานการชำระเงิน</p>
            <button
              onClick={() => setShowUploader(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2 mx-auto"
            >
              <Camera className="w-4 h-4" />
              <span>อัปโหลดหลักฐาน</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <Upload className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          อัปโหลดหลักฐานการชำระเงิน
        </h3>
        <button
          onClick={handleCancel}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {!selectedFile ? (
          <div
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 mb-1">คลิกเพื่อเลือกรูปภาพ</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">รองรับไฟล์ JPG, PNG (ไม่เกิน 5MB)</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <img
                src={previewUrl!}
                alt="ตัวอย่างรูปภาพ"
                className="w-full max-w-sm mx-auto rounded-lg border border-gray-200 dark:border-gray-600"
              />
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                เลือกรูปใหม่
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`flex-1 px-4 py-2 rounded-lg text-white transition-colors flex items-center justify-center space-x-2 ${
                  uploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>กำลังอัปโหลด...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>อัปโหลด</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
