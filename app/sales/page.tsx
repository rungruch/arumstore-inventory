"use client";

import { getSellTransactionPaginated, getTotalSellTransactionCount, getSellTransactionbyName, updateOrderTransactionStatus, getSellTransactionsByDate, deleteSellTransaction } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddOrderPopup from "@/components/AddOrder";
import Link from "next/link";
import { NavigationLink } from "@/components/providers/navigation-link";
import { OrderStatus, OrderStatusDisplay, STATUS_TRANSITIONS, OrderStatusFilter, PaymentStatus, PaymentStatusDisplay, PaymentStatusFilter, ShippingStatus, ShippingStatusDisplay, ShippingStatusFilter } from "@/app/firebase/enum"
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import ShippingDetailsForm from "@/components/AddShippingDetail";
import PaymentDetailsForm from "@/components/AddPaymentDetail";
import * as XLSX from 'xlsx-js-style';
import { newTransaction, ExcelExportRow } from '@/components/interface';
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from '@/app/contexts/AuthContext';
import { useUserActivity } from "@/hooks/useUserActivity";
import { generateEncryptedTrackingUrl } from "@/lib/encryption-utils";


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

export default function salesPage() {
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
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>(PaymentStatusFilter.ALL);
  const [shippingStatusFilter, setShippingStatusFilter] = useState<ShippingStatusFilter>(ShippingStatusFilter.ALL);
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(true);
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
        const totalAllCount = await getTotalSellTransactionCount(statusFilter, paymentStatusFilter, shippingStatusFilter);
        setTotalAllData(totalAllCount);
        const { data, lastDoc, count } = await getSellTransactionPaginated(null, pageSize, statusFilter, paymentStatusFilter, shippingStatusFilter);
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
  }, [pageSize, trigger, statusFilter, paymentStatusFilter, shippingStatusFilter]);

  // Handle page size change
  const handlePageSizeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    setLastDoc(null);

    try {
      setLoading(true);
      const totalCount = await getTotalSellTransactionCount(statusFilter, paymentStatusFilter, shippingStatusFilter);
      setTotalData(totalCount);
      const { data, lastDoc } = await getSellTransactionPaginated(null, newSize, statusFilter, paymentStatusFilter, shippingStatusFilter);
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
        const totalCount = await getTotalSellTransactionCount(statusFilter, paymentStatusFilter, shippingStatusFilter); // Recalculate total categories
        setTotalData(totalCount);
        const { data, lastDoc } = await getSellTransactionPaginated(null, pageSize, statusFilter, paymentStatusFilter, shippingStatusFilter);
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
        statusFilter,
        paymentStatusFilter,
        shippingStatusFilter
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
      const { data, lastDoc } = await getSellTransactionPaginated(null, pageSize, statusFilter, paymentStatusFilter, shippingStatusFilter); // Re-fetch for the page
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

  const handlePaymentStatusFilterChange = (newStatus: PaymentStatusFilter | undefined) => {
    setPaymentStatusFilter(newStatus || PaymentStatusFilter.ALL);
    setCurrentPage(1);
    setLastDoc(null);
  };

  const handleShippingStatusFilterChange = (newStatus: ShippingStatusFilter | undefined) => {
    setShippingStatusFilter(newStatus || ShippingStatusFilter.ALL);
    setCurrentPage(1);
    setLastDoc(null);
  };

  // Function to copy encrypted tracking link to clipboard
  const copyEncryptedTrackingLink = async (transactionId: string) => {
    try {
      const encryptedUrl = generateEncryptedTrackingUrl(transactionId);
      await navigator.clipboard.writeText(encryptedUrl);
      
      // // Show success message
      // setModalState({
      //   isOpen: true,
      //   title: ModalTitle.SUCCESS,
      //   message: "คัดลอกลิงก์ติดตามปลอดภัยแล้ว"
      // });

      // Close the dropdown
      const dropdown = document.getElementById(`more-dropdown-${transactionId}`);
      if (dropdown) {
        dropdown.classList.add('hidden');
      }
    } catch (error) {
      console.error('Error copying encrypted tracking link:', error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: "เกิดข้อผิดพลาดในการคัดลอกลิงก์ติดตาม"
      });
    }
  };

  const statusButtons: Array<{ value: OrderStatusFilter; label: string }> = [
    { value: OrderStatusFilter.ALL, label: 'ทั้งหมด' },
    { value: OrderStatusFilter.PENDING, label: OrderStatusDisplay.PENDING  },
    { value: OrderStatusFilter.APPROVED, label: OrderStatusDisplay.APPROVED },
    { value: OrderStatusFilter.SHIPPING, label: OrderStatusDisplay.SHIPPING },
    { value: OrderStatusFilter.CANCELLED, label: OrderStatusDisplay.CANCELLED }
  ];

  const paymentStatusButtons: Array<{ value: PaymentStatusFilter; label: string }> = [
    { value: PaymentStatusFilter.ALL, label: 'ทั้งหมด' },
    { value: PaymentStatusFilter.PENDING, label: PaymentStatusDisplay.NONE },
    { value: PaymentStatusFilter.COMPLETED, label: PaymentStatusDisplay.PAID }
  ];

  const shippingStatusButtons: Array<{ value: ShippingStatusFilter; label: string }> = [
    { value: ShippingStatusFilter.ALL, label: 'ทั้งหมด' },
    { value: ShippingStatusFilter.PENDING, label: ShippingStatusDisplay.PENDING },
    { value: ShippingStatusFilter.SHIPPED, label: ShippingStatusDisplay.SHIPPED }
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
          currentPaymentStatus={paymentDetailsModal.currentPaymentStatus || PaymentStatus.PENDING} 
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายการขาย</h1>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              จำนวน {totaAllData} รายการ
            </h2>
          </div>
          {hasPermission('sales', 'create') && (
            <button
              onClick={togglePopup}
              className="text-white py-3 px-4 sm:px-6 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold tracking-wide text-sm sm:text-base whitespace-nowrap"
            >
              เพิ่มรายการขาย
            </button>
          )}
        </div>

        {/* Enhanced Search and Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 backdrop-blur-sm">
          {/* Search Section */}
          <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              {/* Search Input */}
              <div className="flex-1 max-w-lg">
                <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  <div className="p-1.5 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg mr-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  ค้นหาข้อมูล
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="ค้นหาโดยชื่อลูกค้า..."
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Date Range and Export Section */}
              <div className="flex flex-col sm:flex-row gap-6 lg:ml-8">
                {/* Date Range */}
                <div className="flex flex-col">
                  <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <div className="p-1.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg mr-2">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    ช่วงวันที่ส่งออก
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={dateRange.startDate.toISOString().split("T")[0]}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          startDate: new Date(e.target.value),
                        }))
                      }
                      className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
                    />
                    <div className="flex items-center justify-center w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                      </svg>
                    </div>
                    <input
                      type="date"
                      value={dateRange.endDate.toISOString().split("T")[0]}
                      onChange={(e) =>
                        setDateRange((prev) => ({
                          ...prev,
                          endDate: new Date(e.target.value),
                        }))
                      }
                      className="border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
                    />
                  </div>
                </div>

                {/* Export Button */}
                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleExportToExcel}
                    disabled={loading}
                    className={`inline-flex items-center px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 backdrop-blur-sm ${
                      loading
                        ? 'bg-gray-400/70 cursor-not-allowed transform-none backdrop-blur-sm'
                        : 'bg-gradient-to-r from-emerald-500/80 to-teal-600/80 hover:from-emerald-600/90 hover:to-teal-700/90 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:ring-offset-2 border border-white/20 backdrop-blur-md'
                    }`}
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    {loading ? "กำลังส่งออก..." : "ส่งออก Excel"}
                    {loading && (
                      <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg mr-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z"></path>
                </svg>
              </div>
              ตัวกรองข้อมูล
              {/* Active filters count */}
              {(statusFilter !== OrderStatusFilter.ALL || paymentStatusFilter !== PaymentStatusFilter.ALL || shippingStatusFilter !== ShippingStatusFilter.ALL) && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-500 text-white rounded-full">
                  {[
                    statusFilter !== OrderStatusFilter.ALL,
                    paymentStatusFilter !== PaymentStatusFilter.ALL,
                    shippingStatusFilter !== ShippingStatusFilter.ALL
                  ].filter(Boolean).length}
                </span>
              )}
            </h3>
            
            {/* Toggle Button */}
            <button
              onClick={() => setIsFilterCollapsed(!isFilterCollapsed)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-all duration-200 border border-gray-300 dark:border-gray-600"
            >
              <span>{isFilterCollapsed ? 'แสดงตัวกรอง' : 'ซ่อนตัวกรอง'}</span>
              <svg 
                className={`w-4 h-4 transform transition-transform duration-200 ${isFilterCollapsed ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
          </div>
          
          {/* Compact Summary when collapsed */}
          {isFilterCollapsed && (statusFilter !== OrderStatusFilter.ALL || paymentStatusFilter !== PaymentStatusFilter.ALL || shippingStatusFilter !== ShippingStatusFilter.ALL) && (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ตัวกรองที่ใช้งาน:</span>
                {statusFilter !== OrderStatusFilter.ALL && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-600 text-white">
                    คำสั่งซื้อ: {statusButtons.find(b => b.value === statusFilter)?.label}
                  </span>
                )}
                {paymentStatusFilter !== PaymentStatusFilter.ALL && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-500 text-white">
                    ชำระเงิน: {paymentStatusButtons.find(b => b.value === paymentStatusFilter)?.label}
                  </span>
                )}
                {shippingStatusFilter !== ShippingStatusFilter.ALL && (
                  <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500 text-white">
                    จัดส่ง: {shippingStatusButtons.find(b => b.value === shippingStatusFilter)?.label}
                  </span>
                )}
                <button
                  onClick={() => {
                    setStatusFilter(OrderStatusFilter.ALL);
                    setPaymentStatusFilter(PaymentStatusFilter.ALL);
                    setShippingStatusFilter(ShippingStatusFilter.ALL);
                  }}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                  ล้าง
                </button>
              </div>
            </div>
          )}
          
          {/* Collapsible Filter Content */}
          <div className={`transition-all duration-300 overflow-hidden ${
            isFilterCollapsed ? 'max-h-0 opacity-0' : 'max-h-none opacity-100'
          }`}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Status Filter */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-5 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-500 rounded-full">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                </div>
                <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">สถานะคำสั่งซื้อ</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusButtons.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleStatusFilterChange(value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      statusFilter === value
                        ? "bg-gray-900 dark:bg-gray-700 text-white shadow-lg transform scale-105 border-gray-900 dark:border-gray-700"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {label}
                    {statusFilter === value && totalData > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs bg-white/30 text-white backdrop-blur-sm rounded-full border border-white/20">
                        {totalData}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Status Filter */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-5 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">สถานะการชำระเงิน</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {paymentStatusButtons.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handlePaymentStatusFilterChange(value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      paymentStatusFilter === value
                        ? "bg-gray-900 dark:bg-gray-700 text-white shadow-lg transform scale-105 border-gray-900 dark:border-gray-700"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Shipping Status Filter */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-5 border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-300">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 bg-green-500 rounded-full">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200">สถานะการจัดส่ง</h4>
              </div>
              <div className="flex flex-wrap gap-2">
                {shippingStatusButtons.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleShippingStatusFilterChange(value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      shippingStatusFilter === value
                        ? "bg-gray-900 dark:bg-gray-700 text-white shadow-lg transform scale-105 border-gray-900 dark:border-gray-700"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(statusFilter !== OrderStatusFilter.ALL || paymentStatusFilter !== PaymentStatusFilter.ALL || shippingStatusFilter !== ShippingStatusFilter.ALL) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ตัวกรองที่ใช้งาน:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {statusFilter !== OrderStatusFilter.ALL && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                        <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        คำสั่งซื้อ: {statusButtons.find(b => b.value === statusFilter)?.label}
                      </span>
                    )}
                    {paymentStatusFilter !== PaymentStatusFilter.ALL && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                        <svg className="w-3 h-3 mr-1.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        ชำระเงิน: {paymentStatusButtons.find(b => b.value === paymentStatusFilter)?.label}
                      </span>
                    )}
                    {shippingStatusFilter !== ShippingStatusFilter.ALL && (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600">
                        <svg className="w-3 h-3 mr-1.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                        จัดส่ง: {shippingStatusButtons.find(b => b.value === shippingStatusFilter)?.label}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setStatusFilter(OrderStatusFilter.ALL);
                    setPaymentStatusFilter(PaymentStatusFilter.ALL);
                    setShippingStatusFilter(ShippingStatusFilter.ALL);
                  }}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  ล้างตัวกรอง
                </button>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Data Table with Loading State */}
        {loading ? (
          <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-slate-600 dark:border-slate-400 border-solid"></div>
            <span className="ml-4 text-slate-600 dark:text-slate-400">กำลังโหลด...</span>
          </div>
        ) : (
          <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
            {showPopup && <div><AddOrderPopup trigger={trigger} setTrigger={setTrigger} /></div>}
            <div className="mb-10" />
            <FlexTable
              datas={data}
              customHeader={
                <tr className="text-left h-[9vh] bg-gray-50 dark:bg-zinc-700">
                  <th className="p-2 w-[5%] text-center font-semibold text-gray-900 dark:text-gray-100">#</th>
                  <th className="p-2 w-[10%] font-semibold text-gray-900 dark:text-gray-100">วันที่</th>
                  <th className="p-2 w-[10%] font-semibold text-gray-900 dark:text-gray-100">รายการ</th>
                  <th className="p-2 w-[25%] font-semibold text-gray-900 dark:text-gray-100">ลูกค้า</th>
                  <th className="p-2 w-[10%] font-semibold text-gray-900 dark:text-gray-100">ชื่อแชท</th>
                  <th className="p-2 flex-1 font-semibold text-gray-900 dark:text-gray-100">มูลค่า</th>
                  <th className="p-2 flex-1 font-semibold text-gray-900 dark:text-gray-100">สถานะ</th>
                  <th className="p-2 flex-1 font-semibold text-gray-900 dark:text-gray-100">วันส่งสินค้า</th>
                  <th className="p-2 flex-1 font-semibold text-gray-900 dark:text-gray-100">ชำระเงิน</th>
                  <th className="p-2 w-[5%] font-semibold text-gray-900 dark:text-gray-100"> </th>
                </tr>
              }
              customRow={(data, index) => (
                <tr key={data.id} className="border-b border-gray-200 dark:border-zinc-700 transition-all duration-300 ease-in-out hover:bg-gray-50 dark:hover:bg-zinc-700">
                  <td className="p-2 w-[5%] text-center text-gray-700 dark:text-gray-300">{index + 1 + (currentPage - 1) * pageSize}</td>
                  <td className="p-2 w-[10%] whitespace-nowrap overflow-hidden text-ellipsis text-gray-700 dark:text-gray-300">
                    {data.created_date ?
                      new Date(data.created_date.toDate()).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      : "-"}
                  </td>
                  <td
                    className="p-2 w-[10%] whitespace-nowrap text-gray-700 dark:text-gray-300"
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
                    <div className="cursor-pointer hover:underline ">
                      <NavigationLink href={`/sales/details/${data.transaction_id}`} className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:underline cursor-pointer font-mono">
                        {data.transaction_id}
                      </NavigationLink>
                      
                      {hoveredRow === data.transaction_id && (
                        <div
                          className="absolute bg-white border border-gray-200 shadow-lg rounded-md p-3 z-50 dark:bg-zinc-800 dark:border-zinc-600 transaction-tooltip"
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
                          <h3 className="font-bold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-zinc-600 pb-1 mb-2 flex items-center justify-between">
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
                          
                          <div className="text-sm grid grid-cols-2 gap-x-2 gap-y-1 text-gray-700 dark:text-gray-300">
                            <p><span className="font-semibold text-gray-900 dark:text-gray-100">วันที่:</span> {data.created_date ?
                              new Date(data.created_date.toDate()).toLocaleString('th-TH', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "-"}
                            </p>
                            <p><span className="font-semibold text-gray-900 dark:text-gray-100">ลูกค้า:</span> {data.client_name}</p>
                            <p><span className="font-semibold text-gray-900 dark:text-gray-100">มูลค่า:</span> {data.total_amount} บาท</p>
                            <p><span className="font-semibold text-gray-900 dark:text-gray-100">ช่องทางขาย:</span> {data.sell_method}</p>
                            
                            {data.payment_method && (
                              <p><span className="font-semibold text-gray-900 dark:text-gray-100">ชำระโดย:</span> {data.payment_method}</p>
                            )}
                            {data.note && (
                              <p><span className="font-semibold text-gray-900 dark:text-gray-100">หมายเหตุ:</span> {data.note}</p>
                            )}
                            
                            <div className="col-span-2 mt-2 border-t border-gray-200 dark:border-gray-600 pt-2">
                              <p className="font-semibold text-gray-900 dark:text-gray-100">คลังสินค้า: {data.warehouse}</p>
                              <p className="font-semibold text-gray-900 dark:text-gray-100">รายการสินค้า:</p>
                              <div className="pl-2 mt-1 max-h-28 overflow-y-auto">
                                {data.items.map((item: any, idx: any) => (
                                  <div key={idx} className="break-words text-xs text-gray-700 dark:text-gray-300">
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
                    <NavigationLink href={`/contacts/${data.client_id}`} className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:underline truncate cursor-pointer max-w-[200px] block overflow-hidden text-ellipsis whitespace-nowrap font-medium">
                      {data.client_name}
                    </NavigationLink>
                  </td>
                  <td 
                    className="p-2 w-[10%] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] relative"
                    title={data.client_chat_name}
                  >
                    {data.client_chat_name}
                  </td>
                  <td className="p-2 flex-1 font-mono">{data.total_amount.toLocaleString()}</td>
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
                        className={`w-full px-3 py-2 text-sm appearance-none rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-colors text-gray-900 dark:text-gray-100 ${data.status === OrderStatus.SHIPPING ? 'text-yellow-600 dark:text-yellow-400' : ''} ${data.status === OrderStatus.APPROVED ? 'text-green-600 dark:text-green-400' : ''} ${data.status === OrderStatus.CANCELLED ? 'text-red-500 dark:text-red-400' : ''} ${!hasPermission('sales', 'edit') ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
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
                          className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1 transition-colors duration-200"
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
                    {data.payment_status === PaymentStatus.COMPLETED ? (
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
                                <p><span className="font-semibold">สถานะ:</span> {data.payment_status === PaymentStatus.COMPLETED ? 'ชำระแล้ว' : 'รอชำระ'}</p>
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
                          className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex flex-col items-start gap-1 transition-colors duration-200"
                        >
                          <div className="flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            รอชำระ
                          </div>
                          {data.payment_details && data.payment_details.image && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded">
                              รอยืนยันหลักฐาน
                            </span>
                          )}
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
                          {hasPermission('sales', 'view') && (
                            <Link href={`/sales/details/${data.transaction_id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">
                              ดูรายละเอียด
                            </Link>
                          )}
                          {hasPermission('sales', 'view') && (
                            <button
                              onClick={() => copyEncryptedTrackingLink(data.transaction_id)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              คัดลอกลิงก์ติดตามสถานะ
                            </button>
                          )}
                          {hasPermission('sales', 'create') && (
                            <>
                          <Link href={`/sales/create?ref=${data.transaction_id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700" target="_blank" rel="noopener noreferrer">
                            สร้างรายการซ้ำ
                          </Link>
                          </>
                          )}
                          {hasPermission('sales', 'edit') && data.status === OrderStatus.PENDING && (
                            <>
                          <Link href={`/sales/edit/${data.transaction_id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">
                            แก้ไขรายการขาย
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
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">แถว/หน้า:</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || search.trim() !== ""}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[40px] ${currentPage === 1 || search.trim() !== ""
                ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-700 shadow-md hover:shadow-lg transform hover:scale-105"
                }`}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
            </div>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || !lastDoc || search.trim() !== ""}
              className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[40px] ${currentPage === totalPages || !lastDoc || search.trim() !== ""
                ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                : "bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-700 shadow-md hover:shadow-lg transform hover:scale-105"
                }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      </ProtectedRoute>
    </> 
  );
}