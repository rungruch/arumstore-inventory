import { X } from 'lucide-react';
import { useState } from 'react';
import { generateRandomAdjustTransactionId, createAdjustStockTransaction } from '@/app/firebase/firestore';

interface StockDetailsPopupProps {
  productName: string;
  productSKU: string;
  stocks: Record<string, number>;
  pendingStocks: Record<string, number>;
  buyPrice: number;
  onClose: () => void;
  onUpdate: () => void; // Add this new prop
}

export default function StockDetailsPopup({ productName, productSKU, stocks, pendingStocks, buyPrice, onClose, onUpdate }: StockDetailsPopupProps) {
  const [adjustingWarehouse, setAdjustingWarehouse] = useState<string | null>(null);
  const [selectedWarehouseCurrentStock, setSelectedWarehouseCurrentStock] = useState(0);
  const [adjustPrice, setAdjustPrice] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState<string>('');
  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);

  const handleAdjustClick = (warehouse: string, currentStock: number) => {
    setSelectedWarehouseCurrentStock(currentStock);
    setAdjustingWarehouse(warehouse);
    setAdjustPrice(buyPrice);
  };

  return (
    <div 
      className="fixed inset-0 bg-[#00000066] dark:bg-[#00000099] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-[600px] relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          aria-label="ปิด"
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-l font-bold mb-1">รายละเอียดสต็อก</h2>
        <h3 className="text-M font-bold mb-4">{productName} ({productSKU})</h3>

        <div className="bg-gray-100 dark:bg-zinc-900 rounded-t-lg">
          <div className="grid grid-cols-4 gap-2 p-2 font-semibold text-sm">
            <div>คลังสินค้า</div>
            <div>จำนวนคงเหลือ</div>
            <div>จำนวนรอยืนยัน</div>
            <div></div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Object.entries(stocks).map(([warehouse, amount]) => (
            <div key={warehouse} className="grid grid-cols-4 gap-2 p-2 text-sm">
              <div>{warehouse}</div>
              <div className={amount <= 0 
                ? 'text-red-500' 
                : amount < 5 
                  ? 'text-yellow-500' 
                  : 'text-green-500'
              }>{amount}</div>
              <div className={pendingStocks[warehouse] > amount
                ? 'text-red-500' 
                : pendingStocks[warehouse] < amount
                  ? 'text-green-500'
                  : 'text-yellow-500' 
              }>{(pendingStocks[warehouse] || 0)}</div>
              <div>
                <div className="flex justify-center">
                  <button 
                    onClick={() => handleAdjustClick(warehouse, amount)}
                    className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 dark:bg-zinc-700 dark:hover:bg-zinc-900 text-white rounded-md transition-colors"
                  >
                    ปรับ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t mt-1 pt-4 font-medium text-sm">
          <div className="grid grid-cols-4 gap-2">
            <div>รวม</div>
            <div>
              {Object.values(stocks).reduce((a, b) => a + b, 0) + 
               Object.values(pendingStocks).reduce((a, b) => a + b, 0)} ตัว
            </div>
            <div>
              {Object.values(stocks).reduce((a, b) => a + b, 0)} ตัว
            </div>
          </div>
        </div>

        {adjustingWarehouse && (
          <div className="fixed inset-0 bg-[#00000066] dark:bg-[#00000099] flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-[600px]" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-4">ปรับจำนวนคงเหลือในคลัง</h3>
              <div><span className="font-bold">สินค้า:</span> {productName}</div>
              <div className="mb-2"><span className="font-bold">คลังสินค้า:</span> {adjustingWarehouse}</div>
              <div><span className="font-bold">จำนวนคงเหลือปัจจุบัน:</span> {selectedWarehouseCurrentStock}</div>
              <div className="mt-4">
                <label className="block mb-2 font-bold">
                  ปรับจำนวน
                </label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded mb-2 dark:border-gray-700"
                  min={0}
                  placeholder="จำนวนที่ต้องการปรับ"
                  value={adjustQuantity}
                  onChange={e => setAdjustQuantity(Number(e.target.value))}
                />
              </div>

              <div className="mt-4">
                <label className="block mb-2 font-bold">
                  ราคาซื้อใหม่
                </label>
                <input 
                  type="number"
                  className="w-full p-2 border rounded mb-2 dark:border-gray-700"
                  min={0}
                  placeholder="ราคาปรับ/หน่วย"
                  value={adjustPrice}
                  onChange={e => setAdjustPrice(Number(e.target.value))}
                />
                <textarea 
                  className="w-full p-2 border rounded mb-4 dark:border-gray-700"
                  placeholder="หมายเหตุ"
                  rows={3}
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                />
                <div className="flex justify-between items-center mb-4">
                  <p className="text-red-500 text-sm">
                    {adjustQuantity < 0 ? 'จำนวนต้องไม่ติดลบ' : ''}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => {
                      setAdjustingWarehouse(null);
                      setAdjustQuantity(0);
                      setAdjustPrice(0);
                      setAdjustNote('');
                    }}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-zinc-800 dark:hover:bg-zinc-900 dark:text-white text-gray-700"
                  >
                    ยกเลิก
                  </button>
                    <button 
                    onClick={async () => {
                      if (adjustingWarehouse === null || adjustQuantity < 0) {
                      alert('Failed to adjust stock. Please try again.');
                      return;
                      }
                      try {
                      await createAdjustStockTransaction(
                        await generateRandomAdjustTransactionId(),
                        { 
                        sku: productSKU, 
                        quantity: adjustQuantity,
                        newBuyPrice: adjustPrice
                        },
                        adjustingWarehouse || '',
                        adjustNote,
                        'system',
                        'system',
                      );
                      } catch (error) {
                      console.error('Failed to adjust stock:', error);
                      } finally {
                      onClose();
                      onUpdate(); // Replace window.location.reload() with this
                      }
                    
                    }}
                    className="px-4 py-2 text-white rounded bg-gray-800 hover:bg-gray-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 "
                    disabled={adjustQuantity < 0}
                    >
                    บันทึก
                    </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
