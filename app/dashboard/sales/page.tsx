"use client";

import { useEffect, useState } from "react";
import { 
  getPeriodMonthlyIncomeSummary, 
  getTopSellingProducts, 
  getMonthlyIncomeByDate,
  getDailyIncomeSummary,
  getYearlySales,
  getCachedPeriodSalesComparison
} from "@/app/firebase/firestoreStats";
import SalesByMarketplace from "@/components/SalesByMarketplace";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { 
  BadgeDollarSign, 
  Banknote, 
  BarChart3, 
  ChevronDown,
  Download,
  Calendar,
  ArrowUp,
  ArrowDown,
  X
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const SalesDashboardPage = () => {
  // State for date range
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)),
    endDate: new Date(),
    label: 'ข้อมูลย้อนหลัง 3 เดือน'
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startMonth, setStartMonth] = useState<Date>(new Date(new Date().setMonth(new Date().getMonth() - 3)));
  const [endMonth, setEndMonth] = useState<Date>(new Date());
  
  // State for summary cards
  const [summary, setSummary] = useState({
    todaySales: 0,
    monthSales: 0,
    periodSales: 0,
    comparedToLastPeriod: 0,
    orderCount: 0,
    itemCount: 0
  });
  
  // State for chart data
  const [salesChart, setSalesChart] = useState<any[]>([]);
  const [chartType, setChartType] = useState<string>("ยอดขายรวม");
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<string>("");
  const [isGrowth, setIsGrowth] = useState<boolean>(true);

  const COLORS = ['#0088FE', '#FF8042', '#FFBB28', '#00C49F', '#AF19FF'];

  // Fetch data when the component mounts or date range changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Get current month and year with Thai Buddhist year
        const now = new Date();
        setCurrentMonth(`${now.toLocaleString('th-TH', { month: 'short' })} ${now.getFullYear() + 543}`);
        
        // Fetch daily sales for today
        const todaySales = await getDailyIncomeSummary(now);
        
        // Calculate months between start date and end date (for chart data)
        const start = dateRange.startDate;
        const end = dateRange.endDate;
        const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
        const monthsToFetch = Math.min(diffMonths, 12); // Limit to 12 months max for chart readability
        
        // Fetch sales chart data based on selected date range
        const salesSummary = await getPeriodMonthlyIncomeSummary(monthsToFetch);
        setSalesChart(salesSummary.map((m) => ({ 
          name: m.month.substring(0, 3), 
          value: m.totalIncome 
        })).reverse());
        
        // Fetch top selling products for this month
        const top = await getTopSellingProducts(now, 10);
        setTopProducts(top);
        
        // Fetch summary for this month
        const monthly = await getMonthlyIncomeByDate(now);
        
        // Get period comparison data (real data with caching)
        const periodComparison = await getCachedPeriodSalesComparison(start, end);
        setIsGrowth(periodComparison.growthPercent > 0);
        
        setSummary({
          todaySales: todaySales.totalIncome,
          monthSales: monthly.allIncome,
          periodSales: periodComparison.periodSales,
          comparedToLastPeriod: Math.abs(periodComparison.growthPercent),
          orderCount: periodComparison.orderCount,
          itemCount: periodComparison.itemCount
        });

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [dateRange.startDate, dateRange.endDate]);

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('th-TH');
  };

  // Custom tooltip for the line chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 p-2 border shadow-sm rounded dark:border-zinc-700">
          <p className="text-sm text-gray-800 dark:text-gray-200">{`${label} : ฿${formatCurrency(payload[0].value)}`}</p>
        </div>
      );
    }
    return null;
  };
  
  // Function to handle month change
  const handleMonthChange = (date: Date | null, isStart: boolean) => {
    if (!date) return;
    
    if (isStart) {
      setStartMonth(date);
      // Set date to first day of month
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
      
      // Update date range if end month is already set and is after start month
      if (endMonth && endMonth >= firstDay) {
        // Set the end date to last day of end month
        const lastDay = new Date(endMonth.getFullYear(), endMonth.getMonth() + 1, 0);
        updateDateRange(firstDay, lastDay);
      }
    } else {
      setEndMonth(date);
      // Set date to last day of month
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      // Update date range if start month is already set and is before end month
      if (startMonth && startMonth <= lastDay) {
        // Set the start date to first day of start month
        const firstDay = new Date(startMonth.getFullYear(), startMonth.getMonth(), 1);
        updateDateRange(firstDay, lastDay);
      }
    }
  };
  
  // Function to update date range and refetch data
  const updateDateRange = (start: Date, end: Date) => {
    // Calculate months between start and end
    const diffMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    
    // Format label
    let label = '';
    if (diffMonths === 1) {
      label = `${start.toLocaleString('th-TH', { month: 'long', year: 'numeric' })}`;
    } else if (diffMonths <= 12) {
      label = `${diffMonths} เดือน`;
    } else {
      const years = Math.floor(diffMonths / 12);
      const remainingMonths = diffMonths % 12;
      label = remainingMonths > 0 ? 
        `${years} ปี ${remainingMonths} เดือน` : 
        `${years} ปี`;
    }
    
    // Update date range
    setDateRange({
      startDate: start,
      endDate: end,
      label: `ข้อมูล ${label}`
    });
    
    // Close the date picker
    setTimeout(() => {
      setShowDatePicker(false);
    }, 300);
    
    // Simulate loading for fetching new data
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 min-900 dark:to-gray-800 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ยอดขาย</h1>
        
        <div className="flex items-center mt-4 md:mt-0">
          <div className="relative">
            <div 
              className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 bg-white dark:bg-zinc-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700"
              onClick={() => setShowDatePicker(!showDatePicker)}
            >
              <Calendar className="mr-2 text-gray-500 dark:text-gray-400" size={16} />
              <span className="text-sm text-gray-600 dark:text-gray-300">{dateRange.label}</span>
              <ChevronDown className="ml-2 text-gray-400" size={16} />
            </div>
            
            {showDatePicker && (
              <div className="absolute right-0 mt-2 z-50">
                <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">เลือกช่วงเดือน</h3>
                    <button 
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      onClick={() => setShowDatePicker(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">เดือนเริ่มต้น</p>
                      <DatePicker
                        selected={startMonth}
                        onChange={(date: Date | null) => handleMonthChange(date, true)}
                        dateFormat="MM/yyyy"
                        showMonthYearPicker
                        inline
                        className="dark:bg-zinc-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">เดือนสิ้นสุด</p>
                      <DatePicker
                        selected={endMonth}
                        onChange={(date: Date | null) => handleMonthChange(date, false)}
                        dateFormat="MM/yyyy"
                        showMonthYearPicker
                        inline
                        className="dark:bg-zinc-800 dark:text-white"
                        minDate={startMonth}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3 flex justify-between gap-2">
                    <button 
                      className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-700 text-xs rounded hover:bg-gray-200 dark:hover:bg-zinc-600"
                      onClick={() => {
                        const today = new Date();
                        const oneMonthAgo = new Date();
                        oneMonthAgo.setMonth(today.getMonth() - 1);
                        setStartMonth(oneMonthAgo);
                        setEndMonth(today);
                        updateDateRange(
                          new Date(oneMonthAgo.getFullYear(), oneMonthAgo.getMonth(), 1),
                          new Date(today.getFullYear(), today.getMonth() + 1, 0)
                        );
                      }}
                    >
                      1 เดือน
                    </button>
                    <button 
                      className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-700 text-xs rounded hover:bg-gray-200 dark:hover:bg-zinc-600"
                      onClick={() => {
                        const today = new Date();
                        const threeMonthsAgo = new Date();
                        threeMonthsAgo.setMonth(today.getMonth() - 3);
                        setStartMonth(threeMonthsAgo);
                        setEndMonth(today);
                        updateDateRange(
                          new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth(), 1),
                          new Date(today.getFullYear(), today.getMonth() + 1, 0)
                        );
                      }}
                    >
                      3 เดือน
                    </button>
                    <button 
                      className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-700 text-xs rounded hover:bg-gray-200 dark:hover:bg-zinc-600"
                      onClick={() => {
                        const today = new Date();
                        const sixMonthsAgo = new Date();
                        sixMonthsAgo.setMonth(today.getMonth() - 6);
                        setStartMonth(sixMonthsAgo);
                        setEndMonth(today);
                        updateDateRange(
                          new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth(), 1),
                          new Date(today.getFullYear(), today.getMonth() + 1, 0)
                        );
                      }}
                    >
                      6 เดือน
                    </button>
                    <button 
                      className="px-3 py-1.5 bg-gray-100 dark:bg-zinc-700 text-xs rounded hover:bg-gray-200 dark:hover:bg-zinc-600"
                      onClick={() => {
                        const today = new Date();
                        const oneYearAgo = new Date();
                        oneYearAgo.setFullYear(today.getFullYear() - 1);
                        setStartMonth(oneYearAgo);
                        setEndMonth(today);
                        updateDateRange(
                          new Date(oneYearAgo.getFullYear(), oneYearAgo.getMonth(), 1),
                          new Date(today.getFullYear(), today.getMonth() + 1, 0)
                        );
                      }}
                    >
                      1 ปี
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      
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
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(summary.monthSales)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">ยอดขายช่วง {dateRange.label}</span>
          <div className="flex items-center">
            <Banknote className="mr-3 text-amber-500 dark:text-amber-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(summary.periodSales)}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">เทียบกับช่วงที่แล้ว</span>
          <div className="flex items-center">
            {isGrowth ? 
              <ArrowUp className="mr-3 text-emerald-500" size={20} /> : 
              <ArrowDown className="mr-3 text-red-500" size={20} />
            }
            <span className={`text-2xl font-bold ${isGrowth ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {loading ? "-" : `${summary.comparedToLastPeriod.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 lg:col-span-2 bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">รายงานยอดขาย</span>
            <div className="hidden relative">
              <select 
                className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm pr-8 bg-transparent text-gray-600 dark:text-gray-300 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setChartType(e.target.value)}
                defaultValue="ยอดขายรวม"
              >
                <option>ยอดขายรวม</option>
                <option>จำนวนออเดอร์</option>
                <option>จำนวนชิ้น</option>
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
          
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ช่วงเวลา: {dateRange.startDate.toLocaleDateString('th-TH')} - {dateRange.endDate.toLocaleDateString('th-TH')}
            </div>
            <button
              className="hidden border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-300 transition-colors duration-200"
              onClick={() => {}}
            >
              <Download size={14} />
              <span>Excel</span>
            </button>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">สรุปยอดขาย</span>
          </div>
          
          {/* Summary Information for the period */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">จำนวนออเดอร์</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {loading ? "-" : formatCurrency(summary.orderCount)} ออเดอร์
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">จำนวนสินค้า</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {loading ? "-" : formatCurrency(summary.itemCount)} ชิ้น
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ยอดขาย</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {loading ? "-" : formatCurrency(summary.periodSales)} บาท
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">ยอดเฉลี่ยต่อออเดอร์</p>
              <p className="text-2xl font-semibold text-gray-800 dark:text-white">
                {loading ? "-" : formatCurrency(summary.orderCount > 0 ? Math.round(summary.periodSales / summary.orderCount) : 0)} บาท
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sales by Marketplace */}
      <SalesByMarketplace startDate={dateRange.startDate} endDate={dateRange.endDate} />
      
      {/* Table for best selling products in period */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
          <span className="font-semibold text-gray-800 dark:text-white">สินค้าขายดีประจำเดือน {currentMonth}</span>
          <div className="flex items-center gap-3">
            <button 
              className="hidden border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 text-gray-600 dark:text-gray-300 transition-colors duration-200"
              onClick={() => {}}
            >
              <Download size={14} />
              <span>Excel</span>
            </button>
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

export default SalesDashboardPage;