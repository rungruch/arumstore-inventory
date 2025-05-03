import { X } from 'lucide-react';

interface StockDetailsPopupProps {
  productName: string;
  productSKU: string;
  stocks: Record<string, number>;
  pendingStocks: Record<string, number>;
  onClose: () => void;
}

export default function StockDetailsPopup({ productName, productSKU, stocks, pendingStocks, onClose }: StockDetailsPopupProps) {
  return (
    <div 
      className="fixed inset-0 bg-[#00000066] dark:bg-[#00000099] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-zinc-800 rounded-lg p-6 w-[500px] relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-l font-bold mb-1">รายละเอียดสต็อก</h2>
        <h3 className="text-M font-bold mb-4">{productName} ({productSKU})</h3>

        <div className="bg-gray-100 dark:bg-zinc-900 rounded-t-lg">
          <div className="grid grid-cols-3 gap-2 p-2 font-semibold text-sm">
            <div>รหัส</div>
            <div>จำนวนคงเหลือ</div>
            <div>จำนวนพร้อมขาย</div>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Object.entries(stocks).map(([warehouse, amount]) => (
            <div key={warehouse} className="grid grid-cols-3 gap-2 p-2 text-sm">
              <div>{warehouse}</div>
              <div className={amount + (pendingStocks[warehouse] || 0) <= 0 
                ? 'text-red-500' 
                : amount + (pendingStocks[warehouse] || 0) < 5 
                  ? 'text-yellow-500' 
                  : 'text-green-500'
              }>{amount + (pendingStocks[warehouse] || 0)}</div>
              <div className={amount <= 0 
                ? 'text-red-500' 
                : amount < 5 
                  ? 'text-yellow-500' 
                  : 'text-green-500'
              }>{amount}</div>
            </div>
          ))}
        </div>

        <div className="border-t mt-1 pt-4 font-medium text-sm">
          <div className="grid grid-cols-3 gap-2">
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
      </div>
    </div>
  );
}
