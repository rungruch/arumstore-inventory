"use client";
import { useRef,useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateRandomSKU, createProduct, getProductCategory, getProductWarehouse } from "@/app/firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum'
import { getFile, uploadFile } from "@/app/firebase/storage";
import {
    Timestamp
  } from "firebase/firestore";
import { ProductStatus } from "@/app/firebase/enum";

  export default function AddProductForm({
    trigger,
    setTrigger,
  }: {
    trigger?: boolean;
    setTrigger?: React.Dispatch<React.SetStateAction<boolean>>;
  }) {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploaded, setUploaded] = useState("");
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [imageUploading, setimageUploading] = useState(false);
    const [categories, setCategories] = useState<any>([]);
    const [warehouses, setWarehouses] = useState<any>([]);



    const router = useRouter();
    // Use a single state object to manage all product fields
    const [productState, setProductState] = useState({
        productName: "",
        productCategory: "",
        unit: "ชิ้น",
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
            try {
                const categories = await getProductCategory();
                const warehouses = await getProductWarehouse();
                setCategories(categories);
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
                sku_image: uploaded || "",
                barcode: productState.qrBarcode,
                name: productState.productName,
                description: productState.description,
                category: productState.productCategory || "others",
                unit_type: productState.unit,
                warehouse: [productState.warehouse], // Added warehouse field as an array
                price: {
                    buy_price: productState.purchasePrice,
                    sell_price: productState.sellingPrice,
                    buy_price_average: productState.purchasePrice,
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
                status: ProductStatus.ACTIVE,
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
            setModalState({
                isOpen: true,
                title: ModalTitle.ERROR,
                message: `${error instanceof Error ? error.message : String(error)}`,
            });
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
        <>
        <Modal 
            isOpen={modalState.isOpen} 
            onClose={closeModal} 
            title={modalState.title} 
            message={modalState.message}
        />
            <div className="p-6 rounded-lg shadow-lg w-full mx-auto bg-white dark:bg-zinc-800">
                <h1 className="text-2xl font-bold mb-4">เพิ่มสินค้า</h1>
                <form onSubmit={handleFormSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2 font-bold">ชื่อสินค้า <span className="text-red-500">*</span></label>
                            <input type="text" name="productName" placeholder="ชื่อสินค้า" value={productState.productName} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                            <label className="block mb-2 font-bold">หมวดหมู่</label>
                            <select 
                                name="productCategory" 
                                value={productState.productCategory} 
                                onChange={handleChange} 
                                className="w-full border p-2 rounded-md mb-4 dark:border-gray-700"
                            >
                            <option value="">เลือกหมวดหมู่</option>
                                {categories.map((category: any) => (
                                    <option key={category.category_name} value={category.category_name}>{category.category_name}</option>
                                ))}
                            </select>
                            <label className="block mb-2 font-bold">หน่วย <span className="text-red-500">*</span></label>
                            <input type="text" name="unit" placeholder="หน่วย (ชิ้น, ตัว)" value={productState.unit} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                            <label className="block mb-2 font-bold">รหัสสินค้า</label>
                            <input type="text" name="productCode" placeholder="รหัสสินค้า" value={productState.productCode} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                            <label className="block mb-2 font-bold">บาร์โค้ด</label>
                            <input type="text" name="qrBarcode" placeholder="รหัสคิวอาร์โค้ดและบาร์โค้ด" value={productState.qrBarcode} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                            <label className="block mb-2 font-bold">รายละเอียด</label>
                            <input type="text" name="description" placeholder="รายละเอียด" value={productState.description} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                        </div>
                        <div>
                            <label className="block mb-2 font-bold">ราคาขาย <span className="text-red-500">*</span></label>
                            <input type="number"  onWheel={(e) => (e.target as HTMLInputElement).blur()} name="sellingPrice" placeholder="ราคาขาย" min={0} value={productState.sellingPrice} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                            <label className="block mb-2 font-bold">ราคาซื้อ <span className="text-red-500">*</span></label>
                            <input type="number"  onWheel={(e) => (e.target as HTMLInputElement).blur()} name="purchasePrice" placeholder="ราคาซื้อ" min={0} value={productState.purchasePrice} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                            <div className="container mx-auto mt-8 max-w-[560px]">
                        </div>
                        <div className="mt-8 max-w-lg mx-auto">
            <label className="block mb-2 font-bold text-gray-700 dark:text-gray-400">รูปสินค้า</label>

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
                        </div>
                    </div>
                    <div className="mt-6">
                        <h3 className="text-md font-semibold mb-4">ข้อมูลเพิ่มเติม</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-2 font-bold">จำนวน</label>
                                <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} name="openingStock" placeholder="ยอดยกมา" min={0} value={productState.openingStock} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                            </div>
                            <div>
                            <label className="block mb-2 font-bold">สินค้าเข้าที่</label>
                            <select 
                                name="warehouse" 
                                value={productState.warehouse} 
                                onChange={handleChange} 
                                className="w-full border p-2 rounded-md mb-4 dark:border-gray-700"
                            >
                            <option value="" disabled>เลือกคลังสินค้า</option>
                                {warehouses.map((warehouse: any) => (
                                <option key={warehouse.warehouse_name} value={warehouse.warehouse_name}>{warehouse.warehouse_name}</option>
                                ))}
                            </select>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <h3 className="text-md font-semibold mb-4">ข้อมูลน้ำหนักและขนาด</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-2 font-bold">น้ำหนัก (กิโลกรัม)</label>
                                <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} name="weight" placeholder="น้ำหนัก" min={0} value={productState.weight} onChange={handleChange} className="w-full border p-2 rounded-md mb-4 dark:border-gray-700" />
                            </div>
                            <div>
                                <label className="block mb-2 font-bold">ขนาด (กว้างxยาวxสูง) (ซม.)</label>
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} name="width" placeholder="กว้าง" min={0} value={productState.width} onChange={handleChange} className="border p-2 rounded-md dark:border-gray-700" />
                                    <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} name="length" placeholder="ยาว" min={0} value={productState.length} onChange={handleChange} className="border p-2 rounded-md dark:border-gray-700" />
                                    <input type="number" onWheel={(e) => (e.target as HTMLInputElement).blur()} name="height" placeholder="สูง" min={0} value={productState.height} onChange={handleChange} className="border p-2 rounded-md dark:border-gray-700" />
                                </div>
                            </div>
                        </div>
                    </div>
                    {validationError && <p className="text-red-500 text-sm mb-4">{validationError}</p>}
                    <div className="flex justify-end space-x-2">
                        <button type="submit" className={`px-6 py-2.5 rounded-lg rounded-md text-white ${isSubmitting ? "bg-gray-500 cursor-not-allowed" : "bg-black hover:bg-gray-800"} transition`} disabled={isSubmitting}>
                            {isSubmitting ? "กำลังโหลด..." : "ตกลง"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}