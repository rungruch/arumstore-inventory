"use client";

import { getSellTransactionPaginated, getTotalSellTransactionCount, getSellTransactionbyName, updateOrderTransactionStatus, getSellTransactionsByDate, deleteSellTransaction } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddOrderPopup from "@/components/AddOrder";
import Link from "next/link";
import { NavigationLink } from "@/components/providers/navigation-link";
import { OrderStatus, OrderStatusDisplay, STATUS_TRANSITIONS, OrderStatusFilter } from "@/app/firebase/enum"
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import ShippingDetailsForm from "@/components/AddShippingDetail";
import PaymentDetailsForm from "@/components/AddPaymentDetail";
import * as XLSX from 'xlsx-js-style';
import { newTransaction, ExcelExportRow } from '@/components/interface';
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from '@/app/contexts/AuthContext';
import { useUserActivity } from "@/hooks/useUserActivity";


interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
}

interface ModalState2 {
  isOpen: boolean;
  title: string;
  message: string;
  id: string;
}

export default function ProductPage() {
  const [search, setSearch] = useState(""); // Search input state
  const [data, setDatas] = useState<any>([]); // Current categories
  const [showPopup, setShowPopup] = useState(false); // Add popup visibility
  const [lastDoc, setLastDoc] = useState<any | null>(null); // Last document for pagination
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totaAllData, setTotalAllData] = useState(0); // Total number of categories
  const [totalData, setTotalData] = useState(0); // Total number of categories
  const [loading, setLoading] = useState(false); // Loading state
  const [pageSize, setPageSize] = useState(10); // Default page size is 10
  const [trigger, setTrigger] = useState(false);
  const { hasPermission, currentUser } = useAuth(); // Get hasPermission and currentUser from AuthContext

  // Track employee activity on sales page
  useUserActivity({
    profile: 'standard', // Employee-optimized intervals (1min clicks, 30s keyboard)
    trackOnClick: true,
    trackOnKeyboard: true, // Track sales data entry
  });

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
  });
   const [modalState2, setModalState2] = useState<ModalState2>({
      isOpen: false,
      title: "",
      message: "",
      id: ""
    });
  const [shippingDetailsModal, setShippingDetailsModal] = useState<{
    isOpen: boolean;
    transactionId: string | null;
    setShippingMethods?: any | null;
    currentShippingDetails?: any;
  }>({
    isOpen: false,
    transactionId: null,
    currentShippingDetails: undefined
  });
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>(OrderStatusFilter.ALL);
  const [hoveredShipping, setHoveredShipping] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });
  const [paymentDetailsModal, setPaymentDetailsModal] = useState<{
    isOpen: boolean;
    transactionId: string | null;
    shouldPayAmount: number;
    currentPaymentStatus?: string;
    currentPaymentMethod?: string;
    currentPaymentDetails?: any;
  }>({
    isOpen: false,
    transactionId: null,
    shouldPayAmount: 0,
    currentPaymentStatus: undefined,
    currentPaymentMethod: undefined,
    currentPaymentDetails: undefined
  });
  const [hoveredPayment, setHoveredPayment] = useState<string | null>(null);

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const totalAllCount = await getTotalSellTransactionCount();
        setTotalAllData(totalAllCount);
        const { data, lastDoc, count } = await getSellTransactionPaginated(null, pageSize, statusFilter);
        setDatas(data);
        setLastDoc(lastDoc);
        setTotalData(count);
        setShowPopup(false);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageSize, trigger, statusFilter]);

  // Handle page size change
  const handlePageSizeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    setLastDoc(null);

    try {
      setLoading(true);
      const totalCount = await getTotalSellTransactionCount();
      setTotalData(totalCount);
      const { data, lastDoc } = await getSellTransactionPaginated(null, newSize);
      setDatas(data);
      setLastDoc(lastDoc);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search functionality
  const handleSearch = async () => {
    try {
      setLoading(true);
      if (search.trim() === "") {
        // Reset to paginated behavior when search is cleared
        setStatusFilter(OrderStatusFilter.ALL)
        setCurrentPage(1);
        setLastDoc(null);
        const totalCount = await getTotalSellTransactionCount(); // Recalculate total categories
        setTotalData(totalCount);
        const { data, lastDoc } = await getSellTransactionPaginated(null, pageSize);
        setDatas(data);
        setLastDoc(lastDoc);
      } else {
        // Perform search and reset pagination
        const filteredCategories = await getSellTransactionbyName(search);
        setStatusFilter(OrderStatusFilter.ALL)
        setDatas(filteredCategories);
        setCurrentPage(1);
        setTotalData(filteredCategories.length); // Set total to match filtered results
        setLastDoc(null); // Clear lastDoc as search bypasses pagination
      }
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle next page navigation
  const handleNextPage = async () => {
    if (!lastDoc || currentPage === Math.ceil(totalData / pageSize)) return; // Prevent invalid navigation
    try {
      setLoading(true);
      const { data: nextData, lastDoc: newLastDoc } = await getSellTransactionPaginated(
        lastDoc,
        pageSize,
        statusFilter
      );

      setDatas(nextData); // Update categories to the next page
      setLastDoc(newLastDoc); // Update lastDoc
      setCurrentPage(currentPage + 1); // Increment page
    } catch (error) {
      console.error("Error fetching next page:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle previous page navigation
  const handlePrevPage = async () => {
    if (currentPage <= 1) return; // Prevent invalid navigation
    try {
      setLoading(true);
      setCurrentPage(currentPage - 1); // Decrement page
      const { data, lastDoc } = await getSellTransactionPaginated(null, pageSize, statusFilter); // Re-fetch for the page
      setDatas(data);
      setLastDoc(lastDoc);
    } catch (error) {
      console.error("Error fetching previous page:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (
    transactionId: string,
    currentStatus: OrderStatus,
    newStatus: OrderStatus
  ) => {
    try {
      setLoading(true);

      await updateOrderTransactionStatus(transactionId, currentStatus, newStatus, currentUser?.email || 'UNKNOWN');

      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: "สถานะรายการขายถูกอัปเดตเรียบร้อย"
      });

      // Optionally refresh the data or update locally
      setTrigger(prev => !prev);
    } catch (error) {
      console.error("Status update error:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการอัปเดตสถานะ"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {

    try {
      setLoading(true);
      
      // Delete transaction (mark as deleted and update status to CANCELLED)
      await deleteSellTransaction(transactionId, true);

      closeModal2();

      // Show success message
      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: "ลบรายการขายเรียบร้อยแล้ว"
      });

      // Refresh data
      setTrigger(prev => !prev);
    } catch (error) {
      console.error("Delete transaction error:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการลบรายการขาย"
      });
    } finally {
      setLoading(false);
    }
  };

  const closeModal = (): void => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

    const closeModal2 = (): void => {
    setModalState2(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // Update the function to open shipping details modal with current details
  const openShippingDetailsModal = (transactionId: string,shipping_method: string, currentShippingDetails?: any) => {
    setShippingDetailsModal({
      isOpen: true,
      transactionId: transactionId,
      setShippingMethods: shipping_method,
      currentShippingDetails: currentShippingDetails
    });
  };

  // Function to close shipping details modal
  const closeShippingDetailsModal = () => {
    setShippingDetailsModal({
      isOpen: false,
      transactionId: null,
      setShippingMethods: null,
      currentShippingDetails: undefined
    });
  };

  const openPaymentDetailsModal = (transactionId: string, shouldPayAmount: number, currentPaymentStatus: string, currentPaymentMethod: string,currentPaymentDetails: any) => {
    setPaymentDetailsModal({
      isOpen: true,
      transactionId: transactionId,
      shouldPayAmount: shouldPayAmount,
      currentPaymentStatus: currentPaymentStatus,
      currentPaymentMethod: currentPaymentMethod,
      currentPaymentDetails: currentPaymentDetails
    });
  };

  const closePaymentDetailsModal = () => {
    setPaymentDetailsModal({
      isOpen: false,
      transactionId: null,
      shouldPayAmount: 0,
      currentPaymentStatus: undefined,
      currentPaymentMethod: undefined,
      currentPaymentDetails: undefined
    });
  };

  // Toggle Add Category Popup
  const togglePopup = () => setShowPopup(!showPopup);

  // Calculate total pages
  const totalPages = Math.ceil(totalData / pageSize);

  const handleStatusFilterChange = (newStatus: OrderStatusFilter | undefined) => {
    setStatusFilter(newStatus || OrderStatusFilter.ALL);
    setCurrentPage(1);
    setLastDoc(null);
    // The useEffect will handle fetching new data with the filter
  };

  const statusButtons: Array<{ value: OrderStatusFilter; label: string }> = [
    { value: OrderStatusFilter.ALL, label: 'ทั้งหมด' },
    { value: OrderStatusFilter.PENDING, label: OrderStatusDisplay.PENDING  },
    { value: OrderStatusFilter.APPROVED, label: OrderStatusDisplay.APPROVED },
    { value: OrderStatusFilter.SHIPPING, label: OrderStatusDisplay.SHIPPING },
    { value: OrderStatusFilter.CANCELLED, label: OrderStatusDisplay.CANCELLED }
  ];

  const handleExportToExcel = async () => {
    try {
      setLoading(true);
      // Use the selected date range instead of hardcoded dates
      const allTransactions = await getSellTransactionsByDate(
        dateRange.startDate,
        dateRange.endDate
      );

      const excelData: ExcelExportRow[] = (allTransactions as newTransaction[]).map((transaction, idx) => ({
        'ลำดับ': (idx + 1).toString(),
        'รหัสรายการ': transaction.transaction_id,
        'ชื่อ': transaction.client_name,
        'วันที่': transaction.created_date
          ? new Date(transaction.created_date.toDate()).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          : '-',
        'เลขที่ผู้เสียภาษี': transaction.tax_id,
        'ค่าส่ง': Number(transaction.shipping_cost.toFixed(2)),
        'ยอดรวม': Number(transaction.total_amount_no_vat.toFixed(2)),
        'ภาษีมูลค่าเพิ่ม': Number(transaction.total_vat.toFixed(2)),
        'ยอดสุทธิ': Number(transaction.total_amount.toFixed(2)),
        'สถานะ': OrderStatusDisplay[transaction.status as keyof typeof OrderStatusDisplay] || transaction.status
      }));

      // Create worksheet from data
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Add a summary row with Excel SUM formula for 'ยอดสุทธิ'
      const totalRows = excelData.length + 1; // +1 for header row

      excelData.push({
        'ลำดับ': '',
        'รหัสรายการ': '',
        'ชื่อ': 'รวมทั้งหมด',
        'วันที่': '',
        'เลขที่ผู้เสียภาษี': '',
        'ค่าส่ง': { f: `SUM(F3:F${totalRows + 1})` },
        'ยอดรวม': { f: `SUM(G3:G${totalRows + 1})` },
        'ภาษีมูลค่าเพิ่ม': { f: `SUM(H3:H${totalRows + 1})` },
        'ยอดสุทธิ': { f: `SUM(I3:I${totalRows + 1})` },
        'สถานะ': ''
      });

      // Move the table data below
      XLSX.utils.sheet_add_json(ws, excelData, { origin: "A2", skipHeader: false });

      // add header and merge
      ws['A1'] = {
        t: 's',
        v: `รายการขายระหว่าง ${dateRange.startDate.toLocaleDateString('th-TH')} ถึง ${dateRange.endDate.toLocaleDateString('th-TH')}`,
        s: {
          font: { bold: true, sz: 11 },
          alignment: { horizontal: 'center', vertical: 'center' },
          fill: { patternType: "solid", fgColor: { rgb: "D9D9D9" } }
        }
      };
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Object.keys(excelData[0] || {}).length - 1 } }];

      const colWidths = [
        { wch: 5 },
        { wch: 15 },
        { wch: 60 },
        { wch: 10 },
        { wch: 30 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "รายการขาย");

      // Generate filename with current date
      const fileName = `รายงานยอดขาย_${dateRange.startDate.toLocaleDateString('th-TH')}_${dateRange.endDate.toLocaleDateString('th-TH')}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: "เกิดข้อผิดพลาดในการส่งออกข้อมูล"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <ProtectedRoute module="sales" action="view">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
      />

      <Modal
        isOpen={modalState2.isOpen}
        onClose={closeModal2}
        title={modalState2.title}
        message={modalState2.message}
        onConfirm={() => handleDeleteTransaction(modalState2.id)}  
        />

      {shippingDetailsModal.isOpen && shippingDetailsModal.transactionId && (
        <ShippingDetailsForm
          transactionId={shippingDetailsModal.transactionId}
          currentShippingMethods={shippingDetailsModal.setShippingMethods}
          currentShippingDetails={shippingDetailsModal.currentShippingDetails?.shipping_details}
          onSubmitSuccess={() => {
            // Close the modal
            closeShippingDetailsModal();

            // Show success modal
            setModalState({
              isOpen: true,
              title: ModalTitle.SUCCESS,
              message: "บันทึกข้อมูลการจัดส่งสำเร็จ"
            });

            // Refresh data
            setTrigger(prev => !prev);
          }}
          onCancel={closeShippingDetailsModal}
        />
      )}

      {paymentDetailsModal.isOpen && paymentDetailsModal.transactionId && (
        <PaymentDetailsForm
          transactionId={paymentDetailsModal.transactionId}
          shouldPayAmount={paymentDetailsModal.shouldPayAmount || 0}
          currentPaymentStatus={paymentDetailsModal.currentPaymentStatus || "NONE"} 
          currentPaymentMethod={paymentDetailsModal.currentPaymentMethod || ""}  
          currentPaymentDetails={paymentDetailsModal.currentPaymentDetails}
          onSubmitSuccess={() => {
            // Close the modal
            closePaymentDetailsModal();

            // Show success modal
            setModalState({
              isOpen: true,
              title: ModalTitle.SUCCESS,
              message: "บันทึกข้อมูลการชำระสำเร็จ"
            });

            // Refresh data
            setTrigger(prev => !prev);
          } }
          onCancel={closePaymentDetailsModal}      />
      )}

      <div className="container mx-auto p-5">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div>
            <h1 className="text-2xl font-bold">รายการขาย</h1>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              จำนวน {totaAllData} รายการ
            </h2>
          </div>
          {hasPermission('sales', 'create') && (
            <button
              onClick={togglePopup}
              className="mt-2 sm:mt-0 text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition w-full sm:w-auto"
            >
              เพิ่มรายการขาย
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {statusButtons.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleStatusFilterChange(value)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${statusFilter === value
                  ? "bg-gray-900 dark:bg-gray-800 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
            >
              {label}
              {statusFilter === value ? ` (${totalData})` : ""}
            </button>
          ))}
        </div>

        {/* Search, Date Range, Export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <input
            type="text"
            placeholder="ค้นหาโดยชื่อลูกค้า"
            className="border p-2 rounded-md w-full md:w-1/3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="flex flex-col xs:flex-row items-center gap-2 w-full">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="date"
                  value={dateRange.startDate.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: new Date(e.target.value),
                    }))
                  }
                  className="border rounded-md p-2 w-full"
                />
                <span className="hidden xs:inline">ถึง</span>
                <span className="xs:hidden">-</span>
                <input
                  type="date"
                  value={dateRange.endDate.toISOString().split("T")[0]}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: new Date(e.target.value),
                    }))
                  }
                  className="border rounded-md p-2 w-full"
                />
              </div>
              <button
                onClick={handleExportToExcel}
                disabled={loading}
                className="text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition disabled:bg-gray-400 w-full xs:w-auto"
              >
                {loading ? "กำลังส่งออก..." : "ส่งออกรายการ"}
              </button>
            </div>
          </div>
        </div>

        {/* Data Table with Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
            <span className="ml-4 text-gray-500">Loading...</span>
          </div>
        ) : (
          <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
            {showPopup && <div><AddOrderPopup trigger={trigger} setTrigger={setTrigger} /></div>}
            <div className="mb-10" />
            <FlexTable
              datas={data}
              customHeader={
                <tr className="text-left h-[9vh]">
                  <th className="p-2 w-[5%] text-center">#</th>
                  <th className="p-2 w-[10%]">วันที่</th>
                  <th className="p-2 w-[10%]">รายการ</th>
                  <th className="p-2 w-[25%]">ลูกค้า</th>
                  <th className="p-2 w-[10%]">ชื่อแชท</th>
                  <th className="p-2 flex-1">มูลค่า</th>
                  <th className="p-2 flex-1">สถานะ</th>
                  <th className="p-2 flex-1">วันส่งสินค้า</th>
                  <th className="p-2 flex-1">ชำระเงิน</th>
                  <th className="p-2 w-[5%]"> </th>
                </tr>
              }
              customRow={(data, index) => (
                <tr key={data.id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800">
                  <td className="p-2 w-[5%] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
                  <td className="p-2 w-[10%] whitespace-nowrap overflow-hidden text-ellipsis">
                    {data.created_date ?
                      new Date(data.created_date.toDate()).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      : "-"}
                  </td>
                  <td
                    className="p-2 w-[10%] whitespace-nowrap"
                    onMouseEnter={(e) => {
                      setHoveredRow(data.transaction_id);
                      setTooltipPosition({
                        x: e.clientX,
                        y: e.clientY
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltipPosition({
                        x: e.clientX,
                        y: e.clientY
                      });
                    }}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <div className="cursor-pointer hover:underline">
                      {data.transaction_id}
                      {hoveredRow === data.transaction_id && (
                        <div
                          className="absolute bg-white border border-gray-200 shadow-lg rounded-md p-3 z-50 dark:bg-zinc-800 transaction-tooltip"
                          style={{
                            top: window.innerWidth <= 768 ? '50%' : `${tooltipPosition.y - 90}px`,
                            left: window.innerWidth <= 768 ? '50%' : `${tooltipPosition.x + 20}px`,
                            transform: window.innerWidth <= 768 ? 'translate(-50%, -50%)' : 'none',
                            width: window.innerWidth <= 768 ? '90vw' : '350px',
                            maxHeight: '70vh',
                            overflow: 'auto',
                            position: window.innerWidth <= 768 ? 'fixed' : 'absolute'
                          }}
                        >
                          <h3 className="font-bold text-gray-800 border-b pb-1 mb-2 dark:text-white flex items-center justify-between">
                            <span>{data.transaction_id}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setHoveredRow(null);
                              }}
                              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </h3>
                          
                          <div className="text-sm grid grid-cols-2 gap-x-2 gap-y-1">
                            <p><span className="font-semibold dark:text-gray-200">วันที่:</span> {data.created_date ?
                              new Date(data.created_date.toDate()).toLocaleString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "-"}
                            </p>
                            <p><span className="font-semibold">ลูกค้า:</span> {data.client_name}</p>
                            <p><span className="font-semibold">มูลค่า:</span> {data.total_amount} บาท</p>
                            <p><span className="font-semibold">ช่องทางขาย:</span> {data.sell_method}</p>
                            
                            {data.payment_method && (
                              <p><span className="font-semibold">ชำระโดย:</span> {data.payment_method}</p>
                            )}
                            {data.note && (
                              <p><span className="font-semibold">หมายเหตุ:</span> {data.note}</p>
                            )}
                            
                            <div className="col-span-2 mt-2 border-t pt-2">
                              <p className="font-semibold">คลังสินค้า: {data.warehouse}</p>
                              <p className="font-semibold">รายการสินค้า:</p>
                              <div className="pl-2 mt-1 max-h-28 overflow-y-auto">
                                {data.items.map((item: any, idx: any) => (
                                  <div key={idx} className="break-words text-xs">
                                    - {item.name} ({item.price}฿) : {item.quantity} ชิ้น
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {data.shipping_details && (
                              <div className="col-span-2 mt-2 pt-1 border-t">
                                <p><span className="font-semibold">ส่งโดย:</span> {data.shipping_details.shipping_method}</p>
                                {data.shipping_details.tracking_number && (
                                  <p><span className="font-semibold">เลขพัสดุ:</span> {data.shipping_details.tracking_number}</p>
                                )}
                              </div>
                            )}
                            
                            {data.notes && (
                              <div className="col-span-2 mt-1">
                                <p><span className="font-semibold">หมายเหตุ:</span> {data.notes}</p>
                              </div>
                            )}
                            
                            <div className="col-span-2 mt-2 text-xs text-gray-500 border-t pt-1">
                              <div className="flex flex-col xs:flex-row xs:justify-between">
                                <p className="truncate">สร้างโดย: {data.created_by}</p>
                                <p className="truncate">อัพเดตล่าสุด: {data.updated_by}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2 w-[25%] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                  title={data.client_name}>
                    <NavigationLink href={`/contacts/${data.client_id}`} className=" hover:underline">
                      {data.client_name}
                    </NavigationLink>
                  </td>
                  <td 
                    className="p-2 w-[10%] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] relative"
                    title={data.client_chat_name}
                  >
                    {data.client_chat_name}
                  </td>
                  <td className="p-2 flex-1">{data.total_amount}</td>
                  <td className="p-2">
                    <div className="relative" style={{ width: "120px" }}>
                        <select
                          value={data.status}
                          onChange={(e) => handleStatusChange(
                            data.transaction_id,
                            data.status,
                            e.target.value as OrderStatus
                          )}
                          disabled={!hasPermission('sales', 'edit')}
                          className={`w-full px-3 py-2 text-sm appearance-none rounded-md bg-white dark:bg-gray-800 border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-colors ${data.status === OrderStatus.SHIPPING ? 'text-yellow-600 dark:text-yellow-500' : ''} ${data.status === OrderStatus.APPROVED ? 'text-green-600' : ''} ${data.status === OrderStatus.CANCELLED ? 'text-red-500 dark:text-red-600' : ''} ${!hasPermission('sales', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
                          style={{ paddingRight: "2.5rem" }}
                        >
                        <option value={OrderStatus.PENDING} disabled={!STATUS_TRANSITIONS[data.status as keyof typeof STATUS_TRANSITIONS]?.includes(OrderStatus.PENDING)}>
                          {OrderStatusDisplay.PENDING}
                        </option>
                        <option value={OrderStatus.APPROVED} disabled={!STATUS_TRANSITIONS[data.status as keyof typeof STATUS_TRANSITIONS]?.includes(OrderStatus.APPROVED)}>
                          {OrderStatusDisplay.APPROVED}
                        </option>
                        <option value={OrderStatus.SHIPPING} disabled={!STATUS_TRANSITIONS[data.status as keyof typeof STATUS_TRANSITIONS]?.includes(OrderStatus.SHIPPING)}>
                          {OrderStatusDisplay.SHIPPING}
                        </option>
                        <option value={OrderStatus.CANCELLED} disabled={!STATUS_TRANSITIONS[data.status as keyof typeof STATUS_TRANSITIONS]?.includes(OrderStatus.CANCELLED)}>
                          {OrderStatusDisplay.CANCELLED}
                        </option>
                        </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td 
                  className="p-2 whitespace-nowrap"
                  onMouseEnter={(e) => {
                    setHoveredShipping(data.transaction_id);
                    setTooltipPosition({
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseMove={(e) => {
                    setTooltipPosition({
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseLeave={(e) => {
                    setHoveredShipping(null)
                  }}
                  >
                    {data.shipping_details ? (
                      <div
                        onClick={() => openShippingDetailsModal(data.transaction_id,data.shipping_method, data)}
                      >
                        <div
                          className="cursor-pointer hover:underline"
                        >
                          {new Date(data.shipping_details.shipping_date.toDate()).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {hoveredShipping === data.transaction_id && (
                            <div
                              className="absolute bg-white border border-gray-200 shadow-lg rounded-md p-3 z-50 tooltip-container dark:bg-zinc-800"
                              style={{
                                top: window.innerWidth <= 768 ? '50%' : `${tooltipPosition.y}px`,
                                left: window.innerWidth <= 768 ? '50%' : `${tooltipPosition.x + 20}px`,
                                transform: window.innerWidth <= 768 ? 'translate(-50%, -50%)' : 'none',
                                maxWidth: window.innerWidth <= 768 ? '90vw' : '450px',
                                maxHeight: '80vh',
                                overflow: 'auto',
                                position: window.innerWidth <= 768 ? 'fixed' : 'absolute'
                              }}
                            >
                              <h3 className="font-bold text-gray-800 border-b pb-1 mb-2 dark:text-white">รายละเอียดการจัดส่ง</h3>
                              <div className="text-sm space-y-1">
                                <p><span className="font-semibold">วิธีการจัดส่ง:</span> {data.shipping_details.shipping_method}</p>
                                <p><span className="font-semibold">วันที่ส่ง:</span> {
                                  new Date(data.shipping_details.shipping_date.toDate()).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })
                                }</p>
                                {data.shipping_details.tracking_number && (
                                  <p><span className="font-semibold">เลขพัสดุ:</span> {data.shipping_details.tracking_number}</p>
                                )}
                                {data.shipping_details.image && (
                                  <img
                                    src={data.shipping_details.image}
                                    alt="Uploaded preview"
                                    className="mt-4 w-48 h-48 object-cover rounded-md shadow-md"
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-zinc-300">
                          {data.shipping_details.shipping_method}
                        </div>
                      </div>
                    ) : (
                        hasPermission('sales', 'edit') ? (
                        <button
                          onClick={() => openShippingDetailsModal(data.transaction_id,data.shipping_method)}
                          className="text-blue-900 hover:text-blue-600 dark:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          เพิ่มข้อมูลส่ง
                        </button>
                        ) : null
                    )}
                  </td>
                  <td 
                  className="p-2 whitespace-nowrap"
                  onMouseEnter={(e) => {
                    setHoveredPayment(data.transaction_id);
                    setTooltipPosition({
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseMove={(e) => {
                    setTooltipPosition({
                      x: e.clientX,
                      y: e.clientY
                    });
                  }}
                  onMouseLeave={() => setHoveredPayment(null)}
                  >
                    {data.payment_details ? (
                      <div
                        onClick={() => openPaymentDetailsModal(data.transaction_id, data.total_amount, data.payment_status, data.payment_method, data.payment_details)}
                     >
                        <div
                          className="cursor-pointer hover:underline"
                        >
                          {new Date(data.payment_details.payment_date.toDate()).toLocaleString('th-TH', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                          {hoveredPayment === data.transaction_id && (
                            <div
                              className="absolute bg-white border border-gray-200 shadow-lg rounded-md p-3 z-50 tooltip-container dark:bg-zinc-800"
                              style={{
                                top: window.innerWidth <= 768 ? '50%' : `${tooltipPosition.y}px`,
                                left: window.innerWidth <= 768 ? '50%' : `${tooltipPosition.x - 240}px`,
                                transform: window.innerWidth <= 768 ? 'translate(-50%, -50%)' : 'none',
                                minHeight: '100px',
                                maxWidth: window.innerWidth <= 768 ? '90vw' : '450px',
                                maxHeight: '80vh',
                                overflow: 'auto',
                                position: window.innerWidth <= 768 ? 'fixed' : 'absolute'
                              }}
                            >
                              <h3 className="font-bold text-gray-800 border-b pb-1 mb-2 dark:text-white">รายละเอียดการชำระเงิน</h3>
                              <div className="text-sm space-y-1">
                                <p><span className="font-semibold">สถานะ:</span> {data.payment_status === 'PAID' ? 'ชำระแล้ว' : 'รอชำระ'}</p>
                                <p><span className="font-semibold">ยอดรวม:</span> {data.payment_details.payment_amount} บาท</p>
                                <p><span className="font-semibold">วิธีการชำระเงิน:</span> {data.payment_method}</p>
                                <p><span className="font-semibold">วันที่ชำระ:</span> {
                                  new Date(data.payment_details.payment_date.toDate()).toLocaleString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'

                                  })
                                }</p>
                                {data.payment_details.image && (
                                  <img
                                    src={data.payment_details.image}
                                    alt="Payment proof"
                                    className="mt-4 w-48 h-48 object-cover rounded-md shadow-md"
                                  />
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-zinc-300">
                          {data.payment_method}
                        </div>
                      </div>
                    ) : (
                      hasPermission('sales', 'edit') && (
                        <button
                          onClick={() => openPaymentDetailsModal(data.transaction_id, data.total_amount, data.payment_status, data.payment_method, data.payment_details)}
                          className="text-blue-900 hover:text-blue-600 dark:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1"
                        >
                          รอชำระ
                        </button>
                      )
                    )}
                  </td>
                  <td className="p-2 w-[5%] relative">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent event from bubbling up
                          // Toggle dropdown visibility
                          const dropdown = document.getElementById(`more-dropdown-${data.transaction_id}`);

                          // Close all other dropdowns first
                          document.querySelectorAll('[id^="more-dropdown-"]').forEach(el => {
                            if (el.id !== `more-dropdown-${data.transaction_id}`) {
                              el.classList.add('hidden');
                              // Clean up any existing event listeners
                              const existingEvents = (el as any)._eventCleanup;
                              if (existingEvents) {
                                existingEvents();
                                delete (el as any)._eventCleanup;
                              }
                            }
                          });

                          if (dropdown) {
                            dropdown.classList.toggle('hidden');

                            // Position the dropdown relative to the button
                            if (!dropdown.classList.contains('hidden')) {
                              const button = e.currentTarget;
                              const rect = button.getBoundingClientRect();

                              // Calculate position for fixed positioning (no need for scroll offset)
                              let topPosition = rect.bottom;
                              let leftPosition = rect.right - dropdown.offsetWidth;

                              // Check if dropdown would go off right edge
                              if (leftPosition < 0) {
                                leftPosition = rect.left;
                              }

                              // Check if dropdown would go off bottom of viewport
                              const viewportHeight = window.innerHeight;
                              const dropdownHeight = dropdown.offsetHeight || 200; // fallback height
                              const spaceBelow = viewportHeight - rect.bottom;
                              
                              if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                                // Not enough space below, position above if there's space
                                topPosition = rect.top - dropdownHeight;
                              } else if (spaceBelow < dropdownHeight) {
                                // Not enough space above or below, position at top of screen with scrolling
                                topPosition = 10;
                              }
                              
                              // Apply positioning
                              dropdown.style.top = `${topPosition}px`;
                              dropdown.style.left = `${leftPosition}px`;
                              dropdown.style.zIndex = '9999';

                              // Add scroll event listener to reposition dropdown during scroll
                              const updatePosition = () => {
                                if (!dropdown.classList.contains('hidden')) {
                                  const newRect = button.getBoundingClientRect();
                                  let newTopPosition = newRect.bottom;
                                  let newLeftPosition = newRect.right - dropdown.offsetWidth;

                                  if (newLeftPosition < 0) {
                                    newLeftPosition = newRect.left;
                                  }

                                  const viewportHeight = window.innerHeight;
                                  const dropdownHeight = dropdown.offsetHeight || 200;
                                  const spaceBelow = viewportHeight - newRect.bottom;
                                  
                                  if (spaceBelow < dropdownHeight && newRect.top > dropdownHeight) {
                                    newTopPosition = newRect.top - dropdownHeight;
                                  } else if (spaceBelow < dropdownHeight) {
                                    newTopPosition = 10;
                                  }

                                  dropdown.style.top = `${newTopPosition}px`;
                                  dropdown.style.left = `${newLeftPosition}px`;
                                }
                              };

                              // Add event listeners for repositioning and closing
                              const scrollHandler = updatePosition;
                              const resizeHandler = updatePosition;

                              // Store cleanup function for later use
                              const cleanup = () => {
                                window.removeEventListener('scroll', scrollHandler, true);
                                window.removeEventListener('resize', resizeHandler);
                              };
                              (dropdown as any)._eventCleanup = cleanup;

                              // Add click event listener to document to close dropdown when clicking outside
                              setTimeout(() => {
                                const clickHandler = (event: MouseEvent) => {
                                  if (!dropdown.contains(event.target as Node) && event.target !== button) {
                                    dropdown.classList.add('hidden');
                                    document.removeEventListener('click', clickHandler);
                                    cleanup();
                                    delete (dropdown as any)._eventCleanup;
                                  }
                                };

                                document.addEventListener('click', clickHandler);
                                window.addEventListener('scroll', scrollHandler, true); // Use capture phase for all scroll events
                                window.addEventListener('resize', resizeHandler);
                              }, 0);
                            }
                          }
                        }}
                        className="flex items-center text-blue-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-gray-300 whitespace-nowrap text-sm hover:bg-gray-300 dark:hover:bg-zinc-700 rounded transition-colors duration-200"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
                        </svg>
                      </button>

                        {/* Move dropdown to portal root to avoid table containment issues */}
                        <div
                        id={`more-dropdown-${data.transaction_id}`}
                        className="fixed hidden z-50 w-56 bg-white shadow-lg rounded-md border border-gray-200 dark:bg-zinc-800 max-h-[80vh] overflow-y-auto"
                        >
                        <div className="py-1">
                          {hasPermission('sales', 'create') && (
                            <>
                          <Link href={`/sales/create?ref=${data.transaction_id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700" target="_blank" rel="noopener noreferrer">
                            สร้างรายการซ้ำ
                          </Link>
                          </>
                          )}
                          {/* Collapsible Print Documents Section */}
                          <div className="border-t border-gray-200 my-1" />
                          <div>
                            <button
                              onClick={() => {
                                const collapseElement = document.getElementById(`print-collapse-${data.transaction_id}`);
                                if (collapseElement) {
                                  collapseElement.classList.toggle('hidden');
                                }
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 flex items-center justify-between"
                            >
                              <span>พิมพ์เอกสาร</span>
                              <svg 
                                className="w-4 h-4 transition-transform duration-200" 
                                xmlns="http://www.w3.org/2000/svg" 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            <div id={`print-collapse-${data.transaction_id}`} className="hidden">
                              <Link href={`/documents/tax?transaction_id=${data.transaction_id}`} className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" target="_blank" rel="noopener noreferrer">
                                พิมพ์เอกสาร
                              </Link>
                              <Link href={`/documents/invoice-generated?transaction_id=${data.transaction_id}`} className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" target="_blank" rel="noopener noreferrer">
                                พิมพ์ใบกำกับภาษี/ใบเสร็จรับเงิน
                              </Link>
                              <Link href={`/documents/quotation-generated?transaction_id=${data.transaction_id}`} className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" target="_blank" rel="noopener noreferrer">
                                พิมพ์ใบเสนอราคา
                              </Link>
                              <Link href={`/documents/simplify-invoice-generated?transaction_id=${data.transaction_id}`} className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" target="_blank" rel="noopener noreferrer">
                                พิมพ์ใบแจ้งหนี้
                              </Link>
                              <Link href={`/documents/shipping-generated?transaction_id=${data.transaction_id}`} className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" target="_blank" rel="noopener noreferrer">
                                พิมพ์ใบส่งสินค้า
                              </Link>
                              <Link href={`/documents/shipping-label-generated?transaction_id=${data.transaction_id}`} className="block px-8 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700" target="_blank" rel="noopener noreferrer">
                                พิมพ์ฉลากจัดส่ง
                              </Link>
                            </div>
                          </div>
                          {(data.status === OrderStatus.PENDING || data.status === OrderStatus.SHIPPING) && hasPermission('sales', 'delete') && (
                            <>
                              <div className="border-t border-gray-200 my-1" />
                              <button
                                onClick={() => {
                                  // Close the dropdown
                                  const dropdown = document.getElementById(`more-dropdown-${data.transaction_id}`);
                                  if (dropdown) {
                                    dropdown.classList.add('hidden');
                                  }

                                  setModalState2({
                                    isOpen: true,
                                    title: ModalTitle.DELETE,
                                    message: `คุณต้องการลบรายการ ${data.transaction_id} ใช่หรือไม่?`,
                                    id: data.transaction_id
                                  });
                                }}
                                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-700"
                              >
                                ลบรายการขาย
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            />
          </div>
        )}

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-gray-700 dark:text-white">แถว/หน้า:</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="border rounded-md p-2"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          {/* Pagination (unchanged) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || search.trim() !== ""}
              className={`px-3 py-2 rounded-md transition ${currentPage === 1 || search.trim() !== ""
                ? "bg-gray-300 dark:bg-zinc-700 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
            >
              <ChevronLeft size={16} className="inline-block" />
            </button>
            <span className="py-2 text-gray-700 dark:text-white">{currentPage} / {totalPages}</span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || !lastDoc || search.trim() !== ""}
              className={`px-3 py-2 rounded-md transition ${currentPage === totalPages || !lastDoc || search.trim() !== ""
                ? "bg-gray-300 dark:bg-zinc-700 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
            >
              <ChevronRight size={16} className="inline-block" />
            </button>
          </div>
        </div>
      </div>
      </ProtectedRoute>
    </> 
  );
}