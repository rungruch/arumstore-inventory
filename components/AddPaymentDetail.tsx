import { useRef,useState, useEffect } from "react";
import { updatePaymentDetails } from "@/app/firebase/firestore";
import { getFile, uploadFile } from "@/app/firebase/storage";
import { Timestamp } from 'firebase/firestore';
import { ModalTitle } from '@/components/enum'

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
              currentPaymentStatus !== 'PAID' ? 'PAID' : currentPaymentStatus,
              paymentMethod,
              {
              payment_date: new Date(paymentDate),
              payment_amount: paymentAmount,
              image: uploaded || "",
              });

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

    return (
        <div className=" bg- fixed inset-0 flex justify-center items-center z-50">
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
                      <option value="PAID">ชำระแล้ว</option>
                      <option value="NONE">รอชำระ</option>
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
                    
                    <div className="mt-8">
                        <label className="block mb-2 font-bold text-gray-700 dark:text-gray-400">หลักฐานการชำระเงิน</label>

                        <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition"
                            onClick={() => inputRef.current?.click()}
                        >
                            {selectedFile ? (
                                <img
                                    src={URL.createObjectURL(selectedFile)}
                                    alt="Selected"
                                    className="w-48 h-48 object-cover rounded-md shadow-md"
                                />
                            ) : (
                                <>
                                    <svg
                                        className="w-12 h-12 text-gray-400 mb-3"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0h10m-10 0l10 10m-5 6v-6m-4 0h8"></path>
                                    </svg>
                                    <p className="text-gray-600">คลิกหรือลากไฟล์มาวางที่นี่</p>
                                    <p className="text-sm text-gray-400">รองรับไฟล์ .jpg, .png</p>
                                </>
                            )}
                        </div>

                        {uploaded && (
                            <img
                                src={uploaded}
                                alt="Uploaded preview"
                                className="mt-4 w-48 h-48 object-cover rounded-md shadow-md"
                            />
                        )}

                        <input
                            type="file"
                            ref={inputRef}
                            className="hidden"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />

                        {selectedFile && (
                            <button
                                className={`mt-4 text-white px-4 py-2 rounded-md shadow-md transition w-full ${
                                    imageUploading ? "bg-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"
                                }`}
                                type="button"
                                onClick={handleUpload}
                                disabled={imageUploading}
                            >
                                {imageUploading ? "กำลังอัพโหลด..." : "อัปโหลดรูปภาพ"}
                            </button>
                        )}

                        {uploaded && (
                            <p className="mt-4 text-green-600 font-medium">อัปโหลดสำเร็จ!</p>
                        )}
                    </div>
                    
                    <div className="flex justify-end space-x-2 mt-4 bottom-0 py-4">
                        <button 
                            type="button" 
                            onClick={onCancel} 
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-200 rounded dark:bg-zinc-700 dark:hover:bg-zinc-600 transition-all"
                            disabled={isLoading || imageUploading}
                        >
                            ยกเลิก
                        </button>
                        <button 
                            type="submit" 
                            className={`px-4 py-2 rounded ${
                                isLoading || imageUploading
                                    ? 'bg-grey-400 cursor-not-allowed' 
                                    : 'text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition'
                            }`}
                            disabled={isLoading || imageUploading}
                        >
                            {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
