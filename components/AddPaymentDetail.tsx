import { useRef, useState, useEffect } from "react";
import { updatePaymentDetails } from "@/app/firebase/firestore";
import { getFile, uploadFile } from "@/app/firebase/storage";
import { Timestamp } from 'firebase/firestore';
import { ModalTitle } from '@/components/enum'
import { PaymentStatus } from '@/app/firebase/enum';
import { useAuth } from '@/app/contexts/AuthContext';

interface ShippingDetailsFormProps {
    transactionId: string;
    shouldPayAmount: number;
    currentPaymentStatus: string;
    currentPaymentMethod: string;
    currentPaymentDetails?: {
        payment_amount: number;
        payment_date: Date;
        image?: string;
    };
    onSubmitSuccess: () => void;
    onCancel: () => void;
}

export default function PaymentDetailsForm({
    transactionId,
    shouldPayAmount,
    currentPaymentStatus,
    currentPaymentMethod,
    currentPaymentDetails,
    onSubmitSuccess,
    onCancel
}: ShippingDetailsFormProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    // Convert current payment date to YYYY-MM-DD format for date input
    const formatDateForInput = (date: Date | Timestamp) => {
        if (!date) return '';
        const jsDate = date instanceof Timestamp ? date.toDate() : date;
        const isoString = jsDate.toISOString();
        return isoString.slice(0, -8);
    };

    const [paymentMethod, setPaymentMethod] = useState(currentPaymentMethod ? currentPaymentMethod : 'เงินสด');
    const [paymentDate, setPaymentDate] = useState(
        currentPaymentDetails ? formatDateForInput(currentPaymentDetails.payment_date) : ''
    );
    const [paymentAmount, setPaymentAmount] = useState(
        currentPaymentDetails ? currentPaymentDetails.payment_amount : shouldPayAmount
    );


    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imageUploading, setimageUploading] = useState(false);
    const [uploaded, setUploaded] = useState(
        currentPaymentDetails?.image || ""
    );
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: "",
        message: "",
    });
    const [isDragging, setIsDragging] = useState(false);
    const [imageLoadError, setImageLoadError] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const { hasPermission, currentUser } = useAuth(); // Get hasPermission and currentUser from AuthContext

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onCancel();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onCancel]);

    // Reset image states when uploaded URL changes
    useEffect(() => {
        if (uploaded) {
            setImageLoading(true);
            setImageLoadError(false);
            
            // Test if the URL is accessible
            const testImage = new Image();
            testImage.onload = () => {
                setImageLoading(false);
                setImageLoadError(false);
            };
            testImage.onerror = () => {
                setImageLoading(false);
                setImageLoadError(true);
            };
            testImage.src = uploaded;
        }
    }, [uploaded]);



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            if (!paymentDate || !paymentAmount || !paymentMethod) {
                setError('กรุณากรอกข้อมูลให้ครบ');
                setIsLoading(false);
                return;
            }

            await updatePaymentDetails(transactionId,
                currentPaymentStatus !== PaymentStatus.COMPLETED ? PaymentStatus.COMPLETED : currentPaymentStatus,
                paymentMethod,
                {
                    payment_date: new Date(paymentDate),
                    payment_amount: paymentAmount,
                    image: uploaded || "",
                },
                currentUser?.email || 'Unknown User');

            onSubmitSuccess();
        } catch (err) {
            console.error('Error saving payment details:', err);
            setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setimageUploading(true);
        try {
            const folder = "skuImages/";
            const imagePath = await uploadFile(selectedFile, folder);
            const imageUrl = await getFile(imagePath);
            setUploaded(imageUrl);
        } catch (error) {
            console.error("Upload failed:", error);
            setModalState({
                isOpen: true,
                title: ModalTitle.ERROR,
                message: `${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            setimageUploading(false);
        }
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files && files[0]) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                if (file.size <= 5 * 1024 * 1024) { // 5MB limit
                    setSelectedFile(file);
                } else {
                    setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
                }
            } else {
                setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (.jpg, .jpeg, .png)');
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size <= 5 * 1024 * 1024) { // 5MB limit
                setSelectedFile(file);
                setError(null); // Clear any previous errors
            } else {
                setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
                e.target.value = ''; // Clear the input
            }
        }
    };

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-[#00000066] dark:bg-[#00000099]">
            <div ref={modalRef} className="bg-white p-6 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto dark:bg-zinc-800">
                <h2 className="text-xl font-bold mb-4 top-0">แก้ไขข้อมูลการชำระเงิน</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            {error}
                        </div>
                    )}

                    <div>
                        <label htmlFor="transaction_id" className="block mb-2">รายการ</label>
                        <input
                            type="text"
                            id="transaction_id"
                            value={transactionId}
                            disabled
                            className="w-full p-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-zinc-600"
                        />
                    </div>


                    <div>
                        <label htmlFor="current_payment_status" className="block mb-2">สถานะ</label>
                        <select
                            id="current_payment_status"
                            value={currentPaymentStatus}
                            className="w-full p-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-zinc-600"
                            disabled
                        >
                            <option value={PaymentStatus.COMPLETED}>ชำระแล้ว</option>
                            <option value={PaymentStatus.PENDING}>รอชำระ</option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="payment_method" className="block mb-2">ชำระด้วย<span className="text-red-500">*</span></label>
                        <select
                            id="payment_method"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            required
                            className="w-full p-2 border rounded dark:border-gray-300"
                        >
                            <option value="">เลือกวิธีการชำระเงิน</option>
                            <option value="โอนเงินผ่านธนาคาร">โอนเงินผ่านธนาคาร</option>
                            <option value="บัตรเครดิต">บัตรเครดิต</option>
                            <option value="เงินสด">เงินสด</option>
                            <option value="อื่นๆ">อื่นๆ</option>
                        </select>
                    </div>


                    <div>
                        <label htmlFor="payment_date" className="block mb-2">วันที่และเวลาชำระเงิน<span className="text-red-500">*</span></label>
                        <input
                            type="datetime-local"
                            id="payment_date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                            required
                            className="w-full p-2 border rounded dark:border-gray-300"
                        />
                    </div>

                    <div>
                        <label htmlFor="payment_amount" className="block mb-2">จำนวนเงิน<span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            id="payment_amount"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                            required
                            className="w-full p-2 border rounded dark:border-gray-300"
                        />
                    </div>

                    {hasPermission('sales', 'create') && hasPermission('sales', 'edit') && (
                        <>
                            <div className="mt-8">
                                <label className="block mb-3 font-semibold text-gray-800 dark:text-gray-200">
                                    หลักฐานการชำระเงิน
                                </label>

                                {/* Image Preview Section */}
                                <div className="space-y-4">
                                    {/* Current Uploaded Image */}
                                    {uploaded && !selectedFile && (
                                        <div className="relative group">
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-zinc-800 dark:to-zinc-700 rounded-xl p-4 border border-gray-200 dark:border-zinc-600">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">หลักฐานที่อัปโหลดแล้ว</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">คลิกเพื่อดูภาพขนาดเต็ม</p>
                                                    </div>
                                                </div>
                                                <div className="relative overflow-hidden rounded-lg cursor-pointer group" onClick={() => window.open(uploaded, '_blank')}>
                                                    {imageLoading && !imageLoadError && (
                                                        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    {imageLoadError ? (
                                                        <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg">
                                                            <div className="text-center">
                                                                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                <p className="text-sm text-gray-500 dark:text-gray-400">ไม่สามารถโหลดรูปภาพได้</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">คลิกเพื่อดูลิงก์ต้นฉบับ</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 break-all px-2">
                                                                    URL: {uploaded.length > 50 ? uploaded.substring(0, 50) + '...' : uploaded}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={uploaded}
                                                            alt="หลักฐานการชำระเงิน"
                                                            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                                                            onError={(e) => {
                                                                setImageLoadError(true);
                                                                setImageLoading(false);
                                                            }}
                                                            onLoad={() => {
                                                                setImageLoading(false);
                                                                setImageLoadError(false);
                                                            }}
                                                            style={{ display: imageLoading ? 'none' : 'block' }}
                                                        />
                                                    )}
                                                    {!imageLoadError && (
                                                        <div className="absolute inset-0 bg-transparent group-hover:backdrop-blur-sm transition-all duration-300 flex items-center justify-center pointer-events-none">
                                                            <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Selected File Preview */}
                                    {selectedFile && (
                                        <div className="relative group">
                                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-800 dark:to-zinc-700 rounded-xl p-4 border border-amber-200 dark:border-zinc-600">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center">
                                                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">ภาพที่เลือกใหม่</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{selectedFile.name}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedFile(null)}
                                                        className="w-6 h-6 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                                                    >
                                                        <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="relative overflow-hidden rounded-lg">
                                                    <img
                                                        src={URL.createObjectURL(selectedFile)}
                                                        alt="ภาพที่เลือก"
                                                        className="w-full h-48 object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Upload Area */}
                                    <div
                                        className={`border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer ${
                                            isDragging
                                                ? 'border-blue-500 dark:border-blue-400 bg-blue-100 dark:bg-blue-900/30 scale-105'
                                                : selectedFile || uploaded 
                                                    ? 'border-gray-200 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700' 
                                                    : 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-zinc-800 hover:bg-blue-100 dark:hover:bg-zinc-700 hover:border-blue-400 dark:hover:border-blue-500'
                                        }`}
                                        onClick={() => inputRef.current?.click()}
                                        onDragEnter={handleDragEnter}
                                        onDragLeave={handleDragLeave}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    >
                                        <div className="flex flex-col items-center justify-center text-center">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                                                selectedFile || uploaded 
                                                    ? 'bg-gray-200 dark:bg-zinc-600' 
                                                    : 'bg-blue-100 dark:bg-blue-900'
                                            }`}>
                                                <svg className={`w-6 h-6 ${
                                                    selectedFile || uploaded 
                                                        ? 'text-gray-500 dark:text-gray-400' 
                                                        : 'text-blue-600 dark:text-blue-400'
                                                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </div>
                                            <p className={`font-medium mb-1 ${
                                                selectedFile || uploaded 
                                                    ? 'text-gray-700 dark:text-gray-300' 
                                                    : 'text-blue-700 dark:text-blue-300'
                                            }`}>
                                                {isDragging 
                                                    ? 'วางไฟล์ที่นี่' 
                                                    : selectedFile || uploaded 
                                                        ? 'เปลี่ยนรูปภาพ' 
                                                        : 'อัปโหลดหลักฐานการชำระเงิน'
                                                }
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {isDragging 
                                                    ? 'ปล่อยเพื่ออัปโหลดไฟล์'
                                                    : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'
                                                }
                                            </p>
                                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                รองรับไฟล์ .jpg, .jpeg, .png (ขนาดไม่เกิน 5MB)
                                            </p>
                                        </div>
                                    </div>

                                    <input
                                        type="file"
                                        ref={inputRef}
                                        accept="image/jpeg,image/jpg,image/png"
                                        className="hidden"
                                        onChange={handleFileSelect}
                                    />

                                    {/* Upload Button */}
                                    {selectedFile && (
                                        <button
                                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                                imageUploading 
                                                    ? "bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed" 
                                                    : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                            }`}
                                            type="button"
                                            onClick={handleUpload}
                                            disabled={imageUploading}
                                        >
                                            {imageUploading ? (
                                                <>
                                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    กำลังอัพโหลด...
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                    </svg>
                                                    อัปโหลดรูปภาพ
                                                </>
                                            )}
                                        </button>
                                    )}

                                    {/* Success Message */}
                                    {uploaded && !selectedFile && (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                อัปโหลดหลักฐานสำเร็จแล้ว
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200 dark:border-zinc-600">
                                <button
                                    type="button"
                                    onClick={onCancel}
                                    className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-gray-700 dark:text-gray-300 rounded-lg transition-all duration-200 font-medium"
                                    disabled={isLoading || imageUploading}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                                        isLoading || imageUploading
                                            ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                                            : 'text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                    }`}
                                    disabled={isLoading || imageUploading}
                                >
                                    {isLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                                </button>
                            </div>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
}
