"use client";
import { useEffect, useState } from 'react';
import { getCachedSalesBySellMethod } from '@/app/firebase/firestoreStats';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTheme } from "next-themes";

interface SalesMethodProps {
  startDate: Date;
  endDate: Date;
}

interface SellMethodData {
  name: string;
  value: number;
}

interface TopProductData {
  name: string;
  sku: string;
  totalIncome: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#48C9B0', '#F4D03F', '#EC7063', '#99A3A4'];

export default function SalesByMarketplace({ startDate, endDate }: SalesMethodProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [sellMethodData, setSellMethodData] = useState<SellMethodData[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [topProducts, setTopProducts] = useState<{[method: string]: TopProductData[]}>({});
  const [totalSales, setTotalSales] = useState<number>(0);
  const { theme } = useTheme();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getCachedSalesBySellMethod(startDate, endDate);
        
        // Format sell method data for pie chart
        const methodChartData = Object.entries(data.sellMethods)
          .map(([method, total]) => ({
            name: method,
            value: total
          }))
          .sort((a, b) => b.value - a.value);
        
        setSellMethodData(methodChartData);
        setTopProducts(data.topMethodProducts);
        
        // Calculate total sales
        const total = methodChartData.reduce((sum, item) => sum + item.value, 0);
        setTotalSales(total);
        
        // Set default selected method to the one with highest sales
        if (methodChartData.length > 0 && !selectedMethod) {
          setSelectedMethod(methodChartData[0].name);
        }
      } catch (error) {
        console.error("Error fetching sales by method data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [startDate, endDate]);

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('th-TH');
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return (value * 100).toFixed(1) + '%';
  };

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-zinc-800 p-3 border shadow-sm rounded dark:border-zinc-700">
          <p className="font-medium text-gray-800 dark:text-gray-200">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">฿{formatCurrency(data.value)}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {formatPercentage(data.value / totalSales)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for the bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 p-3 border shadow-sm rounded dark:border-zinc-700">
          <p className="font-medium text-gray-800 dark:text-gray-200">สินค้า: {label}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            ยอดขาย: ฿{formatCurrency(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-zinc-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">ยอดขายตามช่องทาง</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">📊 แคช 1 ชม.</span>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : sellMethodData.length === 0 ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500 dark:text-gray-400">ไม่พบข้อมูล</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Pie Chart */}
          <div className="md:col-span-5">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sellMethodData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={(data) => setSelectedMethod(data.name)}
                  >
                    {sellMethodData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        stroke={entry.name === selectedMethod ? (theme === 'dark' ? '#fff' : '#000') : undefined}
                        strokeWidth={entry.name === selectedMethod ? 2 : 0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => (
                    <span className="text-gray-800 dark:text-gray-200">{value}</span>
                  )} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary Stats */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">ยอดขายรวม</p>
                <p className="text-xl font-bold">฿{formatCurrency(totalSales)}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-zinc-700 rounded-lg">
                <p className="text-sm text-gray-500 dark:text-gray-400">จำนวนช่องทาง</p>
                <p className="text-xl font-bold">{sellMethodData.length}</p>
              </div>
            </div>
          </div>
          
          {/* Top Products */}
          <div className="md:col-span-7">
            {selectedMethod && topProducts[selectedMethod] ? (
              <>
                <h3 className="text-lg font-medium mb-3">สินค้าขายดีใน {selectedMethod}</h3>
                <div className="h-64 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topProducts[selectedMethod].slice(0, 5)}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="dark:opacity-50" />
                      <XAxis 
                        type="number" 
                        tick={{ fill: 'rgb(75, 85, 99)', className: 'dark:fill-gray-300' }} 
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150} 
                        tick={{ fontSize: 12, fill: 'rgb(75, 85, 99)', className: 'dark:fill-gray-300' }} 
                      />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar 
                        dataKey="totalIncome" 
                        name="ยอดขาย" 
                        fill={COLORS[sellMethodData.findIndex(m => m.name === selectedMethod) % COLORS.length]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Method Details */}
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">ส่วนแบ่งตลาด:</span> {formatPercentage(
                      (sellMethodData.find(m => m.name === selectedMethod)?.value || 0) / totalSales
                    )}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-medium">ยอดขายรวม:</span> ฿{formatCurrency(
                      sellMethodData.find(m => m.name === selectedMethod)?.value || 0
                    )}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500 dark:text-gray-400">เลือกช่องทางการขายเพื่อดูรายละเอียด</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
