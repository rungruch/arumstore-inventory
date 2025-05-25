"use client";

import { useEffect, useState } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { 
  BadgeDollarSign, 
  Banknote, 
  BarChart3, 
  Calendar,
  PackageOpen,
  Warehouse,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { 
  getDailyPurchaseSummary,
  getPeriodMonthlyPurchaseSummary,
  getCachedMonthlyPurchaseByDate,
  getCachedPurchasesBySupplier,
  getCachedPurchasePeriodComparison
} from "@/app/firebase/firestoreStats";
import PurchasesBySupplier from "@/components/PurchasesBySupplier";

const PurchaseDashboardPage = () => {
  // State for date range
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
    endDate: new Date(),
    label: 'ข้อมูลย้อนหลัง 3 เดือน'
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // State for summary cards
  const [summary, setSummary] = useState({
    todayPurchases: 0,
    monthPurchases: 0,
    periodPurchases: 0,
    orderCount: 0,
    itemCount: 0
  });
  
  // State for chart data
  const [purchaseChart, setPurchaseChart] = useState<any[]>([
    { name: "ก.พ.", value: 35000 },
    { name: "มี.ค.", value: 42000 },
    { name: "เม.ย.", value: 28000 },
    { name: "พ.ค.", value: 39000 },
  ]);
  const [topSuppliers, setTopSuppliers] = useState<any[]>([
    { name: "Supplier A", value: 15000 },
    { name: "Supplier B", value: 12000 },
    { name: "Supplier C", value: 9000 },
    { name: "Supplier D", value: 6000 },
    { name: "Supplier E", value: 5000 },
  ]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [isGrowth, setIsGrowth] = useState<boolean>(true);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD'];

  // Fetch real data from Firebase
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Get current month and year with Thai Buddhist year
        const now = new Date();
        setCurrentMonth(`${now.toLocaleString('th-TH', { month: 'short' })} ${now.getFullYear() + 543}`);
        
        // Fetch daily purchase data for today
        const todayPurchases = await getDailyPurchaseSummary(now);
        
        // Calculate months between start date and end date
        const start = dateRange.startDate;
        const end = dateRange.endDate;
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        const monthsToFetch = Math.min(diffMonths, 12); // Limit to 12 months max for chart readability
        
        // Fetch purchase chart data based on selected date range
        const purchaseSummary = await getPeriodMonthlyPurchaseSummary(monthsToFetch);
        setPurchaseChart(purchaseSummary.map((m) => ({ 
          name: m.month.substring(0, 3), 
          value: m.totalPurchase 
        })).reverse());
        
        // Fetch monthly purchase data
        const monthlyPurchase = await getCachedMonthlyPurchaseByDate(now);
        
        // Get supplier data
        const supplierData = await getCachedPurchasesBySupplier(start, end);
        
        // Prepare top suppliers for chart
        const topSuppliersArray = Object.entries(supplierData.suppliers)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);
        
        setTopSuppliers(topSuppliersArray);
        
        // Get period comparison data
        const periodComparison = await getCachedPurchasePeriodComparison(start, end);
        setIsGrowth(periodComparison.growthPercent > 0);
        
        // Update summary data
        setSummary({
          todayPurchases: todayPurchases.totalPurchases,
          monthPurchases: monthlyPurchase.allPurchases,
          periodPurchases: periodComparison.currentPeriodTotal,
          orderCount: todayPurchases.transactionCount,
          itemCount: todayPurchases.itemCount
        });
      } catch (error) {
        console.error("Error fetching purchase dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [dateRange]);

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('th-TH');
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 p-3 border shadow-sm rounded dark:border-zinc-700">
          <p className="font-medium text-gray-800 dark:text-gray-200">{label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">฿{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">รายการซื้อ</h1>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
            📊 ข้อมูลแคช | รีเฟรชทุก 1 ชั่วโมง
          </span>
        </div>
        
        {/* Date Range Picker */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center px-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-sm"
          >
            <Calendar className="h-4 w-4 mr-2" />
            <span>{dateRange.label}</span>
          </button>

          {showDatePicker && (
            <div className="absolute right-0 mt-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg z-10 p-4">
              <div className="flex flex-col space-y-2">
                <button
                  className="text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                  onClick={() => {
                    const today = new Date();
                    const threeMonthsAgo = new Date();
                    threeMonthsAgo.setMonth(today.getMonth() - 3);
                    setDateRange({
                      startDate: threeMonthsAgo,
                      endDate: today,
                      label: 'ข้อมูลย้อนหลัง 3 เดือน'
                    });
                    setShowDatePicker(false);
                  }}
                >
                  ข้อมูลย้อนหลัง 3 เดือน
                </button>
                <button
                  className="text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                  onClick={() => {
                    const today = new Date();
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(today.getMonth() - 6);
                    setDateRange({
                      startDate: sixMonthsAgo,
                      endDate: today,
                      label: 'ข้อมูลย้อนหลัง 6 เดือน'
                    });
                    setShowDatePicker(false);
                  }}
                >
                  ข้อมูลย้อนหลัง 6 เดือน
                </button>
                <button
                  className="text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
                  onClick={() => {
                    const today = new Date();
                    const oneYearAgo = new Date();
                    oneYearAgo.setFullYear(today.getFullYear() - 1);
                    setDateRange({
                      startDate: oneYearAgo,
                      endDate: today,
                      label: 'ข้อมูลย้อนหลัง 1 ปี'
                    });
                    setShowDatePicker(false);
                  }}
                >
                  ข้อมูลย้อนหลัง 1 ปี
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ยอดซื้อวันนี้</p>
              <p className="text-2xl font-bold">฿{formatCurrency(summary.todayPurchases)}</p>
            </div>
            <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 flex items-center justify-center rounded-lg">
              <BarChart3 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">จำนวนออเดอร์ซื้อวันนี้</p>
              <p className="text-2xl font-bold">{summary.orderCount}</p>
            </div>
            <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center rounded-lg">
              <PackageOpen className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ยอดซื้อเดือน {currentMonth}</p>
              <p className="text-2xl font-bold">฿{formatCurrency(summary.monthPurchases)}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 flex items-center justify-center rounded-lg">
              <Banknote className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

                <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">ยอดซื้อรวม (ทั้งหมด)</p>
              <p className="text-2xl font-bold">฿{formatCurrency(summary.periodPurchases)}</p>
              <div className="flex items-center mt-1">
                {isGrowth ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={`text-sm ${isGrowth ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isGrowth ? '+' : ''}
                </span>
              </div>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center rounded-lg">
              <BadgeDollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>


      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Purchase Trend Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
          <h2 className="text-xl font-semibold mb-4">แนวโน้มการซื้อ</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={purchaseChart}
                  margin={{
                    top: 5,
                    right: 20,
                    left: 0,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="dark:opacity-50" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'rgb(75, 85, 99)', className: 'dark:fill-gray-300' }} 
                  />
                  <YAxis 
                    tick={{ fill: 'rgb(75, 85, 99)', className: 'dark:fill-gray-300' }} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Top Suppliers Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
          <h2 className="text-xl font-semibold mb-4">ซัพพลายเออร์หลัก</h2>
          
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSuppliers}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="dark:opacity-50" />
                  <XAxis 
                    type="number" 
                    tick={{ fill: 'rgb(75, 85, 99)', className: 'dark:fill-gray-300' }} 
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fontSize: 12, fill: 'rgb(75, 85, 99)', className: 'dark:fill-gray-300' }} 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" name="ยอดซื้อ">
                    {topSuppliers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Supplier Analysis Section */}
      <div className="mb-6">
        <PurchasesBySupplier startDate={dateRange.startDate} endDate={dateRange.endDate} />
      </div>
    </div>
  );
};

export default PurchaseDashboardPage;