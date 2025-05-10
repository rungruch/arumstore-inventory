"use client";
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { 
  getWallets, 
  generateRandomFinanceTransactionId, 
  createIncomeTransaction, 
  createExpenseTransaction 
} from "@/app/firebase/firestoreFinance";
import { getContactsByName, getContactsPaginated } from "@/app/firebase/firestore";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { Timestamp } from "firebase/firestore";
import { createContact } from "@/app/firebase/firestore";
import { 
  WalletCollection, 
  IncomeTransaction, 
  ExpenseTransaction,
  FinanceTransactionItem 
} from "@/app/finance/interface";
import { finance_transaction_type, payment_status } from "@/app/finance/enum";

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

interface TransactionState {
  transaction_id: string;
  transaction_type: finance_transaction_type;
  client_name: string;
  client_id: string;
  client_tel: string;
  client_email: string;
  client_address: string;
  branch_name: string;
  branch_id: string;
  tax_id: string;
  notes: string;
  payment_status: payment_status;
  wallet_id: string;
}

interface TransactionItem {
  name: string;
  type: string;
  amount: string;
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
}

interface AddFinanceTransactionProps {
  transactionType: finance_transaction_type;
  trigger?: boolean;
  setTrigger?: React.Dispatch<React.SetStateAction<boolean>>;
  ref_transaction_id?: string | null;
}

