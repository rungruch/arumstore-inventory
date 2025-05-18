"use client";

import { useEffect, useState } from "react";
import { 
  getPeriodMonthlyIncomeSummary, 
  getTopSellingProducts, 
  getMonthlyIncomeByDate,
  getProductCountByWarehouse,
  getDailyIncomeSummary,
  getYearlySales,
  getCachedProductCountByWarehouse
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
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>("");

  const COLORS = ['#0088FE', '#FF8042', '#FFBB28', '#00C49F', '#AF19FF'];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Get current month and year
        const now = new Date();
        setCurrentMonth(`${now.toLocaleString('th-TH', { month: 'short' })} ${now.getFullYear() + 543}`);
        
        // Fetch daily sales for today
        const todaySales = await getDailyIncomeSummary(now);
        
        // Fetch sales chart data - last 3 months
        const salesSummary = await getPeriodMonthlyIncomeSummary(3);
        setSalesChart(salesSummary.map((m) => ({ 
          name: m.month.substring(0, 3), 
          value: m.totalIncome 
        })).reverse());
        
        // Fetch top selling products for this month
        const top = await getTopSellingProducts(now, 10);
        setTopProducts(top);
        
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
  }, []);

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
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">ภาพรวม</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">ยอดขายวันนี้</span>
          <div className="flex items-center">
            <BadgeDollarSign className="mr-3 text-blue-500 dark:text-blue-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(summary.todaySales)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">ยอดขายเดือน {currentMonth}</span>
          <div className="flex items-center">
            <BarChart3 className="mr-3 text-green-500 dark:text-green-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(summary.monthlySales)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">ยอดขายรวมทั้งปี {new Date().getFullYear() + 543}</span>
          <div className="flex items-center">
            <Banknote className="mr-3 text-amber-500 dark:text-amber-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(summary.totalSales)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">จำนวนสินค้ารวม</span>
          <div className="flex items-center">
            <Building2 className="mr-3 text-purple-500 dark:text-purple-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(summary.inventoryValue)}</span>
          </div>
        </div>
      </div>
      
      {/* Charts and Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">ยอดขายรวม</span>
            <div className="relative">
              <select className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm pr-8 bg-transparent text-gray-600 dark:text-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>ยอดขายรวม</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            </div>
          </div>
          
          {/* Line Chart */}
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">กำลังโหลด...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesChart}
                  margin={{ top: 10, right: 30, left: 20, bottom: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fill: '#6b7280' }} />
                  <YAxis tick={{ fill: '#6b7280' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        
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
          
          {/* Pie Chart */}
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
        </div>
      </div>
      
      {/* Table for best selling products in month */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
          <span className="font-semibold text-gray-800 dark:text-white">สินค้าขายดีประจำเดือน {currentMonth}</span>
          <div className="flex items-center gap-3">
            <div className="relative hidden">
              <select className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm pr-8 bg-transparent text-gray-600 dark:text-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>เดือนนี้</option>
                <option>3 เดือน</option>
                <option>6 เดือน</option>
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
              {loading ? (
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
    </div>
  );
};

export default DashboardPage;