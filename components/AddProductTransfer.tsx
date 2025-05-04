"use client";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { getProductBySKU, generateRandomTransferTransactionId, getProductWarehouse, createTransferTransactionCompleted} from "@/app/firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import ProductSection from "./ProductTransferSection";
import {TransactionType} from "@/app/firebase/enum";
import { ModalState } from '@/components/interface';

// Define types for the component
interface Warehouse {
  [key: string]: any;
}

interface OrderItem {
  [key: string]: any;
}

interface OrderState {
  transaction_id: string;
  transaction_type: TransactionType;
  warehouse: string;
  to_warehouse: string;
  notes: string;
}


interface AddSellOrderFormProps {
  trigger?: boolean;
  setTrigger?: React.Dispatch<React.SetStateAction<boolean>>;
  ref_product_id?: string | null;
}

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  price: number;
  discount?: number;
  total: number;
  stock?: number;
  unit_type: string;
}

export default function AddSellOrderForm({
  trigger,
  setTrigger,
  ref_product_id,
}: AddSellOrderFormProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const router = useRouter();

  const [orderState, setOrderState] = useState<OrderState>({
    transaction_id: "",
    transaction_type: TransactionType.TRANFER,
    warehouse: "คลังสินค้าหลัก",
    to_warehouse: "คลังสินค้าหลัก",
    notes: ""
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [validationError, setValidationError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [products, setProducts] = useState<Product[]>([
      { id: '', product_code: '', product_name: '', quantity: 0, price: 0, discount: 0, total: 0, unit_type: 'ชิ้น' }
    ]);
    

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (ref_product_id) {
        let leatest_product:any = await getProductBySKU(ref_product_id);
        setProducts([{
          id: leatest_product[0].id,
          product_code: leatest_product[0].sku,
          product_name: leatest_product[0].name,
          quantity: leatest_product[0].quantity ?? 0,
          price: leatest_product[0].price,
          discount: leatest_product[0].discount ?? 0,
          total: leatest_product[0].subtotal ?? 0,
          stock: leatest_product[0].stocks[orderState.warehouse] ?? 0,
          unit_type: leatest_product[0].unit_type,
        }])
      }

      await generateSKU();
      try {
        const warehouseData = await getProductWarehouse();
        setWarehouses(warehouseData);
      } catch (error) {
        setModalState({
          isOpen: true,
          title: ModalTitle.ERROR,
          message: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    };
    fetchData();
  }, []);

  const generateSKU = async (): Promise<void> => {
    try {
      const id = await generateRandomTransferTransactionId();
      setOrderState(prev => ({
        ...prev,
        transaction_id: id,
      }));
    } catch (error) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: `ไม่สามารถสร้างรายการได้: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setOrderState(prev => ({
      ...prev,
      [name]: value
    }));
    setValidationError("");
  };

  const handleProductsChange = (products: OrderItem[]): void => {
    setOrderItems(products);
  };

  const handleSave = async (): Promise<void> => {
    if(orderState.warehouse === orderState.to_warehouse) {
      setValidationError("ไม่สามารถโอนย้ายสินค้าภายในคลังเดียวกันได้")
      setModalState({
        isOpen: true,
        title: ModalTitle.WARNING,
        message: `ไม่สามารถโอนย้ายสินค้าภายในคลังเดียวกันได้`,
      });
      return;
    }

    if (!orderState.transaction_id.trim()) {
      setValidationError("กรุณากรอกรหัสรายการ");
      setModalState({
        isOpen: true,
        title: ModalTitle.WARNING,
        message: `กรุณากรอกรหัสรายการ`,
      });
      return;
    }
    
    if (!orderItems.length || orderItems.every(item => item.id === '')) {
      setValidationError("กรุณาเพิ่มสินค้าในรายการ");
      setModalState({
        isOpen: true,
        title: ModalTitle.WARNING,
        message: `กรุณาเพิ่มสินค้าในรายการ`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setValidationError("");

      await createTransferTransactionCompleted(
        orderState.transaction_id,
        orderItems.filter(item => item.id !== '').map(item => ({
          sku: item.product_code,
          quantity: item.quantity,
        })),
        orderState.warehouse,
        orderState.to_warehouse,
        orderState.notes,
        "admin",
        "admin"
      );

      // Reset form
      setOrderState({
        transaction_id: "",
        transaction_type: TransactionType.TRANFER,
        warehouse: "คลังสินค้าหลัก",
        to_warehouse: "คลังสินค้าหลัก",
        notes: "",
      });
      setOrderItems([]);

      generateSKU();

      if (trigger !== undefined && setTrigger !== undefined) {
        setTrigger(!trigger);
        }
        else{
            router.push("/products");
        }

    } catch (error) {
      setValidationError("เกิดข้อผิดพลาด: " + String(error));
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: `${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
     setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    await handleSave();
  };

  const closeModal = (): void => {
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
      <div className="p-4 rounded-lg shadow-lg mt-4  w-fit mx-auto bg-white dark:bg-zinc-800">
        <h1 className="text-xl font-semibold mb-4">เพิ่มรายการโอนสินค้า</h1>
        <form onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <h3 className="text-sm font-semibold mb-2">ข้อมูล</h3>
              <label className="block mb-1 text-sm">ประเภท</label>
              <input 
                type="text" 
                name="transaction_type" 
                placeholder="ประเภท" 
                value={'โอนสินค้า'} 
                disabled={true} 
                onChange={handleChange} 
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
              />
              <label className="block mb-1 text-sm">รายการ<span className="text-red-500">*</span></label> 
              <input 
                type="text" 
                name="transaction_id" 
                placeholder="รหัสรายการ" 
                value={orderState.transaction_id} 
                onChange={handleChange} 
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
              />
            </div>
            <div>
              <div className="text-sm font-semibold mb-2">ย้ายสินค้า<span className="text-red-500">*</span></div>
              <label className="block mb-1 text-sm">ออกจากคลังสินค้า</label>
              <select 
                  name="warehouse" 
                  value={orderState.warehouse} 
                  onChange={handleChange} 
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                >
                  <option value="" disabled>เลือกคลังสินค้า</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.warehouse_name} value={warehouse.warehouse_name}>
                      {warehouse.warehouse_name}
                    </option>
                  ))}
                </select>
              <label className="block mb-1 text-sm">ไปสู่คลังสินค้า<span className="text-red-500">*</span></label> 
              <select 
                  name="to_warehouse" 
                  value={orderState.to_warehouse} 
                  onChange={handleChange} 
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                >
                  <option value="" disabled>เลือกคลังสินค้า</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.warehouse_name} value={warehouse.warehouse_name}>
                      {warehouse.warehouse_name}
                    </option>
                  ))}
                </select>
            </div>
          </div>

          {/* ProductSection component */}
          <ProductSection 
            onProductsChange={handleProductsChange} 
            warehouseName={orderState.warehouse}
            products={products}
            setProducts={setProducts}
          />

          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="mb-4"> 
              <h3 className="text-sm font-semibold mb-2">หมายเหตุ</h3>
              <input 
                type="text" 
                name="notes" 
                placeholder="หมายเหตุ" 
                value={orderState.notes} 
                onChange={handleChange} 
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
              />
              </div>
            </div>
          </div>

          {validationError && <p className="text-red-500 text-sm mb-4">{validationError}</p>}
          <div className="flex justify-end space-x-2 mt-4">
            <button 
              type="submit" 
              className={`py-2 px-4 rounded-md text-white ${isSubmitting ? "bg-gray-500 cursor-not-allowed" : "bg-black hover:bg-gray-800"} transition`} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังโหลด..." : "ตกลง"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}