export default function AddFinanceTransaction({
  transactionType,
  trigger,
  setTrigger,
  ref_transaction_id,
}: AddFinanceTransactionProps) {
  const router = useRouter();
  const [wallets, setWallets] = useState<WalletCollection[]>([]);
  
  const [transactionState, setTransactionState] = useState<TransactionState>({
    transaction_id: "",
    transaction_type: transactionType,
    client_name: "",
    client_id: "",
    client_tel: "",
    client_email: "",
    client_address: "",
    branch_name: "",
    branch_id: "",
    tax_id: "",
    notes: "",
    payment_status: payment_status.PENDING,
    wallet_id: "",
  });

  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([
    { name: "", type: "", amount: "" }
  ]);
  
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [validationError, setValidationError] = useState<string>("");
  const [isCreateContactDisabled, setIsCreateContactDisabled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
  });

  const [contactSuggestions, setContactSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      try {
        // Generate transaction ID
        await generateTransactionId();
        
        // Fetch wallets
        const walletData = await getWallets();
        setWallets(walletData);
        
        // Set default wallet if available
        if (walletData.length > 0) {
          setTransactionState(prev => ({
            ...prev,
            wallet_id: walletData[0].wallet_id
          }));
        }
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

  // Effect for calculating total amount
  useEffect(() => {
    const total = transactionItems.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
    setTotalAmount(total);
  }, [transactionItems]);

  const generateTransactionId = async (): Promise<void> => {
    try {
      const id = await generateRandomFinanceTransactionId();
      setTransactionState(prev => ({
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setTransactionState(prev => ({
      ...prev,
      [name]: value
    }));
    setValidationError("");
  };

  const handleClientNameChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTransactionState(prev => ({
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
    setIsCreateContactDisabled(false);

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

  const handleContactSelect = (contact: any) => {
    setTransactionState(prev => ({
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
    setIsCreateContactDisabled(true);
  };

  const handleSaveContact = async () => {
    try {
      const contact = {
        name: transactionState.client_name,
        client_id: "",
        tax_reference: {
          tax_id: transactionState.tax_id || "",
          branch_name: transactionState.branch_name || "",
          branch_number: transactionState.branch_id || ""
        },
        contact_info: {
          name: "",
          email: transactionState.client_email || "",
          phone: transactionState.client_tel || "",
          home_phone: "",
          fax: ""
        },
        social_media: {
          facebook: "",
          line: "",
          instagram: ""
        },
        address: transactionState.client_address || "",
        group: "",
        notes: "",
        created_date: Timestamp.now(),
        updated_date: Timestamp.now()
      };

      let address = await createContact(contact);

      setTransactionState(prev => ({
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

  const handleItemChange = (index: number, field: keyof TransactionItem, value: string) => {
    const updatedItems = [...transactionItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setTransactionItems(updatedItems);
  };

  const addTransactionItem = () => {
    setTransactionItems([...transactionItems, { name: "", type: "", amount: "" }]);
  };

  const removeTransactionItem = (index: number) => {
    if (transactionItems.length > 1) {
      const updatedItems = transactionItems.filter((_, i) => i !== index);
      setTransactionItems(updatedItems);
    }
  };

  const handleSave = async (): Promise<void> => {
    // Validation
    if (!transactionState.transaction_id.trim()) {
      setValidationError("กรุณากรอกรหัสรายการ");
      setModalState({
        isOpen: true,
        title: ModalTitle.WARNING,
        message: `กรุณากรอกรหัสรายการ`,
      });
      return;
    }

    // Validate items
    const validItems = transactionItems.filter(
      item => item.name.trim() !== "" && parseFloat(item.amount) > 0
    );
    
    if (validItems.length === 0) {
      setValidationError("กรุณาเพิ่มรายการอย่างน้อย 1 รายการ และกรอกข้อมูลให้ครบถ้วน");
      setModalState({
        isOpen: true,
        title: ModalTitle.WARNING,
        message: `กรุณาเพิ่มรายการอย่างน้อย 1 รายการ และกรอกข้อมูลให้ครบถ้วน`,
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setValidationError("");

      // Format transaction data
      const formattedItems: FinanceTransactionItem[] = validItems.map(item => ({
        name: item.name,
        type: item.type,
        amount: item.amount
      }));

      // Create payment details if status is COMPLETED
      const paymentDetails = transactionState.payment_status === payment_status.COMPLETED ? {
        payment_method: "โอนเงิน",
        payment_date: Timestamp.now(),
        wallet_id: transactionState.wallet_id,
        wallet_name: wallets.find(wallet => wallet.wallet_id === transactionState.wallet_id)?.wallet_name || "",
        payment_amount: totalAmount
      } : {
        payment_method: "",
        payment_date: Timestamp.now(),
        wallet_id: "",
        wallet_name: "",
        payment_amount: 0
      };
      
      if (transactionState.transaction_type === finance_transaction_type.INCOME) {
        const incomeData: IncomeTransaction = {
          transaction_id: transactionState.transaction_id,
          transaction_type: finance_transaction_type.INCOME,
          client_name: transactionState.client_name,
          client_address: transactionState.client_address,
          branch_name: transactionState.branch_name,
          branch_id: transactionState.branch_id,
          tax_id: transactionState.tax_id,
          client_tel: transactionState.client_tel,
          client_email: transactionState.client_email,
          items: formattedItems,
          total_amount: totalAmount,
          total_amount_no_vat: totalAmount,
          total_vat: 0,
          notes: transactionState.notes,
          payment_status: transactionState.payment_status,
          payment_deatils: paymentDetails,
          created_date: Timestamp.now(),
          updated_date: Timestamp.now()
        };
        
        await createIncomeTransaction(incomeData);
      } else {
        const expenseData: ExpenseTransaction = {
          transaction_id: transactionState.transaction_id,
          transaction_type: finance_transaction_type.EXPENSE,
          client_name: transactionState.client_name,
          client_address: transactionState.client_address,
          branch_name: transactionState.branch_name,
          branch_id: transactionState.branch_id,
          tax_id: transactionState.tax_id,
          client_tel: transactionState.client_tel,
          client_email: transactionState.client_email,
          items: formattedItems,
          total_amount: totalAmount,
          total_amount_no_vat: totalAmount,
          total_vat: 0,
          notes: transactionState.notes,
          payment_status: transactionState.payment_status,
          payment_deatils: paymentDetails,
          created_date: Timestamp.now(),
          updated_date: Timestamp.now()
        };
        
        await createExpenseTransaction(expenseData);
      }

      // Reset form
      setTransactionState({
        transaction_id: "",
        transaction_type: transactionType,
        client_name: "",
        client_id: "",
        client_tel: "",
        client_email: "",
        client_address: "",
        branch_name: "",
        branch_id: "",
        tax_id: "",
        notes: "",
        payment_status: payment_status.PENDING,
        wallet_id: wallets.length > 0 ? wallets[0].wallet_id : "",
      });
      
      setTransactionItems([{ name: "", type: "", amount: "" }]);
      setTotalAmount(0);

      // Generate new transaction ID
      await generateTransactionId();

      // Redirect or trigger refresh
      if (trigger !== undefined && setTrigger !== undefined) {
        setTrigger(!trigger);
      } else {
        const redirectPath = transactionType === finance_transaction_type.INCOME 
          ? "/finance/other-income" 
          : "/finance/other-outcome";
        router.push(redirectPath);
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
      if (transactionState.client_name && transactionState.client_id === "") {
        let contacts: any = await getContactsByName(transactionState.client_name);
        let contactFiltered = contacts.filter((contact: Contact) => contact.name === transactionState.client_name);
        if (contactFiltered.length === 0) {
          await handleSaveContact();
        } else {
          setTransactionState(prev => ({
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
        <h1 className="text-xl font-semibold mb-4">
          {transactionState.transaction_type === finance_transaction_type.INCOME ? "เพิ่มรายรับอื่นๆ" : "เพิ่มรายจ่ายอื่นๆ"}
        </h1>
        <form onSubmit={handleFormSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">ข้อมูลรายการ</h3>
              <label className="block mb-1 text-sm">ประเภทรายการ</label>
              <input
                type="text"
                placeholder="ประเภทรายการ"
                value={transactionState.transaction_type === finance_transaction_type.INCOME ? "รายรับอื่นๆ" : "รายจ่ายอื่นๆ"}
                disabled
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
              />
              <label className="block mb-1 text-sm">รหัสรายการ<span className="text-red-500">*</span></label>
              <input
                type="text"
                name="transaction_id"
                placeholder="รหัสรายการ"
                value={transactionState.transaction_id}
                onChange={handleChange}
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
              />
              <label className="block mb-1 text-sm">สถานะการชำระเงิน</label>
              <select
                name="payment_status"
                value={transactionState.payment_status}
                onChange={handleChange}
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
              >
                <option value={payment_status.PENDING}>รอดำเนินการ</option>
                <option value={payment_status.COMPLETED}>เสร็จสมบูรณ์</option>
                <option value={payment_status.CANCELLED}>ยกเลิก</option>
              </select>
              
              {transactionState.payment_status === payment_status.COMPLETED && (
                <>
                  <label className="block mb-1 text-sm">กระเป๋าเงิน<span className="text-red-500">*</span></label>
                  <select
                    name="wallet_id"
                    value={transactionState.wallet_id}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                    required
                  >
                    <option value="">เลือกกระเป๋าเงิน</option>
                    {wallets.map((wallet) => (
                      <option key={wallet.wallet_id} value={wallet.wallet_id}>
                        {wallet.wallet_name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-semibold mb-2">ข้อมูลผู้ติดต่อ</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    name="client_name"
                    placeholder="ชื่อ"
                    value={transactionState.client_name}
                    onChange={handleClientNameChange}
                    onClick={handleClientNameClick}
                    className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                    autoComplete="off"
                  />
                  <div ref={(node) => {
                    const handleClickOutside = (e: MouseEvent) => {
                      if (node && !node.contains(e.target as Node)) {
                        setShowSuggestions(false);
                      }
                    };
                    
                    if (node) {
                      document.addEventListener('mousedown', handleClickOutside);
                    }
                    
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
                  name="client_id"
                  placeholder="รหัสลูกค้า"
                  value={transactionState.client_id}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                  disabled
                />
                <button
                  type="button"
                  className={`w-fit h-fit p-2 text-sm rounded-md text-white ${
                    isCreateContactDisabled || !transactionState.client_name
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-black hover:bg-gray-800"
                  } transition`}
                  disabled={isCreateContactDisabled || !transactionState.client_name}
                  onClick={handleSaveContact}
                >
                  เพิ่มผู้ติดต่อ
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  name="client_tel"
                  placeholder="เบอร์โทร"
                  value={transactionState.client_tel}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                />
                <input
                  type="text"
                  name="client_email"
                  placeholder="อีเมล"
                  value={transactionState.client_email}
                  onChange={handleChange}
                  className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                />
              </div>
              <input
                type="text"
                name="client_address"
                placeholder="ที่อยู่"
                value={transactionState.client_address}
                onChange={handleChange}
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
              />
              <label className="block mb-1 text-sm">เลขประจำตัวผู้เสียภาษี</label>
              <input
                type="text"
                name="tax_id"
                placeholder="เลขประจำตัวผู้เสียภาษี"
                value={transactionState.tax_id}
                onChange={handleChange}
                className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-sm">ชื่อสาขา</label>
                  <input
                    type="text"
                    name="branch_name"
                    placeholder="ชื่อสาขา"
                    value={transactionState.branch_name}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm">รหัสสาขา</label>
                  <input
                    type="text"
                    name="branch_id"
                    placeholder="รหัสสาขา"
                    value={transactionState.branch_id}
                    onChange={handleChange}
                    className="w-full border p-2 rounded-md mb-2 text-sm dark:border-gray-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Items Section */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">รายการ</h3>
            <div className="bg-gray-50 p-4 rounded-md dark:bg-zinc-700">
              <div className="grid grid-cols-12 gap-2 font-semibold mb-2 text-sm">
                <div className="col-span-5">รายการ</div>
                <div className="col-span-3">ประเภท</div>
                <div className="col-span-3">จำนวนเงิน</div>
                <div className="col-span-1"></div>
              </div>
              
              {transactionItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="ชื่อรายการ"
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      className="w-full border p-2 rounded-md text-sm dark:border-gray-700 dark:bg-zinc-600"
                      required
                    />
                  </div>
                    <div className="col-span-3">
                    <input
                      type="text"
                      placeholder="ประเภท"
                      value={item.type}
                      onChange={(e) => handleItemChange(index, 'type', e.target.value)}
                      className="w-full border p-2 rounded-md text-sm dark:border-gray-700 dark:bg-zinc-600"
                      list={`type-options-${index}`}
                    />
                    <datalist id={`type-options-${index}`}>
                      <option value="ค่าบริการ" />
                      <option value="ค่าเดินทาง" />
                      <option value="ค่าอาหาร" />
                      <option value="ค่าอุปกรณ์" />
                      <option value="อื่นๆ" />
                    </datalist>
                    </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      placeholder="จำนวนเงิน"
                      value={item.amount}
                      onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                      className="w-full border p-2 rounded-md text-sm dark:border-gray-700 dark:bg-zinc-600"
                      min="0"
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      required
                    />
                  </div>
                  <div className="col-span-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => removeTransactionItem(index)}
                      className="text-red-600 hover:text-red-800"
                      disabled={transactionItems.length <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addTransactionItem}
                className="mt-2 px-3 py-1 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300 dark:bg-zinc-600 dark:text-gray-200 dark:hover:bg-zinc-500"
              >
                + เพิ่มรายการ
              </button>
            </div>
          </div>

          {/* Summary Section */}
          <div className="mt-6 flex flex-col items-end">
            <div className="bg-gray-50 p-4 rounded-md w-full md:w-1/3 dark:bg-zinc-700">
              <div className="flex justify-between mb-2">
                <span className="font-semibold">ยอดรวม:</span>
                <span>{totalAmount.toLocaleString()} บาท</span>
              </div>
            </div>
          </div>

          {/* Notes Section */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">หมายเหตุ</h3>
            <textarea
              name="notes"
              placeholder="หมายเหตุ"
              value={transactionState.notes}
              onChange={handleChange}
              className="w-full border p-2 rounded-md text-sm dark:border-gray-700"
              rows={3}
            ></textarea>
          </div>

          {validationError && <p className="text-red-500 text-sm mt-4">{validationError}</p>}
          
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="submit"
              className={`py-2 px-4 rounded-md text-white ${isSubmitting ? "bg-gray-500 cursor-not-allowed" : "bg-black hover:bg-gray-800"} transition`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "กำลังโหลด..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}