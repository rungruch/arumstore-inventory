"use client";
import { useState, useEffect } from "react";
import { getWallets, createWallet, updateWallet, deleteWallet } from "@/app/firebase/firestoreFinance";
import { WalletCollection } from "../interface";
import { wallet_type, wallet_type_display } from "../enum";
import { v4 as uuidv4 } from "uuid";
import ProtectedRoute from "@/components/ProtectedRoute";

const WalletPage = () => {
  const [wallets, setWallets] = useState<WalletCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddWalletModalOpen, setIsAddWalletModalOpen] = useState(false);
  const [isEditWalletModalOpen, setIsEditWalletModalOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletCollection | null>(null);
  
  const [newWallet, setNewWallet] = useState<WalletCollection>({
    wallet_id: "",
    wallet_name: "",
    wallet_type: wallet_type.NONE,
    bank_provider: "",
    bank_account: "",
    bank_account_name: "",
    total: 0,
  });

  const [error, setError] = useState<string | null>(null);

  // Fetch wallets on component mount
  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setIsLoading(true);
      const walletsData = await getWallets();
      setWallets(walletsData);
      setError(null);
    } catch (err) {
      setError("Failed to fetch wallets: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const walletId = await createWallet({
        ...newWallet,
        wallet_id: uuidv4(),
      });
      setNewWallet({
        wallet_id: "",
        wallet_name: "",
        wallet_type: wallet_type.NONE,
        bank_provider: "",
        bank_account: "",
        bank_account_name: "",
        total: 0
      });
      setIsAddWalletModalOpen(false);
      fetchWallets();
    } catch (err) {
      setError("Failed to add wallet: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWalletSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;
    
    try {
      setIsLoading(true);
      await updateWallet(selectedWallet.wallet_id, selectedWallet);
      setIsEditWalletModalOpen(false);
      fetchWallets();
    } catch (err) {
      setError("Failed to update wallet: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบกระเป๋าเงินนี้?")) {
      try {
        setIsLoading(true);
        await deleteWallet(walletId);
        fetchWallets();
      } catch (err) {
        setError("Failed to delete wallet: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const openEditWalletModal = (wallet: WalletCollection) => {
    setSelectedWallet(wallet);
    setIsEditWalletModalOpen(true);
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + (wallet.total || 0), 0);

  return (
    <ProtectedRoute module='finance' action="view">
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">กระเป๋าเงิน</h1>
        <button
          onClick={() => setIsAddWalletModalOpen(true)}
          className="mt-2 sm:mt-0 text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition w-[200px] sm:w-auto"
        >
          เพิ่มกระเป๋าเงิน
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">ยอดรวม</h2>
        <p className="text-3xl font-bold">฿{totalBalance.toLocaleString()}</p>
      </div>

      {isLoading ? (
        <div className="text-center py-4 animate-pulse flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
          <span className="ml-4 text-gray-500">กำลังโหลด...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => (
            <div key={wallet.wallet_id} className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700">
              <div className="p-4 border-b dark:border-zinc-700">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold dark:text-gray-200">{wallet.wallet_name}</h3>
                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-lg text-sm">
                    {wallet_type_display[wallet.wallet_type]}
                  </span>
                </div>
              </div>
              <div className="p-4 min-h-[120px]">
                {wallet.wallet_type !== wallet_type.CASH && (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {wallet.bank_provider}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {wallet.bank_account} - {wallet.bank_account_name}
                    </p>
                  </>
                )}
                <p className="text-xl font-semibold dark:text-gray-200">จำนวนเงินเหลือ: <span className={wallet.total > 0 ? 'text-green-600 dark:text-green-400' : wallet.total < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}>
                     {wallet.total?.toLocaleString() || 0}
                 </span></p>
                <p className="text-sm text-gray-600 dark:text-gray-400">อัพเดตล่าสุด: {wallet.updated_date?.toDate().toLocaleString() || "-"}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-zinc-800 flex justify-end space-x-2">
                <button
                  onClick={() => openEditWalletModal(wallet)}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDeleteWallet(wallet.wallet_id)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Wallet Modal */}
      {isAddWalletModalOpen && (
        <div className="fixed inset-0 bg-[#00000066] dark:bg-[#00000099] flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full max-w-md border border-gray-100 dark:border-zinc-700">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">เพิ่มกระเป๋าเงิน</h2>
            <form onSubmit={handleAddWalletSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ชื่อกระเป๋าเงิน
                </label>
                <input
                  type="text"
                  value={newWallet.wallet_name}
                  onChange={(e) => setNewWallet({ ...newWallet, wallet_name: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ประเภทกระเป๋าเงิน
                </label>
                <select
                  value={newWallet.wallet_type}
                  onChange={(e) => setNewWallet({ 
                    ...newWallet, 
                    wallet_type: e.target.value as wallet_type 
                  })}
                  className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                  required
                >
                  <option value={wallet_type.NONE}>{wallet_type_display.NONE}</option>
                  <option value={wallet_type.CASH}>{wallet_type_display.CASH}</option>
                  <option value={wallet_type.BANK}>{wallet_type_display.BANK}</option>
                  <option value={wallet_type.EWALLET}>{wallet_type_display.EWALLET}</option>
                  <option value={wallet_type.PROMTPAY}>{wallet_type_display.PROMTPAY}</option>
                </select>
              </div>
              
              {newWallet.wallet_type !== wallet_type.CASH && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ธนาคาร/ผู้ให้บริการ
                    </label>
                    <input
                      type="text"
                      value={newWallet.bank_provider}
                      onChange={(e) => setNewWallet({ ...newWallet, bank_provider: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                      required={newWallet.wallet_type as wallet_type !== wallet_type.CASH}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      เลขบัญชี
                    </label>
                    <input
                      type="text"
                      value={newWallet.bank_account}
                      onChange={(e) => setNewWallet({ ...newWallet, bank_account: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                      required={newWallet.wallet_type as wallet_type !== wallet_type.CASH}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ชื่อบัญชี
                    </label>
                    <input
                      type="text"
                      value={newWallet.bank_account_name}
                      onChange={(e) => setNewWallet({ ...newWallet, bank_account_name: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                      required={newWallet.wallet_type as wallet_type !== wallet_type.CASH}
                    />
                  </div>
                </>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ยอดเงิน
                </label>
                <input
                  type="number"
                  value={newWallet.total}
                  onChange={(e) => setNewWallet({ ...newWallet, total: Number(e.target.value) })}
                  className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddWalletModalOpen(false)}
                  className="px-4 py-2 border rounded-md dark:border-zinc-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  เพิ่ม
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Wallet Modal */}
      {isEditWalletModalOpen && selectedWallet && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-[#00000066] dark:bg-[#00000099]">
          <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-full max-w-md border border-gray-100 dark:border-zinc-700">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">แก้ไขกระเป๋าเงิน</h2>
            <form onSubmit={handleEditWalletSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ชื่อกระเป๋าเงิน
                </label>
                <input
                  type="text"
                  value={selectedWallet.wallet_name}
                  onChange={(e) => setSelectedWallet({ ...selectedWallet, wallet_name: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ประเภทกระเป๋าเงิน
                </label>
                <select
                  value={selectedWallet.wallet_type}
                  onChange={(e) => setSelectedWallet({ 
                    ...selectedWallet, 
                    wallet_type: e.target.value as wallet_type 
                  })}
                  className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                  required
                >
                  <option value={wallet_type.NONE}>{wallet_type_display.NONE}</option>
                  <option value={wallet_type.CASH}>{wallet_type_display.CASH}</option>
                  <option value={wallet_type.BANK}>{wallet_type_display.BANK}</option>
                  <option value={wallet_type.EWALLET}>{wallet_type_display.EWALLET}</option>
                  <option value={wallet_type.PROMTPAY}>{wallet_type_display.PROMTPAY}</option>
                </select>
              </div>
              
              {selectedWallet.wallet_type !== wallet_type.CASH && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ธนาคาร/ผู้ให้บริการ
                    </label>
                    <input
                      type="text"
                      value={selectedWallet.bank_provider}
                      onChange={(e) => setSelectedWallet({ ...selectedWallet, bank_provider: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                      required={selectedWallet.wallet_type as wallet_type !== wallet_type.CASH}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      เลขบัญชี
                    </label>
                    <input
                      type="text"
                      value={selectedWallet.bank_account}
                      onChange={(e) => setSelectedWallet({ ...selectedWallet, bank_account: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                      required={selectedWallet.wallet_type as wallet_type !== wallet_type.CASH}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ชื่อบัญชี
                    </label>
                    <input
                      type="text"
                      value={selectedWallet.bank_account_name}
                      onChange={(e) => setSelectedWallet({ ...selectedWallet, bank_account_name: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                      required={selectedWallet.wallet_type as wallet_type !== wallet_type.CASH}
                    />
                  </div>
                </>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ยอดเงิน
                </label>
                <input
                  type="number"
                  value={selectedWallet.total}
                  onChange={(e) => setSelectedWallet({ ...selectedWallet, total: Number(e.target.value) })}
                  className="w-full border rounded-md px-3 py-2 dark:bg-zinc-700 dark:text-white dark:border-zinc-600"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditWalletModalOpen(false)}
                  className="px-4 py-2 border rounded-md dark:border-zinc-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white rounded-md transition-colors duration-200 bg-black hover:bg-gray-800"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
  );
};

export default WalletPage;