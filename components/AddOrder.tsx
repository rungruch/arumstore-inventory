"use client";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { getProductByID, getSellTransactionByTransactionId, generateRandomSellTransactionId, getProductWarehouse, createSellTransactionv2, getContactsByName, getContactsPaginated, getSalesMethods, getShippingMethods } from "@/app/firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { Timestamp } from "firebase/firestore";
import { createContact } from "@/app/firebase/firestore";
import ProductSection from "./ProductSection";
import {VatType, TransactionType} from "@/app/firebase/enum";
import { OrderHistoryEntry, StatusChangeEntry } from "@/app/firebase/interfaces";
import { useAuth } from "@/app/contexts/AuthContext";
import { OrderStatus, ShippingStatus, PaymentStatus } from "@/app/firebase/enum";

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
  transaction_type: TransactionType;
  sell_method: string;
  vat_type: VatType;
  client_chat_name: string;
  client_name: string;
  client_id: string;
  client_tel: string;
  client_email: string;
  client_address: string;
  client_description: string;
  tax_id: string;
  branch_name: string;
  branch_id: string;
  warehouse: string;
  shipping_method: string;
  notes: string;
  shipping_cost: number;
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
}

interface AddSellOrderFormProps {
  trigger?: boolean;
  setTrigger?: React.Dispatch<React.SetStateAction<boolean>>;
  ref_transaction_id?: string | null;
}

