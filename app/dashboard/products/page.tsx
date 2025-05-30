"use client";

import { useEffect, useState } from "react";
import { 
  getPeriodMonthlyIncomeSummary, 
  getTopSellingProducts, 
  getMonthlyIncomeByDate,
  getDailyIncomeSummary,
  getYearlySales,
  getCachedProductCountByWarehouse,
  getCachedProductCategoryCount,
  getCachedLowStocksProducts
} from "@/app/firebase/firestoreStats";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  BadgeDollarSign, 
  Banknote, 
  BarChart3, 
  Building2, 
  ChevronDown,
  Download,
  DollarSign
} from "lucide-react";

const DashboardPage = () => {
  // State for summary cards
  const [summary, setSummary] = useState({
    todaySales: 0,
    monthlySales: 0,
    totalSales: 0,
    inventoryValue: 0,
  });
  
  // State for chart data
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [pieChartData, setPieChartData] = useState<any[]>([]);
  const [pieChartDataSelect, setPieChartDataSelect] = useState<any>("value_income");
  const [categoryChartDataSelect, setCategoryChartDataSelect] = useState<any>("totalIncome");
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [topProductsLoading, setTopProductsLoading] = useState(true); // Separate loading state for top products
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0); // 0 = current month, 1 = previous month, etc.
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [displayMonth, setDisplayMonth] = useState<string>("");
  const [totalProductCount, setTotalProductCount] = useState<number>(0);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalPendingIncome, setTotalPendingIncome] = useState<number>(0);
  const [pieChartCategoryData, setPieChartCategoryData] = useState<any[]>([]);
  const [lowStocks, setLowStocks] = useState<any[]>([]);

  const COLORS = ['#0088FE', '#FF8042', '#FFBB28', '#00C49F', '#AF19FF', '#19A7FF', '#FF198E', '#23BD48', '#F76B15', '#A149FA'];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Get current month and year with Thai Buddhist year
        const now = new Date();
        setCurrentMonth(`${now.toLocaleString('th-TH', { month: 'short' })} ${now.getFullYear() + 543}`);
        
        // Calculate the selected month date based on offset
        const selectedDate = new Date();
        selectedDate.setMonth(selectedDate.getMonth() - selectedMonthOffset);
        
        // Set the display month for the selected date
        setDisplayMonth(`${selectedDate.toLocaleString('th-TH', { month: 'short' })} ${selectedDate.getFullYear() + 543}`);
        
        // Fetch daily sales for today
        const todaySales = await getDailyIncomeSummary(now);
        
        // Fetch sales chart data - last 3 months
        const salesSummary = await getPeriodMonthlyIncomeSummary(3);
        setSalesChart(salesSummary.map((m) => ({ 
          name: m.month.substring(0, 3), 
          value: m.totalIncome 
        })).reverse());
        
        const lowStocks = await getCachedLowStocksProducts();
        setLowStocks(lowStocks);
        
        // Fetch summary for this month
        const monthly = await getMonthlyIncomeByDate(now);
        
        // Fetch yearly sales total for the current year
        const yearly = await getYearlySales(now.getFullYear());
        
        // Fetch warehouse inventory data for pie chart
        const warehouseData = await getCachedProductCountByWarehouse();
        setPieChartData(warehouseData.map((item: { warehouse_name: any; count: any; totalIncome: any; }) => ({
          name: item.warehouse_name,
          value_count: item.count,
          value_income: item.totalIncome
        })));

        // Calculate and log sum of warehouse counts and incomes
        const totalProductCount = warehouseData.reduce((sum: any, w: { count: any; }) => sum + (w.count || 0), 0);
        const totalIncome = warehouseData.reduce((sum: any, w: { totalIncome: any; }) => sum + (w.totalIncome || 0), 0);
        const totalPendingIncome = warehouseData.reduce((sum: any, w: { totalPendingIncome: any; }) => sum + (w.totalPendingIncome || 0), 0);
        setTotalProductCount(totalProductCount);
        setTotalIncome(totalIncome);
        setTotalPendingIncome(totalPendingIncome);

        const getCachedProductCategoryCounData = await getCachedProductCategoryCount();
        // Process category data for another chart
        const categoryData = getCachedProductCategoryCounData.skus;
        const categoryChartData = Object.entries(categoryData).map(([category, data]) => ({
          name: category,
          count: data.count,
          totalIncome: data.totalIncome,
          totalPendingIncome: data.totalPendingIncome
        }));
        setPieChartCategoryData(categoryChartData);
        
        setSummary({
          todaySales: todaySales.totalIncome,
          monthlySales: monthly.allIncome,
          totalSales: yearly, // Now using the yearly sales instead of monthly
          inventoryValue: warehouseData.reduce((sum: any, w: { count: any; }) => sum + w.count, 0),
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []); // Remove selectedMonthOffset dependency from main useEffect

  // Separate useEffect for fetching top products based on selectedMonthOffset
  useEffect(() => {
    async function fetchTopProducts() {
      setTopProductsLoading(true);
      try {
        // Calculate the selected month date based on offset
        const selectedDate = new Date();
        selectedDate.setMonth(selectedDate.getMonth() - selectedMonthOffset);
        
        // Set the display month for the selected date
        setDisplayMonth(`${selectedDate.toLocaleString('th-TH', { month: 'short' })} ${selectedDate.getFullYear() + 543}`);
        
        // Fetch top selling products for the selected month
        const top = await getTopSellingProducts(selectedDate, 10);
        setTopProducts(top);
      } catch (error) {
        console.error("Error fetching top products data:", error);
      } finally {
        setTopProductsLoading(false);
      }
    }
    
    fetchTopProducts();
  }, [selectedMonthOffset]); // This useEffect depends only on selectedMonthOffset

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('th-TH');
  };

  // Custom tooltip for the line chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border shadow-sm rounded">
          <p className="text-sm">{`${label} : ฿${formatCurrency(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 min-900 dark:to-gray-800 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ภาพรวมสินค้า</h1>
        <div className="mt-2 sm:mt-0">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            📊 ข้อมูลแคช | รีเฟรชทุก 1 ชั่วโมง
          </span>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">มูลค่าสินค้าทั้งหมด</span>
          <div className="flex items-center">
            <BadgeDollarSign className="mr-3 text-blue-500 dark:text-blue-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(totalIncome)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">มูลค่าสินค้ารอยืนยันทั้งหมด</span>
          <div className="flex items-center">
            <BarChart3 className="mr-3 text-green-500 dark:text-green-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(totalPendingIncome)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">จำนวนสินค้ารวม</span>
          <div className="flex items-center">
            <Building2 className="mr-3 text-purple-500 dark:text-purple-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(totalProductCount)} ชิ้น</span>
          </div>
        </div>
      </div>
      
      {/* Charts and Pies - Two graphs in one row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Warehouse Pie Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">สินค้ารายคลัง</span>
            <div className="relative">
              <select 
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm pr-8 bg-transparent text-gray-600 dark:text-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setPieChartDataSelect(e.target.value === "มูลค่าสินค้า" ? "value_income" : "value_count")}
                defaultValue="มูลค่าสินค้า"
              >
                <option>มูลค่าสินค้า</option>
                <option>จำนวนสินค้า</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          {/* Warehouse Pie Chart */}
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">กำลังโหลด...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey={pieChartDataSelect}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            สัดส่วนสินค้าตามคลังสินค้า
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">รายการสินค้าตามหมวดหมู่</span>
            <div className="relative">
              <select 
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm pr-8 bg-transparent text-gray-600 dark:text-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setCategoryChartDataSelect(e.target.value === "มูลค่าสินค้า" ? "totalIncome" : "count")}
                defaultValue="มูลค่าสินค้า"
              >
                <option>มูลค่าสินค้า</option>
                <option>จำนวนสินค้า</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          {/* Category Pie Chart */}
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">กำลังโหลด...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey={categoryChartDataSelect === "totalIncome" ? "totalIncome" : "count"}
                  >
                    {pieChartCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            สัดส่วนสินค้าตามหมวดหมู่
          </div>
        </div>
      </div>
      
      {/* Tables for Warehouse and Category Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Warehouse Data Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">ข้อมูลรายละเอียดคลังสินค้า</span>
          </div>
          
          {/* Warehouse Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">คลังสินค้า</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">จำนวนสินค้า</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">มูลค่า (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-gray-400 dark:text-gray-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : pieChartData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-gray-400 dark:text-gray-500">ไม่พบข้อมูล</td>
                  </tr>
                ) : (
                  pieChartData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatCurrency(item.value_count)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-medium">{formatCurrency(item.value_income)}</td>
                    </tr>
                  ))
                )}
                {!loading && pieChartData.length > 0 && (
                  <tr className="bg-gray-50 dark:bg-zinc-700 font-medium">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">รวมทั้งหมด</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{formatCurrency(totalProductCount)}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{formatCurrency(totalIncome)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Category Data Table */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">ข้อมูลรายละเอียดหมวดหมู่</span>
          </div>
          
          {/* Category Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">หมวดหมู่</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">จำนวนสินค้า</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">มูลค่า (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-gray-400 dark:text-gray-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : pieChartCategoryData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-gray-400 dark:text-gray-500">ไม่พบข้อมูล</td>
                  </tr>
                ) : (
                  pieChartCategoryData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatCurrency(item.count)}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-medium">{formatCurrency(item.totalIncome)}</td>
                    </tr>
                  ))
                )}
                {!loading && pieChartCategoryData.length > 0 && (
                  <tr className="bg-gray-50 dark:bg-zinc-700 font-medium">
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-200">รวมทั้งหมด</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{formatCurrency(pieChartCategoryData.reduce((sum, item) => sum + item.count, 0))}</td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-200">{formatCurrency(pieChartCategoryData.reduce((sum, item) => sum + item.totalIncome, 0))}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Table for best selling products in month */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
          <span className="font-semibold text-gray-800 dark:text-white">สินค้าขายดีประจำเดือน {displayMonth}</span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select 
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm pr-8 bg-transparent text-gray-600 dark:text-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedMonthOffset}
                onChange={(e) => setSelectedMonthOffset(Number(e.target.value))}
              >
                <option value="0">เดือนนี้</option>
                <option value="1">1 เดือนก่อน</option>
                <option value="2">2 เดือนก่อน</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
            {/* <button 
              className="border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-300 transition-colors duration-200"
              onClick={() => console.log("Download Excel")}
            >
              <Download size={14} />
              <span>Download Excel</span>
            </button> */}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-zinc-700">
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">ลำดับ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">รหัสสินค้า</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">ชื่อสินค้า</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">จำนวนขาย</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">ยอดขาย (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {topProductsLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400 dark:text-gray-500">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-400 dark:text-gray-500">ไม่พบข้อมูล</td>
                </tr>
              ) : (
                topProducts.map((item, idx) => (
                  <tr key={item.sku} className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{idx + 1}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{item.sku}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.name}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-medium">{formatCurrency(item.totalIncome)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stocks Table */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800 dark:text-white">สินค้าใกล้หมด</span>
            {!loading && lowStocks.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full">
                {lowStocks.length} รายการ
              </span>
            )}
          </div>
          <div className="flex items-center">
            <span className="text-xs px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full">
              ต้องสั่งซื้อเพิ่ม
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <div className="max-h-[300px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-zinc-700">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">รหัสสินค้า</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">ชื่อสินค้า</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-600 dark:text-gray-300">คลัง</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">จำนวนคงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-400 dark:text-gray-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : lowStocks.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-400 dark:text-gray-500">ไม่มีสินค้าใกล้หมด</td>
                  </tr>
                ) : (
                  lowStocks.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">{item.sku}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.name}</td>
                      <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{item.warehouse_name}</td>
                      <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-bold">{item.stock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;