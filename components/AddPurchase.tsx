"use client";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { getProductByID, getProductWarehouse, getContactsByName, getContactsPaginated } from "@/app/firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { Timestamp } from "firebase/firestore";
import { createContact } from "@/app/firebase/firestore";
import PurchaseProductSection from "./ProductSectionPurchase";
import {VatType, TransactionType, PurchaseStatus} from "@/app/firebase/enum";
import { getPurchaseTransactionByTransactionId, createPurchaseTransactionWithStockAddition, generateRandomBuyTransactionId } from "@/app/firebase/firestoreBuy";

// Define types for the component
interface Warehouse {
  [key: string]: any;
}

interface OrderItem {
  [key: string]: any;
}

interface formOrderItem {
    name: string;
    sku: string;
    quantity: number;
    initial_quantity: number;
    price: number;
    discount: number;
    subtotal: number;
    warehouse_id: string;  
    unit_type: string;
}

interface OrderState {
  transaction_id: string;
  transaction_type: string;
  buy_method: string;
  vat_type: any;
  supplier_name: string;
  supplier_id: string;
  supplier_tel: string;
  supplier_email: string;
  supplier_address: string;
  supplier_description: string;
  tax_id: string;
  branch_name: string;
  branch_id: string;
  warehouse: string;
  notes: string;
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
}

interface AddPurchaseFormProps {
  trigger?: boolean;
  setTrigger?: React.Dispatch<React.SetStateAction<boolean>>;
  ref_transaction_id?: string | null;
}

interface FormattedOrderData extends OrderState {
  status: string;
  items: formOrderItem[];
  total_amount: number;
  total_vat: number;
  total_amount_no_vat: number;
  payment_method: string;
  payment_status: string;
  created_by: string;
  updated_by: string;
  created_date: any; // Using any for Firestore Timestamp
  updated_date: any;
}

