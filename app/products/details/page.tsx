"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getProductBySKU } from "@/app/firebase/firestore";
import { getMonthlyIncomeByDate, getMonthlyIncomeByDateSku, getProductPeriodMonthlyIncomeSummarybySku } from '@/app/firebase/firestoreStats';
import Image from "next/image";
import { Products } from "@/app/firebase/interfaces";
import { ArrowLeft, BarChart2, PieChart, Settings, Circle } from "lucide-react";
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

interface WarehouseStock {
  [key: string]: {
    amount: number;
    type: string;
  }
}
import { Timestamp } from "firebase/firestore";

export default function ProductDetails() {
  const searchParams = useSearchParams();
  const psku = searchParams.get("psku");
  const [product, setProduct] = useState<Products | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("แก้ไข");
  const [stockAmount, setstockAmount] = useState<number>(0)
  const [stockPending, setstockPending] = useState<number>(0)
  const [showPieChart, setShowPieChart] = useState(false);
  const [productMonthlySummary, setProductMonthlySummary]  = useState<{ str_date:string; date:Timestamp; sku: string; name: string; totalIncome: number; quantity: number }>();
  const [product6MonthlySummary, setProduct6MonthlySummary]  = useState<{ month: string; year: number; str_date: string; date: Timestamp; totalIncome: number; quantity: number }[]>();

  useEffect(() => {
    if (!psku) return;

    const getIncome = async () => {
      const date = new Date();
      let productMonthlyData = await getMonthlyIncomeByDateSku(psku, date);
      // console.log(psku)
      // console.log(productMonthlyData)
      setProductMonthlySummary(productMonthlyData);
    };
    getIncome();

    const getIncome6Month = async () => {
      let product6MonthlySummary = await getProductPeriodMonthlyIncomeSummarybySku(psku, 6);
      //console.log (await getProductPeriodMonthlyIncomeSummarybySku(psku, 6))
      setProduct6MonthlySummary(product6MonthlySummary);
    };
    getIncome6Month();


    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const productData = await getProductBySKU(psku) as Products[];
        if (productData && productData.length > 0) {
          setProduct(productData[0]);
        }
        let stock = Object.values(productData[0].stocks as Record<string, number>).reduce((a, b) => a + b, 0);
        setstockAmount(stock);
        let pending = Object.values(productData[0].pending_stock as Record<string, number>).reduce((a, b) => a + b, 0);
        setstockPending(pending);


      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [psku]);

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

  // For the pie chart visualization (matching the reference)
  const warehouseData = Object.entries(product.stocks as Record<string, number>);
  
  return (
    <div className="bg-gray-50 min-h-screen pb-8">
      {/* Header with breadcrumb and title */}
      <div className="bg-white shadow-sm p-4 mb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center text-sm text-blue-600 mb-2">
            <Link href="/products" className="flex items-center hover:underline">
              <ArrowLeft size={16} className="mr-1" />
              <span>สินค้า</span>
            </Link>
          </div>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">รายละเอียดสินค้า ข้อมูลตัวอย่าง ({product.sku})</h1>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4">
        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-white rounded-lg shadow-sm p-1 overflow-x-auto">
          {["แก้ไข", "ดู", "ค้างส่ง", "ประวัติงาน", "พิมพ์เอกสาร", "คู่มือการบริหารงาน"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium flex items-center whitespace-nowrap ${
                activeTab === tab
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab === "แก้ไข" && <Settings size={16} className="mr-2" />}
              {tab === "ดู" && <BarChart2 size={16} className="mr-2" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 transition-all shadow-sm hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm font-medium">สินค้าคงเหลือ (ตัว)</div>
                <div className="text-blue-600 text-3xl font-bold mt-1">{stockAmount}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <div className="w-8 h-8 flex items-center justify-center text-blue-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 transition-all shadow-sm hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm font-medium">สินค้าพร้อมขาย (ตัว)</div>
                <div className="text-green-600 text-3xl font-bold mt-1">{stockAmount + stockPending}</div>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <div className="w-8 h-8 flex items-center justify-center text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 transition-all shadow-sm hover:shadow-md border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm font-medium">ยอดขายเดือนนี้ (อัพเดตล่าสุด {productMonthlySummary?.date.toDate().toLocaleTimeString()})</div>

                <div className="text-purple-600 text-3xl font-bold mt-1">
                  {productMonthlySummary?.totalIncome || 0}
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <div className="w-8 h-8 flex items-center justify-center text-purple-600">
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
            <div className="bg-white  rounded-xl shadow-sm overflow-hidden mb-6 border border-gray-100">
              <div className="p-6 flex justify-center items-center bg-gray-50">
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
                <div className="w-[250px] h-[250px] bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-24 h-24 text-gray-300" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <path d="m21 15-5-5L5 21"></path>
                </svg>
                </div>
              )}
              </div>
              
              <div className="p-6 space-y-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <div>
                <div className="text-sm text-gray-500">รหัสสินค้า</div>
                <div className="font-medium text-gray-900">{product.sku || 'P0001-2'}</div>
                </div>
                <div>
                <div className="text-sm text-gray-500">ราคาขาย</div>
                <div className="font-medium text-gray-900">{product.price.sell_price || 600} บาท</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                <div className="text-sm text-gray-500">ต้นทุนเฉลี่ยต่อชิ้น</div>
                <div className="font-medium text-gray-900">{(product.price.buy_price_average || 0).toFixed(2)} บาท</div>
                </div>
                <div>
                <div className="text-sm text-gray-500">ราคาซื้อ</div>
                <div className="font-medium text-gray-900">{product.price.buy_price || 300} บาท</div>
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-500">คำอธิบายสินค้าเพิ่มเติม</div>
                <div className="font-medium text-gray-900">{product.description || 'ไม่มีข้อมูล'}</div>
              </div>
              </div>
            </div>
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stock Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between" >
                <h2 className="text-lg font-bold text-gray-800">รายละเอียดสต็อก</h2>
                <button
                  onClick={() => setShowPieChart(prev => !prev)}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-800"
                >
                  <PieChart className="w-4 h-4 mr-2" />
                  {showPieChart ? 'ซ่อนแผนภูมิ' : 'แสดงแผนภูมิ'}
                </button>
              </div>
                <div className="px-6 pb-2 flex items-center">
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ชื่อคลังสินค้า</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนคงเหลือ</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">จำนวนพร้อมขาย</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(product.stocks as Record<string, number>).map(([warehouse, amount], index) => (
                      <tr key={warehouse} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {warehouse || `คลังสินค้าหลัก ${index + 1}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {amount + ((product.pending_stock as Record<string, number>)[warehouse] || 0)}
                        
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {amount || 0}
                      </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

                <div className="bg-white overflow-hidden mt-3 shadow-sm border border-gray-100 ">
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800">ยอดขายรายเดือน</h2>
                  <p className="text-sm text-gray-500 mt-1">แสดงยอดขายย้อนหลัง 4 เดือน</p>
                </div>
                <div className="p-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                    data={product6MonthlySummary?.map(item => ({
                    month: `${item.month.padStart(2, '0')}${item.year.toString().slice(-2)}`,
                    amount: item.totalIncome
                    })) || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                    tick={{ fill: '#6B7280' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    tickFormatter={(value) => `${value.toLocaleString()}฿`}
                    />
                    <Tooltip 
                    formatter={(value) => [`${value.toLocaleString()}฿`, 'ยอดขาย']}
                    contentStyle={{ 
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
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
        </div>
      </div>
    </div>
  );
}