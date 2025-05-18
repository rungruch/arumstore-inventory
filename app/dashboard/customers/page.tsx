"use client";

import { useEffect, useState } from "react";
import { 
  getSellTransactionsByClientId, 
  getTotalContactsCount, 
  getContactsPaginated
} from "@/app/firebase/firestore";
import { 
  getCachedCustomerGroupDistribution,
  getCachedCurrentMonthActiveCustomers,
  getCachedCustomerProvinceDistribution
} from "@/app/firebase/firestoreCustomerStats";
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
  Users, 
  UserCircle
} from "lucide-react";
import Link from "next/link";

const CustomerDashboardPage = () => {
  // State for summary cards
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
  });
  
  // State for chart data
  const [customerGroupChart, setCustomerGroupChart] = useState<any[]>([]);
  const [customerProvinceChart, setCustomerProvinceChart] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ['#0088FE', '#FF8042', '#FFBB28', '#00C49F', '#AF19FF', '#19A7FF', '#FF198E', '#23BD48', '#F76B15', '#A149FA'];

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Get total customer count
        const totalCustomers = await getTotalContactsCount();
        
        // Get all customers with pagination (first page)
        const { contacts } = await getContactsPaginated(null, 100);
        
        // Use cached customer group distribution data
        const groupChartData = await getCachedCustomerGroupDistribution();
        setCustomerGroupChart(groupChartData);
        
        // Use cached customer province distribution data
        const provinceChartData = await getCachedCustomerProvinceDistribution();
        setCustomerProvinceChart(provinceChartData);
        
        // Get current month active customers using cached function
        const activeCustomers = await getCachedCurrentMonthActiveCustomers();
        
        // Process customer data to find top customers by transaction value
        const customerTransactions: { [key: string]: { name: string, value: number, transactions: number } } = {};
        
        // Process each customer
        for (const customer of contacts.slice(0, 30) as any[]) { // Process first 30 customers for performance
          try {
            // Check if client_id exists on the customer object or use id as fallback
            const clientId = 'client_id' in customer ? customer.client_id : customer.id;
            const transactions = await getSellTransactionsByClientId(clientId);
            
            if (transactions.length > 0) {
              let customerTotal = 0;
              
              transactions.forEach((transaction: any) => {
                if (transaction.total_amount) {
                  customerTotal += transaction.total_amount;
                }
              });
              
              customerTransactions[customer.client_id] = {
                name: customer.name,
                value: customerTotal,
                transactions: transactions.length
              };
            }
          } catch (error) {
            console.error(`Error fetching transactions for customer ${customer.client_id}:`, error);
          }
        }
        
        // Sort customers by transaction value
        const sortedCustomers = Object.entries(customerTransactions)
          .map(([id, data]) => ({
            id,
            name: data.name,
            value: data.value,
            transactions: data.transactions
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10); // Get top 10 customers
        
        setTopCustomers(sortedCustomers);
        
        setSummary({
          totalCustomers,
          activeCustomers
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

  // Format date
  const formatDate = (dateObj: any) => {
    if (!dateObj) return "-";
    const date = dateObj.toDate ? dateObj.toDate() : new Date(dateObj);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 p-2 border shadow-sm rounded dark:border-zinc-700">
          <p className="text-sm text-gray-800 dark:text-gray-200">{`${payload[0].name}: ${payload[0].value} คน (${((payload[0].value / summary.totalCustomers) * 100).toFixed(1)}%)`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-zinc-900 dark:to-zinc-800 min-900 dark:to-gray-800 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">ภาพรวมลูกค้า</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">ลูกค้าทั้งหมด</span>
          <div className="flex items-center">
            <Users className="mr-3 text-blue-500 dark:text-blue-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(summary.totalCustomers)} คน</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 dark:border-gray-700">
          <span className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 block">ลูกค้าที่ซื้อสินค้า เดือนนี้</span>
          <div className="flex items-center">
            <UserCircle className="mr-3 text-green-500 dark:text-green-400" size={20} />
            <span className="text-2xl font-bold text-gray-800 dark:text-white">{loading ? "-" : formatCurrency(summary.activeCustomers)} คน</span>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Customer Group Pie Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">สัดส่วนลูกค้าตามกลุ่ม</span>
          </div>
          
          {/* Customer Group Pie Chart */}
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">กำลังโหลด...</div>
            ) : customerGroupChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">ไม่พบข้อมูล</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerGroupChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {customerGroupChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            สัดส่วนลูกค้าตามกลุ่ม
          </div>
        </div>

        {/* Customer Province Pie Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-5">
            <span className="font-semibold text-gray-800 dark:text-white">สัดส่วนลูกค้าตามจังหวัด</span>
          </div>
          
          {/* Customer Province Pie Chart */}
          <div className="h-72">
            {loading ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">กำลังโหลด...</div>
            ) : customerProvinceChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">ไม่พบข้อมูล</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerProvinceChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {customerProvinceChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            สัดส่วนลูกค้าตามจังหวัด
          </div>
        </div>
      </div>
      
      {/* Top Customers Chart */}
      <div className="bg-white dark:bg-zinc-800 rounded-xl p-5 shadow-md border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex justify-between items-center mb-5">
          <span className="font-semibold text-gray-800 dark:text-white">ลูกค้าที่มียอดซื้อสูงสุด</span>
        </div>
          
          {/* Customer Data Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-zinc-700">
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">ลำดับ</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">ชื่อลูกค้า</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">จำนวนรายการ</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">มูลค่า (บาท)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-400 dark:text-gray-500">กำลังโหลดข้อมูล...</td>
                  </tr>
                ) : topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-gray-400 dark:text-gray-500">ไม่พบข้อมูล</td>
                  </tr>
                ) : (
                  topCustomers.map((customer, idx) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{idx + 1}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        <Link href={`/contacts/${customer.id}`} className="hover:underline text-blue-600 dark:text-blue-400">
                          {customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{customer.transactions}</td>
                      <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 font-medium">{formatCurrency(customer.value)}</td>
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

export default CustomerDashboardPage;