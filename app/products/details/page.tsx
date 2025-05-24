"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProductByID, deleteProductById } from "@/app/firebase/firestore";
import { getMonthlyIncomeByDateSku, getProductPeriodMonthlyIncomeSummarybySku, getMonthlyProductTransactions } from '@/app/firebase/firestoreStats';
import Image from "next/image";
import { Products } from "@/app/firebase/interfaces";
import { ArrowLeft, BarChart2, PieChart, Settings, Circle, Trash, Edit3, MoveRight } from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { PieChart as ResponsivePieChart, Pie, Cell } from "recharts";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import StockDetailsPopup from "@/components/StockDetailsPopup";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TransactionType, OrderStatusDisplay, OrderStatus } from "@/app/firebase/enum";
import { useAuth } from '@/app/contexts/AuthContext';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  sku: string;
}

interface WarehouseStock {
  [key: string]: {
    amount: number;
    type: string;
  }
}
import { Timestamp } from "firebase/firestore";
import { useRouter } from 'next/navigation';

export default function ProductDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const psku = searchParams.get("psku");
  const [product, setProduct] = useState<Products | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockAmount, setstockAmount] = useState<number>(0)
  const [stockPending, setstockPending] = useState<number>(0)
  const [showPieChart, setShowPieChart] = useState(false);
  const [productMonthlySummary, setProductMonthlySummary] = useState<{ str_date: string; date: Timestamp; sku: string; name: string; totalIncome: number; quantity: number }>();
  const [product6MonthlySummary, setProduct6MonthlySummary] = useState<{ month: string; year: number; str_date: string; date: Timestamp; totalIncome: number; quantity: number }[]>();
  const [productTransactions, setProductTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [monthLength, setMonthLength] = useState<number>(6); // Add state for month length selection
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
    sku: ""
  });
  const [trigger, setTrigger] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{
    productName: string;
    productSKU: string;
    stocks: Record<string, number>;
    pendingStocks: Record<string, number>;
  } | null>(null);
  const { hasPermission } = useAuth();

  useEffect(() => {
    if (!psku) return;

    const getIncome = async () => {
      const date = new Date();
      let productMonthlyData = await getMonthlyIncomeByDateSku(psku, date);
      setProductMonthlySummary(productMonthlyData);
    };
    getIncome();

    const getIncome6Month = async () => {
      let product6MonthlySummary = await getProductPeriodMonthlyIncomeSummarybySku(psku, monthLength); // Use monthLength
      setProduct6MonthlySummary(product6MonthlySummary);
    };
    getIncome6Month();

    const fetchTransactionHistory = async () => {
      try {
        setTransactionsLoading(true);
        // Use the new getMonthlyProductTransactions function with current month
        const transactions = await getMonthlyProductTransactions(psku, new Date());
        setProductTransactions(transactions);
      } catch (error) {
        console.error("Error fetching monthly product transactions:", error);
      } finally {
        setTransactionsLoading(false);
      }
    };
    fetchTransactionHistory();

    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const productData = await getProductByID(psku);
        if (productData && (productData as Products).stocks) {
          setProduct(productData as Products);
          let stock = Object.values(((productData as Products).stocks || {})).reduce((a, b) => a + b, 0);
          setstockAmount(stock);
          let pending = Object.values(((productData as Products).pending_stock || {})).reduce((a, b) => a + b, 0);
          setstockPending(pending);
        } else {
          setProduct(null);
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [psku, trigger, monthLength]); // Add monthLength to dependencies

  // Helper function to get transaction type in Thai
  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case TransactionType.BUY:
        return "ซื้อ";
      case TransactionType.SELL:
        return "ขาย";
      case TransactionType.TRANFER:
        return "โอน";
      case TransactionType.REFUND:
        return "คืน";
      case TransactionType.ADJUST:
        return "ปรับ";
      default:
        return type;
    }
  };

  // Helper function to format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "-";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return "-";
    }
  };

  const getSkuDetails = (items: any[], sku: string) => {
    if (!items || !Array.isArray(items)) return { sku: "", quantity: 0 };
    const item = items.find(item => item.sku === sku);
    return item 
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        <span className="ml-4 text-gray-600">กำลังโหลด...</span>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center text-gray-500 py-20">ไม่พบสินค้า</div>;
  }

  const closeModal = (): void => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));

  };
  const handleDeleteProduct = async (sku: string) => {
    try {
      await deleteProductById(sku);
      setTrigger(!trigger); // Refresh the product list
      closeModal();
      router.push('/products');
    } catch (error) {
      console.error("Error deleting product:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: "เกิดข้อผิดพลาดในการลบสินค้า",
        sku: ""
      });
    }
  };

  // For the pie chart visualization (matching the reference)
  const warehouseData = Object.entries(product.stocks as Record<string, number>);

  return (
    <>
      <ProtectedRoute module='products' action="view">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        onConfirm={() => handleDeleteProduct(modalState.sku)}
      />

      {selectedStock && (
        <StockDetailsPopup
          productName={selectedStock.productName}
          productSKU={selectedStock.productSKU}
          buyPrice={product.price.buy_price}
          stocks={selectedStock.stocks}
          pendingStocks={selectedStock.pendingStocks}
          onClose={() => {
            setSelectedStock(null);
          }}
          onUpdate={() => {
            setTrigger(!trigger);
          }}
        />
      )}


      <div className="bg-gray-50 min-h-screen pb-8 dark:bg-zinc-900">
        {/* Header with breadcrumb and title */}
        <div className="bg-white shadow-sm p-4 mb-6 dark:bg-zinc-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center text-sm text-blue-600 dark:text-blue-700 mb-2">
              <Link href="/products" className="flex items-center hover:underline ">
                <ArrowLeft size={16} className="mr-1" />
                <span>สินค้า</span>
              </Link>
            </div>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">รายละเอียดสินค้า: {product.name} ({product.sku})</h1>
              <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">

              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-white rounded-lg shadow-sm p-1 overflow-x-auto dark:bg-zinc-800">
            {hasPermission('products', 'edit') && (
              <>
            <Link
              href={`/products/edit?psku=${product.sku}`}
              className="px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Settings size={16} className="mr-2" />
              แก้ไข
            </Link>
            <Link
              href={`/products/addtransfer?psku=${product.sku}`}
              className="px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <MoveRight size={16} className="mr-2" />
              โอนสินค้า
            </Link>
            <button
              onClick={() => setSelectedStock({
                productName: product.name,
                productSKU: product.sku,
                stocks: product.stocks,
                pendingStocks: product.pending_stock
              })}
              className="px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              <Edit3 size={16} className="mr-2" />
              ปรับจำนวน
            </button>
            </>
            )}
            <button
              className="px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap text-gray-600 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
              disabled={!hasPermission('products', 'delete')}
              onClick={() => {
                setModalState({
                  isOpen: true,
                  title: ModalTitle.DELETE,
                  message: `คุณต้องการลบสินค้า ${product.name} ใช่หรือไม่?`,
                  sku: product.sku
                });
              }}
            >
              <Trash size={16} className="mr-2" />
              ลบ
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 transition-all shadow-sm hover:shadow-md border border-gray-100 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">สินค้าคงเหลือ </div>
                  <div className="text-blue-600 dark:text-blue-400 text-3xl font-bold mt-1">{stockAmount}</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full">
                  <div className="w-8 h-8 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 transition-all shadow-sm hover:shadow-md border border-gray-100 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">สินค้ารอยืนยัน</div>
                  <div className="text-green-600 dark:text-green-400 text-3xl font-bold mt-1">{stockPending}</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-full">
                  <div className="w-8 h-8 flex items-center justify-center text-green-600 dark:text-green-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="m9 12 2 2 4-4"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 transition-all shadow-sm hover:shadow-md border border-gray-100 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm font-medium">ยอดขายเดือนนี้ (อัพเดตล่าสุด {productMonthlySummary?.date.toDate().toLocaleTimeString()})</div>

                  <div className="text-purple-600 dark:text-purple-400 text-3xl font-bold mt-1">
                    {productMonthlySummary?.totalIncome || 0}
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-full">
                  <div className="w-8 h-8 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
                      <path d="M12 18V6"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Image and Details */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mb-6 border border-gray-100 dark:border-zinc-700 ">
                <div className="p-6 flex justify-center items-center bg-gray-50 dark:bg-zinc-800">
                  {product.sku_image ? (
                    <Image
                      priority={true}
                      src={product.sku_image}
                      alt={product.name}
                      width={250}
                      height={250}
                      className="rounded-lg max-h-[250px] w-auto"
                    />
                  ) : (
                    <div className="w-[250px] h-[250px] bg-gray-100 rounded-lg flex items-center justify-center dark:bg-zinc-700">
                      <svg className="w-24 h-24 text-gray-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <path d="m21 15-5-5L5 21"></path>
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-6 space-y-4 border-t border-gray-100 dark:border-zinc-700">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">รหัสสินค้า</div>
                      <div className="font-medium text-gray-900 dark:text-gray-200">{product.sku || 'P0001-2'}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">ชื่อ</div>
                      <div className="font-medium text-gray-900 dark:text-gray-200">{product.name || 'P0001-2'}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">ราคาซื้อ</div>
                      <div className="font-medium text-gray-900 dark:text-gray-200">{product.price.buy_price || 300} บาท</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">ราคาขาย</div>
                      <div className="font-medium text-gray-900 dark:text-gray-200">{product.price.sell_price || 600} บาท</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">ต้นทุนเฉลี่ยต่อชิ้น</div>
                      <div className="font-medium text-gray-900 dark:text-gray-200">{(product.price.buy_price_average || 0).toFixed(2)} บาท</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">คำอธิบายสินค้าเพิ่มเติม</div>
                      <div className="font-medium text-gray-900 dark:text-gray-200">{product.description || 'ไม่มีข้อมูล'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stock Table */}
              <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-zinc-700">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between" >
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">รายละเอียดสต็อก</h2>
                  <button
                    onClick={() => setShowPieChart(prev => !prev)}
                    className="flex items-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-200 dark:hover:text-gray-300"
                  >
                    <PieChart className="w-4 h-4 mr-2" />
                    {showPieChart ? 'ซ่อนแผนภูมิ' : 'แสดงแผนภูมิ'}
                  </button>
                </div>
                <div className="px-6 pb-2 flex items-center ">
                </div>
                {showPieChart && (
                  <ResponsiveContainer width="100%" height={300}>
                    <ResponsivePieChart>
                      <Pie
                        data={warehouseData.map(([name, value]) => ({
                          name,
                          value
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}
                        labelLine={false}
                      >
                        {warehouseData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={[
                              '#60a5fa', // Blue
                              '#34d399', // Green  
                              '#f87171', // Red
                              '#fbbf24', // Yellow
                              '#a78bfa' // Purple
                            ][index % 5]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </ResponsivePieChart>
                  </ResponsiveContainer>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                    <thead className="bg-gray-50 dark:bg-zinc-800">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">ชื่อคลังสินค้า</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">จำนวนคงเหลือ</th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">จำนวนรอยืนยัน</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-zinc-700">
                      {Object.entries(product.stocks as Record<string, number>).map(([warehouse, amount], index) => (
                        <tr key={warehouse} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">
                            {warehouse || `คลังสินค้าหลัก ${index + 1}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right dark:text-gray-200">
                            {amount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right dark:text-gray-200">
                            {((product.pending_stock as Record<string, number>)[warehouse] || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction History Table */}
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mt-6 border border-gray-100 dark:border-zinc-700">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-700 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">รายงานธุรกรรมประจำเดือน</h2>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "500px", minHeight: "400px" }}>
              {transactionsLoading ? (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">กำลังโหลด...</span>
                </div>
              ) : productTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">ไม่พบรายการธุรกรรม</div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
                  <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0 z-10">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">วันที่</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">ประเภท</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">สถานะ</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">รายการ</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">จำนวน</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">จาก</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400">ไป</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-zinc-800 dark:divide-zinc-700">
                    {productTransactions.map((transaction, index) => {
                      // Find the quantity for this specific SKU in the transaction
                      const skuDetails = getSkuDetails(transaction.items, psku || '');
                      
                      return (
                        <tr key={transaction.id || index} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {formatDate(transaction.created_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                              ${transaction.transaction_type === TransactionType.SELL ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                transaction.transaction_type === TransactionType.BUY ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                                transaction.transaction_type === TransactionType.TRANFER ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                                transaction.transaction_type === TransactionType.ADJUST ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {getTransactionTypeText(transaction.transaction_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              ${transaction.status === 'COMPLETED' || transaction.status === OrderStatus.SHIPPED || transaction.status === OrderStatus.PICKED_UP ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                                transaction.status === OrderStatus.PENDING ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                                transaction.status === OrderStatus.CANCELLED ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                              {OrderStatusDisplay[transaction.status as keyof typeof OrderStatusDisplay] || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                            {transaction.transaction_id || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right dark:text-gray-200">
                              {transaction.transaction_type === TransactionType.BUY
                              ? `+${skuDetails.quantity || 0}`
                              : transaction.transaction_type === TransactionType.SELL
                                ? `-${skuDetails.quantity || 0}`
                                : skuDetails.quantity || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right dark:text-gray-200">
                            {transaction.warehouse}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right dark:text-gray-200">
                            {transaction.to_warehouse || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm overflow-hidden mt-6 border border-gray-100 dark:border-zinc-700">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">ยอดขายรายเดือน</h2>
                <p className="text-sm text-gray-500 mt-1 dark:text-gray-400">แสดงยอดขายย้อนหลัง</p>
              </div>
              <div className="flex items-center">
                <label htmlFor="monthLength" className="text-sm text-gray-600 dark:text-gray-400 mr-2">ช่วงเวลา:</label>
                <select 
                  id="monthLength" 
                  value={monthLength}
                  onChange={(e) => setMonthLength(Number(e.target.value))}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5 dark:bg-zinc-700 dark:border-zinc-600 dark:text-white"
                >
                  <option value={3}>3 เดือน</option>
                  <option value={6}>6 เดือน</option>
                  <option value={9}>9 เดือน</option>
                  <option value={12}>12 เดือน</option>
                </select>
              </div>
            </div>
            <div className="p-6 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={product6MonthlySummary?.map(item => ({
                    month: `${item.month} ${item.year.toString().slice(-2)}`,
                    amount: item.totalIncome
                  })) || []}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  barSize={70}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgb(63 63 70)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: 'rgb(161 161 170)' }}
                    axisLine={{ stroke: 'rgb(63 63 70)' }}
                  />
                  <YAxis
                    tick={{ fill: 'rgb(161 161 170)' }}
                    axisLine={{ stroke: 'rgb(63 63 70)' }}
                    tickFormatter={(value) => `${value.toLocaleString()}฿`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value.toLocaleString()} บาท`, 'ยอดขาย']}
                    contentStyle={{
                      backgroundColor: 'rgb(39 39 42)',
                      color: 'rgb(244 244 245)',
                      borderRadius: '8px',
                      border: '1px solid rgb(63 63 70)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    fill="#60a5fa"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
      </ProtectedRoute>
    </>

  );
}