interface Contact {
  id: string;
  name: string;
  client_id: string;
  tel: string;
  email: string;
  address: string;
  tax_id: string;
  branch_name: string;
  branch_id: string;
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

export default function AddPurchaseForm({
  trigger,
  setTrigger,
  ref_transaction_id,
}: AddPurchaseFormProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const router = useRouter();

  const [orderState, setOrderState] = useState<OrderState>({
    transaction_id: "",
    transaction_type: TransactionType.BUY,
    buy_method: "",
    vat_type: VatType.VAT0,
    supplier_name: "",
    supplier_id: "",
    supplier_tel: "",
    supplier_email: "",
    supplier_address: "",
    supplier_description: "",
    tax_id: "",
    branch_name: "",
    branch_id: "",
    warehouse: "คลังสินค้าหลัก",
    notes: ""
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [totalOrderAmount, setTotalOrderAmount] = useState<number>(0);
  const [totalVatAmount, setTotalVatAmount] = useState<number>(0);
  const [totalOrderAmountNoVat, setTotalOrderAmountNoVat] = useState<number>(0);

  const [validationError, setValidationError] = useState<string>("");
  const [isCreateContactDisabled, setisCreateContactDisabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [products, setProducts] = useState<Product[]>([
      { id: '', product_code: '', product_name: '', quantity: 0, price: 0, discount: 0, total: 0, unit_type: 'ชิ้น' }
    ]);
    

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (ref_transaction_id) {
        let transactionData:any = await getPurchaseTransactionByTransactionId(ref_transaction_id);
        setOrderState(prev => ({
          ...prev,
          transaction_type: transactionData.transaction_type || "",
          buy_method: transactionData.buy_method || "",
          vat_type: transactionData.vat_type || "",
          supplier_name: transactionData.supplier_name || "",
          supplier_id: transactionData.supplier_id || "",
          supplier_tel: transactionData.supplier_tel || "",
          supplier_email: transactionData.supplier_email || "",
          supplier_address: transactionData.supplier_address || "",
          supplier_description: transactionData.supplier_description || "",
          tax_id: transactionData.tax_id || "",
          branch_name: transactionData.branch_name || "",
          branch_id: transactionData.branch_id || "",
          warehouse: transactionData.warehouse || "",
          notes: transactionData.notes || ""
        }));
        let transformedItemData = await transformItemData(transactionData.items);
        setProducts(transformedItemData)
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

    const handleSaveContact = async () => {
      try {
        const contact = {
          name: orderState.supplier_name,
          client_id: "",
          tax_reference: {
            tax_id: orderState.tax_id || "",
            branch_name: orderState.branch_name || "",
            branch_number: orderState.branch_id || ""
          },
          contact_info: {
            name: "",
            email: orderState.supplier_email || "",
            phone: orderState.supplier_tel || "",
            home_phone: "",
            fax: ""
          },
          social_media: {
            facebook: "",
            line: "",
            instagram: ""
          },
          address: orderState.supplier_address || "",
          group: "",
          notes: "",
          created_date: Timestamp.now(),
          updated_date: Timestamp.now()
        };
  
        let address = await createContact(contact);

        setOrderState(prev => ({
          ...prev,
          supplier_id: address.client_id,
        }));

      } catch (error) {
        setModalState({
          isOpen: true,
          title: ModalTitle.ERROR,
          message: `ไม่สามารถสร้างผู้ติดต่อได้: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    };

  const generateSKU = async (): Promise<void> => {
    try {
      const id = await generateRandomBuyTransactionId();
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

  const handleSupplierNameChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setOrderState(prev => ({
      ...prev,
      supplier_name: value,
      supplier_id: "",
      supplier_tel: "",
      supplier_email: "",
      supplier_address: "",
      tax_id: "",
      branch_name: "",
      branch_id: ""
    }));
    setisCreateContactDisabled(false);

    if (value.length >= 2) {
      try {
        const contacts = await getContactsByName(value);
        setContactSuggestions(contacts);
        setShowSuggestions(true);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    } else {
      setContactSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSupplierNameClick = async () => {
    try {
      const { contacts } = await getContactsPaginated(null, 50);  // Get first page of contacts
      setContactSuggestions(contacts);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const handleContactSelect = (contact : any) => {
    setOrderState(prev => ({
      ...prev,
      supplier_name: contact.name,
      supplier_id: contact.client_id,
      supplier_tel: contact.contact_info.phone,
      supplier_email: contact.contact_info.email,
      supplier_address: contact.address,
      tax_id: contact.tax_reference.tax_id,
      branch_name: contact.tax_reference.branch_name,
      branch_id: contact.tax_reference.branch_number
    }));
    setShowSuggestions(false);
    setisCreateContactDisabled(true);
  };

  async function transformItemData(originalData: any[]): Promise<Product[]> {
    return Promise.all(originalData.map(async item => {
      let leatest_product:any = await getProductByID(item.sku);
      return {
        id: item.sku,
        product_code: item.sku,
        product_name: leatest_product[0].name,
        quantity: item.quantity ?? 0,
        price: item.price,
        discount: item.discount ?? 0,
        total: item.subtotal ?? 0,
        stock: leatest_product[0].stocks[orderState.warehouse] ?? 0,
        unit_type: leatest_product[0].unit_type
      };
    }));
  }

  const handleProductsChange = (products: OrderItem[], totalAmount: number, totalAmountNoVat: number, vatAmount: number): void => {
    setOrderItems(products);
    setTotalOrderAmount(totalAmount);
    setTotalOrderAmountNoVat(totalAmountNoVat);
    setTotalVatAmount(vatAmount);
  };

  const handleSave = async (): Promise<void> => {
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

    if (Math.abs((totalOrderAmountNoVat + totalVatAmount) - totalOrderAmount) > 1) {
      setValidationError("ยอดรวมไม่ถูกต้อง กรุณาลองอีกครั้ง");
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: "ยอดรวมไม่ถูกต้อง กรุณาลองอีกครั้ง",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setValidationError("");

    const formattedTransactionData: FormattedOrderData = {
        ...orderState,
        status: PurchaseStatus.COMPLETED,
        items: orderItems.filter(item => item.id !== '').map(item => ({
            name: item.product_name,
            sku: item.product_code,
            quantity: item.quantity,
            unit_type: item.unit_type,
            initial_quantity: item.stock,
            price: item.price,
            discount: item.discount,
            subtotal: item.total,
            warehouse_id: orderState.warehouse
        })),
        total_amount_no_vat: totalOrderAmountNoVat,
        total_vat: totalVatAmount,
        total_amount: totalOrderAmount,
        payment_method: "",
        payment_status: "",
        created_by: "admin",
        updated_by: "admin",
        created_date: Timestamp.now(),
        updated_date: Timestamp.now(),
      };

      await createPurchaseTransactionWithStockAddition(formattedTransactionData);

      // Reset form
      setOrderState({
        transaction_id: "",
        transaction_type: TransactionType.BUY,
        vat_type: VatType.VAT0,
        buy_method: "",
        supplier_name: "",
        supplier_id: "",
        supplier_tel: "",
        supplier_email: "",
        supplier_address: "",
        supplier_description: "",
        tax_id: "",
        branch_name: "",
        branch_id: "",
        warehouse: "คลังสินค้าหลัก",
        notes: "",
      });
      setOrderItems([]);
      setTotalOrderAmount(0);
      setTotalVatAmount(0);
      setTotalOrderAmountNoVat(0);

      generateSKU();

      if (trigger !== undefined && setTrigger !== undefined) {
        setTrigger(!trigger);
        }
        else{
            router.push("/purchases");
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
    try {
      if(orderState.supplier_id === ""){
        let contacts: any = await getContactsByName(orderState.supplier_name);
        let contactFiltered = contacts.filter((contact: Contact) => contact.name === orderState.supplier_name);
        if (contactFiltered.length === 0) {
          handleSaveContact();
        }
        else {
          setOrderState(prev => ({
            ...prev,
            supplier_id: contacts[0].client_id || "",
          }));
        }
      }
    } catch (error) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: `${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      await handleSave();
    }
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
      <div className="p-4 rounded-lg shadow-lg w-full mx-auto bg-white dark:bg-zinc-800">
        <h1 className="text-xl font-semibold mb-4">เพิ่มรายการซื้อ</h1>
        <form onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <h3 className="text-sm font-semibold mb-2">ข้อมูล</h3>
              <label className="block mb-1 text-sm">ประเภท</label>
              <input 
                type="text" 
                name="transaction_type" 
                placeholder="ประเภท" 
                value={'สินค้าซื้อเข้า'} 
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
              <label className="block mb-1 text-sm">ช่องทางการซื้อ</label> 
              <select
                name="sell_method"
                value={orderState.buy_method}
                onChange={handleChange}
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
              >
                <option value="">เลือกช่องทางการขาย</option>
                <option value="STORE">ร้านค้า</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="LINE">Line</option>
                <option value="WEBSITE">เว็บไซต์</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="Others">อื่นๆ</option>
              </select>
              <label className="block mb-1 text-sm">ประเภทภาษี</label> 
              <select
                name="vat_type"
                value={orderState.vat_type}
                onChange={handleChange}
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
              >
                <option value={VatType.VAT0}>รวมภาษีมูลค่าเพิ่ม 7%</option>
                <option value={VatType.VAT7}>แยกภาษีมูลค่าเพิ่ม 7%</option>
                <option value={VatType.NO_VAT}>ไม่มีภาษีมูลค่าเพิ่ม</option>
              </select>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">ข้อมูลผู้จำหน่าย</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <input 
                    type="text" 
                    name="supplier_name" 
                    placeholder="ชื่อ*" 
                    value={orderState.supplier_name} 
                    onChange={(e) => {
                      const { value } = e.target;
                      setOrderState(prev => ({
                        ...prev,
                        supplier_name: value,
                        supplier_id: "",
                        supplier_tel: "",
                        supplier_email: "",
                        supplier_address: "",
                        tax_id: "",
                        branch_name: "",
                        branch_id: ""
                      }));
                      setisCreateContactDisabled(false);

                      if (value.length >= 2) {
                        try {
                          getContactsByName(value).then(contacts => {
                            setContactSuggestions(contacts);
                            setShowSuggestions(true);
                          });
                        } catch (error) {
                          console.error("Error fetching contacts:", error);
                        }
                      } else {
                        setContactSuggestions([]);
                        setShowSuggestions(false);
                      }
                    }}
                    onClick={handleSupplierNameClick}
                    className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
                    autoComplete="off"
                    required
                  /> 
                    <div ref={(node) => {
                    // Add click outside handler
                    const handleClickOutside = (e: MouseEvent) => {
                      if (node && !node.contains(e.target as Node)) {
                      setShowSuggestions(false);
                      }
                    };
                    
                    if (node) {
                      document.addEventListener('mousedown', handleClickOutside);
                    }
                    
                    // Cleanup
                    return () => {
                      document.removeEventListener('mousedown', handleClickOutside);
                    };
                    }}>
                    {showSuggestions && contactSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto dark:bg-zinc-800">
                      {contactSuggestions.map((contact) => (
                        <div
                        key={contact.id}
                        className="p-2 hover:bg-gray-100 cursor-pointer dark:hover:bg-zinc-700"
                        onClick={() => handleContactSelect(contact)}
                        >
                        <div className="font-semibold">{contact.name}</div>
                        <div className="text-sm text-gray-600">{contact.tel}</div>
                        </div>
                      ))}
                      </div>
                    )}
                    </div>
                </div>
                <input 
                  type="text" 
                  name="supplier_id" 
                  placeholder="รหัสผู้จำหน่าย" 
                  value={orderState.supplier_id} 
                  onChange={handleChange} 
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
                  disabled={true}
                />
                <button
                  type="button"
                  className={`w-fit h-fit p-2 text-sm rounded-md text-white ${
                    isCreateContactDisabled
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-black hover:bg-gray-800"
                  } transition`}
                  disabled={isCreateContactDisabled}
                  onClick={handleSaveContact}
                >
                  เพิ่มผู้จำหน่าย
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input 
                  type="text" 
                  name="supplier_tel" 
                  placeholder="เบอร์โทร" 
                  value={orderState.supplier_tel} 
                  onChange={handleChange} 
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
                />
                <input 
                  type="text" 
                  name="supplier_email" 
                  placeholder="อีเมล" 
                  value={orderState.supplier_email} 
                  onChange={handleChange} 
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
                />
              </div>
              <input 
                type="text" 
                name="supplier_address" 
                placeholder="ที่อยู่" 
                value={orderState.supplier_address} 
                onChange={handleChange} 
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
              />
              <label className="block mb-1 text-sm">เลขประจำตัวผู้เสียภาษี</label>
              <input 
                type="text" 
                name="tax_id" 
                placeholder="เลขประจำตัวผู้เสียภาษี" 
                value={orderState.tax_id} 
                onChange={handleChange} 
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
              />
              <label className="block mb-1 text-sm">ชื่อสาขา</label>
              <input 
                type="text" 
                name="branch_name" 
                placeholder="ชื่อสาขา" 
                value={orderState.branch_name} 
                onChange={handleChange} 
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
              />
              <label className="block mb-1 text-sm">รหัสสาขา</label>
              <input 
                type="text" 
                name="branch_id" 
                placeholder="รหัสสาขา" 
                value={orderState.branch_id} 
                onChange={handleChange} 
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700" 
              />
            </div>
          </div>

          {/* ProductSection component */}
          <PurchaseProductSection 
            onProductsChange={handleProductsChange} 
            warehouseName={orderState.warehouse}
            vatType={orderState.vat_type}
            shippingCost={0}
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
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2">เพิ่มเข้าคลังสินค้า</h3>
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