interface FormattedOrderData extends OrderState {
  status: string;
  items: formOrderItem[];
  total_discount: number;
  total_amount: number;
  total_vat: number;
  total_amount_no_vat: number;
  payment_method: string;
  payment_status: string;
  shipping_status: string;
  created_by: string;
  updated_by: string;
  created_date: any;
  updated_date: any;
  status_history: StatusChangeEntry[];
  edit_history: OrderHistoryEntry[];
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

export default function AddSellOrderForm({
  trigger,
  setTrigger,
  ref_transaction_id,
}: AddSellOrderFormProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [salesMethods, setSalesMethods] = useState<Array<{value: string, label: string}>>([]);
  const [shippingMethods, setShippingMethods] = useState<Array<{value: string, label: string}>>([]);
  const router = useRouter();
  const { currentUser, hasPermission } = useAuth(); // Get the current user from AuthContext
  
  // Use user email for tracking who created and modified records
  const userEmail = currentUser?.email || "UNKNOW"; // Fallback to "admin" if user is not available
  const [orderState, setOrderState] = useState<OrderState>({
    transaction_id: "",
    transaction_type: TransactionType.SELL,
    sell_method: "",
    vat_type: VatType.VAT0,
    client_chat_name: "",
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
    shipping_method: "หน้าร้าน",
    notes: "",
    shipping_cost: 0
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [totalOrderAmount, setTotalOrderAmount] = useState<number>(0);
  const [totalVatAmount, setTotalVatAmount] = useState<number>(0);
  const [totalOrderAmountNoVat, setTotalOrderAmountNoVat] = useState<number>(0);
  const [totalDiscountAmount, setTotalDiscountAmount] = useState<number>(0);

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
        let transactionData:any = await getSellTransactionByTransactionId(ref_transaction_id);
        setOrderState(prev => ({
          ...prev,
          transaction_type: transactionData.transaction_type || "",
          sell_method: transactionData.sell_method || "",
          vat_type: transactionData.vat_type || "",
          client_name: transactionData.client_name || "",
          client_id: transactionData.client_id || "",
          client_tel: transactionData.client_tel || "",
          client_email: transactionData.client_email || "",
          client_address: transactionData.client_address || "",
          client_description: transactionData.client_description || "",
          tax_id: transactionData.tax_id || "",
          branch_name: transactionData.branch_name || "",
          branch_id: transactionData.branch_id || "",
          warehouse: transactionData.warehouse || "",
          shipping_method: transactionData.shipping_method || "",
          notes: transactionData.notes || "",
          shipping_cost: Number(transactionData.shipping_cost) || 0
        }));
        let transformedItemData = await transformItemData(transactionData.items);
        setProducts(transformedItemData)
      }

      await generateSKU();
      try {
        const warehouseData = await getProductWarehouse();
        setWarehouses(warehouseData);
        
        // Fetch sales methods from Firestore
        const methodsData = await getSalesMethods();
        setSalesMethods(methodsData);

        // Fetch shipping methods from Firestore
        const shippingMethodsData = await getShippingMethods();
        setShippingMethods(shippingMethodsData);
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
      if (!orderState.client_name.trim()) {
        setModalState({
          isOpen: true,
          title: ModalTitle.WARNING,
          message: "กรุณากรอกชื่อผู้ติดต่อ",
        });
        return;
      }
      try {
        const contact = {
          name: orderState.client_name,
          client_id: "",
          tax_reference: {
            tax_id: orderState.tax_id || "",
            branch_name: orderState.branch_name || "",
            branch_number: orderState.branch_id || ""
          },
          contact_info: {
            name: "",
            email: orderState.client_email || "",
            phone: orderState.client_tel || "",
            home_phone: "",
            fax: ""
          },
          social_media: {
            facebook: "",
            line: "",
            instagram: ""
          },
          address: orderState.client_address || "",
          group: "",
          notes: "",
          created_date: Timestamp.now(),
          updated_date: Timestamp.now()
        };
  
        let address  = await createContact(contact);

        setOrderState(prev => ({
          ...prev,
          client_id: address.client_id,
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
      const id = await generateRandomSellTransactionId();
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

  const handleClientNameChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setOrderState(prev => ({
      ...prev,
      client_name: value,
      client_id: "",
      client_tel: "",
      client_email: "",
      client_address: "",
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

  const handleClientNameClick = async () => {
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
      client_name: contact.name,
      client_id: contact.client_id,
      client_tel: contact.contact_info.phone,
      client_email: contact.contact_info.email,
      client_address: contact.address,
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
        product_name: leatest_product.name,
        quantity: item.quantity ?? 0,
        price: item.price,
        discount: item.discount ?? 0,
        total: item.subtotal ?? 0,
        stock: leatest_product.stocks[orderState.warehouse] ?? 0,
        unit_type: leatest_product.unit_type
      };
    }));
  }

  const handleProductsChange = (products: OrderItem[], totalAmount: number, totalAmountNoVat: number, vatAmount: number, totalDiscount: number = 0): void => {
    setOrderItems(products);
    setTotalOrderAmount(totalAmount);
    setTotalOrderAmountNoVat(totalAmountNoVat);
    setTotalVatAmount(vatAmount);
    setTotalDiscountAmount(totalDiscount);
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

    // Validation for total calculation
    const shippingCost = Number(orderState.shipping_cost);
    if (Math.abs((shippingCost + totalOrderAmountNoVat + totalVatAmount) - totalOrderAmount) > 1) {
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
      shipping_cost: Number(orderState.shipping_cost),
      status: OrderStatus.PENDING,
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
      total_discount: totalDiscountAmount,
      total_amount_no_vat: totalOrderAmountNoVat,
      total_vat: totalVatAmount,
      total_amount: totalOrderAmount,
      payment_method: "",
      payment_status: PaymentStatus.PENDING,
      shipping_status: ShippingStatus.PENDING,
      created_by: userEmail,
      updated_by: userEmail,
      created_date: Timestamp.now(),
      updated_date: Timestamp.now(),
      status_history: [
        {
          timestamp: Timestamp.now(),
          created_by: userEmail,
          status_type: 'order',
          old_status: OrderStatus.PENDING,
          new_status: OrderStatus.PENDING
        }
      ],
      edit_history: []
    };

      await createSellTransactionv2(formattedTransactionData);

      // Reset form
      setOrderState({
        transaction_id: "",
        transaction_type: TransactionType.SELL,
        sell_method: "",
        vat_type: VatType.VAT0,
        client_chat_name: "",
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
        shipping_method: "หน้าร้าน",
        notes: "",
        shipping_cost: 0
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
            router.push("/sales");
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
      if(orderState.client_id === ""){
        let contacts: any = await getContactsByName(orderState.client_name);
        let contactFiltered = contacts.filter((contact: Contact) => contact.name === orderState.client_name);
        if (contactFiltered.length === 0) {
          handleSaveContact();
        }
        else {
          setOrderState(prev => ({
            ...prev,
            client_id: contacts[0].client_id || "",
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
        <h1 className="text-xl font-semibold mb-4">เพิ่มรายการขาย</h1>
        <form onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700 bg-white dark:bg-zinc-800 shadow-md">
              <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">ข้อมูล</h3>
              <div className="relative mb-3">
                <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">ประเภท</label>
                <input 
                  type="text" 
                  name="transaction_type" 
                  placeholder="ประเภท" 
                  value={'สินค้าขายออก'} 
                  disabled={true} 
                  onChange={handleChange} 
                  className="w-full border p-2 pt-1 rounded-md text-sm bg-gray-100 dark:bg-zinc-700 dark:border-gray-700" 
                />
              </div>
              
              <div className="relative mb-3">
                <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">รายการ<span className="text-red-500">*</span></label> 
                <input 
                  type="text" 
                  name="transaction_id" 
                  placeholder="รหัสรายการ" 
                  disabled={true}
                  value={orderState.transaction_id} 
                  onChange={handleChange} 
                  className="w-full border p-2 pt-1 rounded-md text-sm bg-gray-100 dark:bg-zinc-700 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                />
              </div>
              
              <div className="relative mb-3">
                <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">ช่องทางการขาย<span className="text-red-500">*</span></label> 
                <select
                  name="sell_method"
                  value={orderState.sell_method}
                  onChange={handleChange}
                  required
                  className="w-full border p-2 pt-1 rounded-md text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">เลือกช่องทางการขาย</option>
                  {salesMethods.length > 0 ? (
                    salesMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))
                  ) : (
                    // Fallback options if no methods are available from Firestore
                    <>
                      <option value="ร้านค้า">ร้านค้า</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Line">Line</option>
                      <option value="เว็บไซต์">เว็บไซต์</option>
                      <option value="Instagram">Instagram</option>
                      <option value="อื่นๆ">อื่นๆ</option>
                    </>
                  )}
                </select>
              </div>

              <div className="relative mb-3">
                <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">ชื่อแชท</label> 
                <input 
                  type="text" 
                  name="client_chat_name" 
                  placeholder="ชื่อแชท" 
                  value={orderState.client_chat_name} 
                  onChange={handleChange} 
                  className="w-full border p-2 pt-1 rounded-md text-sm  dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                />
              </div>
              
              <div className="relative">
                <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">ประเภทภาษี</label> 
                <select
                  name="vat_type"
                  value={orderState.vat_type}
                  onChange={handleChange}
                  className="w-full border p-2 pt-1 rounded-md text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value={VatType.VAT0}>รวมภาษีมูลค่าเพิ่ม 7%</option>
                  <option value={VatType.VAT7}>แยกภาษีมูลค่าเพิ่ม 7%</option>
                  <option value={VatType.NO_VAT}>ไม่มีภาษีมูลค่าเพิ่ม</option>
                </select>
              </div>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg dark:border-gray-700 bg-white dark:bg-zinc-800 shadow-md">
              <h3 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">ข้อมูลลูกค้าจัดส่ง</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-md dark:border-gray-700 mb-3 ">
                <div className="relative">
                  <input 
                    type="text" 
                    name="client_name" 
                    placeholder="ชื่อ" 
                    value={orderState.client_name} 
                    onChange={handleClientNameChange}
                    onClick={handleClientNameClick}
                    className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                    autoComplete="off"
                    required
                  /> 
                  <span className="absolute right-3 top-2 text-red-500">*</span>
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
                      <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto dark:bg-zinc-800 animate-fadeIn">
                        {contactSuggestions.map((contact) => (
                          <div
                            key={contact.id}
                            className="p-2 hover:bg-gray-100 cursor-pointer dark:hover:bg-zinc-700 transition-colors"
                            onClick={() => handleContactSelect(contact)}
                          >
                            <div className="font-semibold">{contact.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{contact.tel}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <input 
                  type="text" 
                  name="client_id" 
                  placeholder="รหัสลูกค้า" 
                  value={orderState.client_id} 
                  onChange={handleChange} 
                  className="w-full border p-2 rounded-md mb-2 text-sm bg-gray-100 dark:bg-zinc-700 dark:border-gray-700" 
                  disabled={true}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">เบอร์โทร</label>
                  <input 
                    type="text" 
                    name="client_tel" 
                    value={orderState.client_tel} 
                    onChange={handleChange} 
                    className="w-full border p-2 pt-1 rounded-md mb-3 text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                  />
                </div>
                <div className="relative">
                  <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">อีเมล</label>
                  <input 
                    type="text" 
                    name="client_email" 
                    value={orderState.client_email} 
                    onChange={handleChange} 
                    className="w-full border p-2 pt-1 rounded-md mb-3 text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                  />
                </div>
              </div>
              <div className="relative mb-3">
                <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">ที่อยู่</label>
                <input 
                  type="text" 
                  name="client_address" 
                  value={orderState.client_address} 
                  onChange={handleChange} 
                  className="w-full border p-2 pt-1 rounded-md text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="relative">
                  <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">เลขประจำตัวผู้เสียภาษี</label>
                  <input 
                    type="text" 
                    name="tax_id" 
                    value={orderState.tax_id} 
                    onChange={handleChange} 
                    className="w-full border p-2 pt-1 rounded-md text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                  />
                </div>
                <div className="relative">
                  <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">ชื่อสาขา</label>
                  <input 
                    type="text" 
                    name="branch_name" 
                    value={orderState.branch_name} 
                    onChange={handleChange} 
                    className="w-full border p-2 pt-1 rounded-md text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                  />
                </div>
                <div className="relative">
                  <label className="absolute -top-2 left-2 text-xs bg-white dark:bg-zinc-800 px-1 text-gray-500 dark:text-gray-400">รหัสสาขา</label>
                  <input 
                    type="text" 
                    name="branch_id" 
                    value={orderState.branch_id} 
                    onChange={handleChange} 
                    className="w-full border p-2 pt-1 rounded-md text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
                  />
                </div>
              </div>

              {hasPermission('customers', 'create') ? (
                <button
                  type="button"
                  className={`w-fit h-fit p-2 px-4 text-sm rounded-md text-white ${
                    isCreateContactDisabled
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded text-sm transition-colors"
                  } transition-colors flex items-center gap-1 shadow-sm`}
                  disabled={isCreateContactDisabled}
                  onClick={handleSaveContact}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-person-plus" viewBox="0 0 16 16">
                    <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H1s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C9.516 10.68 8.289 10 6 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                    <path fillRule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5z"/>
                  </svg>
                  เพิ่มลูกค้า
                </button>
              ) : null}
            </div>
          </div>

          {/* ProductSection component */}
          <ProductSection 
            onProductsChange={handleProductsChange} 
            warehouseName={orderState.warehouse}
            vatType={orderState.vat_type}
            shippingCost={orderState.shipping_cost}
            products={products}
            setProducts={setProducts}
          />

          <div className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="mb-4"> 
              <h3 className="text-sm font-semibold mb-2">ช่องทางจัดส่ง</h3>
              <select
                  name="shipping_method"
                  value={orderState.shipping_method}
                  onChange={handleChange}
                  required
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                >
                  {shippingMethods.length > 0 ? (
                    shippingMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))
                  ) : (
                    // Fallback options if no methods are available from Firestore
                    <>
                      <option value={"หน้าร้าน"}>หน้าร้าน</option>
                      <option value={"ไปรษณีย์"}>ไปรษณีย์</option>
                    </>
                  )}
                </select>
              
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
                <h3 className="text-sm font-semibold mb-2">ออกจากคลังสินค้า</h3>
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
                <h3 className="text-sm font-semibold mb-2">ค่าส่ง</h3>
                <input 
                type="number" 
                inputMode="numeric"
                min="0" 
                required
                name="shipping_cost" 
                placeholder="ค่าส่ง" 
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                value={orderState.shipping_cost} 
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