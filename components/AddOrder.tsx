"use client";
import { useRef,useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateRandomSellTransactionId, createProduct, getProductCategory, getProductWarehouse } from "@/app/firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum'
import {
    Timestamp
  } from "firebase/firestore";

  export default function AddSellOrderForm({
    trigger,
    setTrigger,
  }: {
    trigger?: boolean;
    setTrigger?: React.Dispatch<React.SetStateAction<boolean>>;
  }) {
    const [warehouses, setWarehouses] = useState<any>([]);

    const router = useRouter();
    // Use a single state object to manage all product fields
    const [orderState, setOrderState] = useState({
        transaction_id: "",
        transaction_type: "SELL",
        sell_method: "",
        vat_type: "VAT0",
        client_name: "",
        client_id: "",
        client_tel: "",
        client_email: "",
        client_address: "",
        client_description: "",
        tax_id: "",
        branch_name: "",
        branch_id: "",
        warehouse: "คลังสินค้าหลัก",
    });

    const [validationError, setValidationError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Modal state
    const [modalState, setModalState] = useState({
        isOpen: false,
        title: "",
        message: "",
    });


    useEffect(() => {
        async function fetchSKU() {
            await generateSKU();
            try {
                const warehouses = await getProductWarehouse();
                setWarehouses(warehouses);
              } catch (error) {
                setModalState({
                    isOpen: true,
                    title: ModalTitle.ERROR,
                    message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}`,
                });
              }
        }
        fetchSKU();
    }, []);

    const generateSKU = async () => {
        try {
            const id = await generateRandomSellTransactionId();
            setOrderState(prev => ({
                ...prev,
                transaction_id: id,
            }));
        } catch (error) {
            console.error("Error generating Transaction ID:", error);
            // Open modal with error message
            setModalState({
                isOpen: true,
                title: ModalTitle.ERROR,
                message: `ไม่สามารถสร้างรายการได้: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Update the state based on input type
            setOrderState(prev => ({
                ...prev,
                [name]: value
            }));


        setValidationError("");
    };

    const handleSave = async () => {
        if (!orderState.transaction_id.trim()) {
            setValidationError("กรุณากรอกรหัสรายการ");
            setModalState({
                isOpen: true,
                title: ModalTitle.WARNING,
                message: `กรุณากรอกรหัสรายการ`,
            });
            return;
        }
    
        try {
            setIsSubmitting(true);
            setValidationError("");
    
            const formattedProductData = {
                transaction_id: orderState.transaction_id,
                transaction_type: orderState.transaction_type,
                sell_method: orderState.sell_method,
                vat_type: orderState.vat_type,
                client_name: orderState.client_name,
                client_id: orderState.client_id,
                client_tel: orderState.client_tel,
                client_email: orderState.client_email,
                client_address: orderState.client_address,
                client_description: orderState.client_description,
                tax_id: orderState.tax_id,
                branch_name: orderState.branch_name,
                branch_id: orderState.branch_id,
                warehouse: orderState.warehouse,
                status: "PENDING",
                items: [],
                total_amount: 0,
                payment_method: "",
                payment_status: "",
                created_by: "admin",
                updated_by: "admin",
                created_date: Timestamp.now(),
                updated_date: Timestamp.now(),
            };
            console.log(JSON.stringify(formattedProductData));
    
            //await createProduct(formattedProductData);
    
            // Reset form

            setOrderState({
                transaction_id: "",
                transaction_type: "SELL",
                sell_method: "",
                vat_type: "VAT0",
                client_name: "",
                client_id: "",
                client_tel: "",
                client_email: "",
                client_address: "",
                client_description: "",
                tax_id: "",
                branch_name: "",
                branch_id: "",
                warehouse: "คลังสินค้าหลัก",
            });
    
            // Generate a new SKU for the next product
            generateSKU();
    
        } catch (error) {
            setValidationError("เกิดข้อผิดพลาด: " + String(error));
            setModalState({
                isOpen: true,
                title: ModalTitle.ERROR,
                message: `${error instanceof Error ? error.message : String(error)}`,
            });
        } finally {
            setIsSubmitting(false);
            // if (trigger !== undefined && setTrigger !== undefined) {
            //     setTrigger(!trigger);
            // }
            // else{
            //     router.push("/products");
            // }
        }
    };
    

    const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        handleSave();
    };

    const closeModal = () => {
        setModalState(prev => ({
            ...prev,
            isOpen: false
        }));
    };

    return (
        <>
        <Modal 
            isOpen={modalState.isOpen} 
            onClose={closeModal} 
            title={modalState.title} 
            message={modalState.message}
        />
            <div className="p-6 rounded-lg shadow-lg w-full mx-auto bg-white">
                <h1 className="text-2xl font-bold mb-4">เพิ่มรายการขาย</h1>
                <form onSubmit={handleFormSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                        <h3 className="text-md font-semibold mb-4">ข้อมูล</h3>
                        <label className="block mb-2 font-bold">ประเภท</label>
                        <input type="text" name="transactionType" placeholder="ประเภท" value={'สินค้าขายออก'} disabled={true} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                        <label className="block mb-2 font-bold">รายการ*</label> 
                        <input type="text" name="transaction_id" placeholder="รหัสรายการ" value={orderState.transaction_id} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                        <label className="block mb-2 font-bold">ช่องทางการขาย</label> 
                        <select
                            name="transactionChannel"
                            value={orderState.sell_method}
                            onChange={handleChange}
                            className="w-full border p-2 rounded-md mb-4"
                        >
                            <option value="">เลือกช่องทางการขาย</option>
                            <option value="STORE">ร้านค้า</option>
                            <option value="FACEBOOK">Facebook</option>
                            <option value="LINE">Line</option>
                            <option value="WEBSITE">เว็บไซต์</option>
                            <option value="INSTAGRAM">Instagram</option>
                            <option value="Others">อื่นๆ</option>
                        </select>
                        <label className="block mb-2 font-bold">ประเภทภาษี</label> 
                        <select
                            name="vatType"
                            value={orderState.vat_type}
                            onChange={handleChange}
                            className="w-full border p-2 rounded-md mb-4"
                        >
                            <option value="VAT0">รวมภาษีมูลค่าเพิ่ม 7%</option>
                            <option value="VAT7">แยกภาษีมูลค่าเพิ่ม 7%</option>
                            <option value="NO_VAT">ไม่มีภาษีมูลค่าเพิ่ม</option>
                        </select>
                        </div>
                        <div>
                        <h3 className="text-md font-semibold mb-4">ข้อลูกค้าจัดส่ง</h3>
                            <label className="block mb-2 font-bold">ชื่อ</label>
                            <input type="text" name="clientName" placeholder="ชื่อ"  value={orderState.client_name} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">รหัสลูกค้า</label>
                            <input type="text" name="clientId" placeholder="รหัสลูกค้า" value={orderState.client_id} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">เบอร์โทร</label>
                            <input type="text" name="clientTel" placeholder="เบอร์โทร" value={orderState.client_tel} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">อีเมล์</label>
                            <input type="text" name="clientEmail" placeholder="อีเมล์" value={orderState.client_email} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">ที่อยู่</label>
                            <input type="text" name="clientAddress" placeholder="ที่อยู่" value={orderState.client_address} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <div className="container mx-auto mt-8 max-w-[560px]">
                            <label className="block mb-2 font-bold">เลขประจำตัวผู้เสียภาษี</label>
                            <input type="text" name="taxId" placeholder="เลขประจำตัวผู้เสียภาษี" value={orderState.tax_id} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">ชื่อสาขา</label>
                            <input type="text" name="branchName" placeholder="ชื่อสาขา" value={orderState.branch_name} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">รหัสสาขา</label>
                            <input type="text" name="branchId" placeholder="รหัสสาขา" value={orderState.branch_name} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                        </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <h3 className="text-md font-semibold mb-4">คลังสินค้า</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                            <label className="block mb-2 font-bold">โอนออกจากคลังสินค้าทันที</label>
                            <select 
                                name="warehouse" 
                                value={orderState.warehouse} 
                                onChange={handleChange} 
                                className="w-full border p-2 rounded-md mb-4"
                            >
                            <option value="" disabled>เลือกคลังสินค้า</option>
                                {warehouses.map((warehouse: any) => (
                                <option key={warehouse.warehouse_name} value={warehouse.warehouse_name}>{warehouse.warehouse_name}</option>
                                ))}
                            </select>
                            </div>
                        </div>
                    </div>
                    {validationError && <p className="text-red-500 text-sm mb-4">{validationError}</p>}
                    <div className="flex justify-end space-x-2">
                        <button type="submit" className={`py-2 px-4 rounded-md text-white ${isSubmitting ? "bg-gray-500 cursor-not-allowed" : "bg-black hover:bg-gray-800"} transition`} disabled={isSubmitting}>
                            {isSubmitting ? "กำลังโหลด..." : "ตกลง"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}