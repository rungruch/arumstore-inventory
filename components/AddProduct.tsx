"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateRandomSKU, createProduct } from "@/app/firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum'
import {
    Timestamp
  } from "firebase/firestore";

export default function AddProductForm({
    trigger,
    setTrigger,
  }: {
    trigger?: boolean;
    setTrigger?: React.Dispatch<React.SetStateAction<boolean>>;
  }) {
    const router = useRouter();
    // Use a single state object to manage all product fields
    const [productState, setProductState] = useState({
        productName: "",
        productCategory: "",
        unit: "",
        productCode: "",
        qrBarcode: "",
        description: "",
        sellingPrice: 0,
        purchasePrice: 0,
        weight: 0,
        width: 0,
        length: 0,
        height: 0,
        openingStock: 0,
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
        }
        fetchSKU();
    }, []);

    const generateSKU = async () => {
        try {
            const sku = await generateRandomSKU();
            setProductState(prev => ({
                ...prev,
                productCode: sku,
                qrBarcode: sku
            }));
        } catch (error) {
            console.error("Error generating SKU:", error);
            // Open modal with error message
            setModalState({
                isOpen: true,
                title: ModalTitle.ERROR,
                message: `ไม่สามารถสร้างรหัสสินค้าได้: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Update the state based on input type
        if (name === "sellingPrice" || name === "purchasePrice" ||
            name === "weight" || name === "width" ||
            name === "length" || name === "height" ||
            name === "openingStock") {
            setProductState(prev => ({
                ...prev,
                [name]: parseFloat(value) || 0
            }));
        } else {
            setProductState(prev => ({
                ...prev,
                [name]: value
            }));
        }

        setValidationError("");
    };

    const handleSave = async () => {
        if (!productState.productName.trim()) {
            setValidationError("กรุณากรอกชื่อสินค้า");
            setModalState({
                isOpen: true,
                title: ModalTitle.WARNING,
                message: `กรุณากรอกชื่อสินค้า`,
            });
            return;
        }
    
        try {
            setIsSubmitting(true);
            setValidationError("");
    
            const formattedProductData = {
                sku: productState.productCode,
                barcode: productState.qrBarcode,
                name: productState.productName,
                description: productState.description,
                category: productState.productCategory || "others",
                unit_type: productState.unit,
                price: {
                    buy_price: productState.purchasePrice,
                    sell_price: productState.sellingPrice,
                },
                stocks: {
                    [productState.warehouse]: productState.openingStock, // Warehouse stock mapping
                },
                pending_stock: {
                    [productState.warehouse]: 0,
                },
                delivery_details: {
                    height_cm: productState.height,
                    length_cm: productState.length,
                    width_cm: productState.width,
                    weight_kg: productState.weight,
                },
                created_date: Timestamp.now(),
                updated_date: Timestamp.now(),
            };
    
            await createProduct(formattedProductData);
    
            // Reset form
            setProductState({
                productName: "",
                productCategory: "",
                unit: "",
                productCode: "",
                qrBarcode: "",
                description: "",
                sellingPrice: 0,
                purchasePrice: 0,
                weight: 0,
                width: 0,
                length: 0,
                height: 0,
                openingStock: 0,
                warehouse: "คลังสินค้าหลัก",
            });
    
            // Generate a new SKU for the next product
            generateSKU();
    
        } catch (error) {
            setValidationError("เกิดข้อผิดพลาด: " + String(error));
        } finally {
            setIsSubmitting(false);
            if (trigger !== undefined && setTrigger !== undefined) {
                setTrigger(!trigger);
            }
            else{
                router.push("/products");
            }
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
                <h1 className="text-2xl font-bold mb-4">เพิ่มสินค้า</h1>
                <form onSubmit={handleFormSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2 font-bold">ชื่อสินค้า *</label>
                            <input type="text" name="productName" placeholder="ชื่อสินค้า" value={productState.productName} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">หมวดหมู่</label>
                            <input type="text" name="productCategory" placeholder="หมวดหมู่" value={productState.productCategory} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">หน่วย</label>
                            <input type="text" name="unit" placeholder="หน่วย (ชิ้น, ตัว)" value={productState.unit} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">รหัสสินค้า</label>
                            <input type="text" name="productCode" placeholder="รหัสสินค้า" value={productState.productCode} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">บาร์โค้ด</label>
                            <input type="text" name="qrBarcode" placeholder="รหัสคิวอาร์โค้ดและบาร์โค้ด" value={productState.qrBarcode} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">รายละเอียด</label>
                            <input type="text" name="description" placeholder="รายละเอียด" value={productState.description} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                        </div>
                        <div>
                            <label className="block mb-2 font-bold">ราคาขาย</label>
                            <input type="number" name="sellingPrice" placeholder="ราคาขาย" min={0} value={productState.sellingPrice} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            <label className="block mb-2 font-bold">ราคาซื้อ</label>
                            <input type="number" name="purchasePrice" placeholder="ราคาซื้อ" min={0} value={productState.purchasePrice} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                        </div>
                    </div>
                    <div className="mt-6">
                        <h3 className="text-md font-semibold mb-4">ข้อมูลเพิ่มเติม</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-2 font-bold">จำนวน</label>
                                <input type="number" name="openingStock" placeholder="ยอดยกมา" min={0} value={productState.openingStock} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            </div>
                            <div>
                                <label className="block mb-2 font-bold">สินค้าเข้าที่</label>
                                <input type="text" name="warehouse" placeholder="สินค้าเข้าที่" value={productState.warehouse} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <h3 className="text-md font-semibold mb-4">ข้อมูลน้ำหนักและขนาด</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-2 font-bold">น้ำหนัก (กิโลกรัม)</label>
                                <input type="number" name="weight" placeholder="น้ำหนัก" min={0} value={productState.weight} onChange={handleChange} className="w-full border p-2 rounded-md mb-4" />
                            </div>
                            <div>
                                <label className="block mb-2 font-bold">ขนาด (กว้างxยาวxสูง) (ซม.)</label>
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <input type="number" name="width" placeholder="กว้าง" min={0} value={productState.width} onChange={handleChange} className="border p-2 rounded-md" />
                                    <input type="number" name="length" placeholder="ยาว" min={0} value={productState.length} onChange={handleChange} className="border p-2 rounded-md" />
                                    <input type="number" name="height" placeholder="สูง" min={0} value={productState.height} onChange={handleChange} className="border p-2 rounded-md" />
                                </div>
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