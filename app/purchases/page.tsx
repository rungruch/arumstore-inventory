"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FlexTable from "@/components/FlexTable";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { NavigationLink } from "@/components/providers/navigation-link";
import * as XLSX from 'xlsx-js-style';
import { getPurchaseTransactionPaginated, getTotalPurchaseTransactionCount, getPurchaseTransactionbyName, getPurchaseTransactionsByDate, updatePurchaseTransactionStatus } from "@/app/firebase/firestoreBuy";
import { PurchaseStatusDisplay, PURCHASE_STATUS_TRANSITIONS, PurchaseStatus } from "../firebase/enum";
import AddPurchase from "@/components/AddPurchase";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from '@/app/contexts/AuthContext';
import { useUserActivity } from "@/hooks/useUserActivity";

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
}

export default function PurchasePage() {
  const [search, setSearch] = useState(""); // Search input state
  const [data, setDatas] = useState<any>([]); // Current data
  const [showPopup, setShowPopup] = useState(false); // Add popup visibility
  const [lastDoc, setLastDoc] = useState<any | null>(null); // Last document for pagination
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totalAllData, setTotalAllData] = useState(0); // Total number of purchases
  const [totalData, setTotalData] = useState(0); // Total filtered purchases
  const [loading, setLoading] = useState(false); // Loading state
  const [pageSize, setPageSize] = useState(10); // Default page size is 10
  const [trigger, setTrigger] = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const { hasPermission } = useAuth(); // Get hasPermission from AuthContext
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(),
    endDate: new Date()
  });

  // Track user activity on purchases page
  useUserActivity({
    trackOnMount: true,
    trackOnVisibilityChange: true,
    trackOnClick: true,
    throttleMs: 60000 // Track every minute
  });

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const totalAllCount = await getTotalPurchaseTransactionCount();
        setTotalAllData(totalAllCount);
        const { data, lastDoc, count } = await getPurchaseTransactionPaginated(null, pageSize);
        setDatas(data);
        setLastDoc(lastDoc);
        setTotalData(count);
        setShowPopup(false);
      } catch (error) {
        console.error("Error fetching purchase data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageSize, trigger]);

  // Handle page size change
  const handlePageSizeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    setLastDoc(null);

    try {
      setLoading(true);
      const totalCount = await getTotalPurchaseTransactionCount();
      setTotalData(totalCount);
      const { data, lastDoc } = await getPurchaseTransactionPaginated(null, newSize);
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
        setCurrentPage(1);
        setLastDoc(null);
        const totalCount = await getTotalPurchaseTransactionCount();
        setTotalData(totalCount);
        const { data, lastDoc } = await getPurchaseTransactionPaginated(null, pageSize);
        setDatas(data);
        setLastDoc(lastDoc);
      } else {
        const filteredPurchases = await getPurchaseTransactionbyName(search);
        setDatas(filteredPurchases);
        setCurrentPage(1);
        setTotalData(filteredPurchases.length); // Set total to match filtered results
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
      const { data: nextData, lastDoc: newLastDoc } = await getPurchaseTransactionPaginated(
        lastDoc,
        pageSize
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
      const { data, lastDoc } = await getPurchaseTransactionPaginated(null, pageSize); // Re-fetch for the page
      setDatas(data);
      setLastDoc(lastDoc);
    } catch (error) {
      console.error("Error fetching previous page:", error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Add Category Popup
  const togglePopup = () => setShowPopup(!showPopup);

  // Calculate total pages
  const totalPages = Math.ceil(totalData / pageSize);

  const closeModal = (): void => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  const handleExportToExcel = async () => {
    try {
      setLoading(true);
      const allPurchases: any = await getPurchaseTransactionsByDate(
        dateRange.startDate,
        dateRange.endDate
      );

      // Define interface for purchase transaction
      interface PurchaseTransaction {
        transaction_id: string;
        supplier_name: string;
        created_date: { toDate: () => Date };
        tax_id: string;
        total_amount_no_vat: number;
        total_vat: number;
        total_amount: number;
        status: PurchaseStatus;
      }

      // Define interface for excel row data
      interface ExcelRow {
        'ลำดับ': string;
        'รหัสรายการ': string;
        'ผู้จำหน่าย': string;
        'วันที่': string;
        'เลขผู้เสียภาษี': string;
        'ยอดรวม': number | { f: string };
        'ภาษีมูลค่าเพิ่ม': number | { f: string };
        'ยอดสุทธิ': number | { f: string };
        'สถานะ': string;
      }

      const excelData: ExcelRow[] = (allPurchases as PurchaseTransaction[]).map((transaction, idx) => ({
        'ลำดับ': (idx + 1).toString(),
        'รหัสรายการ': transaction.transaction_id,
        'ผู้จำหน่าย': transaction.supplier_name,
        'วันที่': transaction.created_date
          ? new Date(transaction.created_date.toDate()).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          : '-',
        'เลขผู้เสียภาษี': transaction.tax_id,
        'ยอดรวม': Number(transaction.total_amount_no_vat.toFixed(2)),
        'ภาษีมูลค่าเพิ่ม': Number(transaction.total_vat.toFixed(2)),
        'ยอดสุทธิ': Number(transaction.total_amount.toFixed(2)),
        'สถานะ': PurchaseStatusDisplay[transaction.status as keyof typeof PurchaseStatusDisplay]
      }));

      // Create worksheet from data
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Add a summary row with Excel SUM formula for 'ยอดสุทธิ'
      const totalRows = excelData.length + 1; // +1 for header row

      // Add summary row
      excelData.push({
        'ลำดับ': '',
        'รหัสรายการ': '',
        'ผู้จำหน่าย': 'รวมทั้งหมด',
        'วันที่': '',
        'เลขผู้เสียภาษี': '',
        'ยอดรวม': { f: `SUM(F3:F${totalRows + 1})` },
        'ภาษีมูลค่าเพิ่ม': { f: `SUM(G3:G${totalRows + 1})` },
        'ยอดสุทธิ': { f: `SUM(H3:H${totalRows + 1})` },
        'สถานะ': ''
      });

      // Move the table data below
      XLSX.utils.sheet_add_json(ws, excelData, { origin: "A2", skipHeader: false });

      // add header and merge
      ws['A1'] = {
        t: 's',
        v: `รายการซื้อระหว่าง ${dateRange.startDate.toLocaleDateString('th-TH')} ถึง ${dateRange.endDate.toLocaleDateString('th-TH')}`,
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
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "รายการซื้อ");

      // Generate filename with current date
      const fileName = `รายงานยอดซื้อ_${dateRange.startDate.toLocaleDateString('th-TH')}_${dateRange.endDate.toLocaleDateString('th-TH')}.xlsx`;

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

  const handleStatusChange = async (
    transactionId: string,
    currentStatus: PurchaseStatus,
    newStatus: PurchaseStatus
  ) => {
    try {
      setLoading(true);
      await updatePurchaseTransactionStatus(transactionId, currentStatus, newStatus);

      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: "สถานะรายการซื้อถูกอัปเดตเรียบร้อย"
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

  return (
    <>
    <ProtectedRoute action="view" module="purchases">
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
      />

      <div className="container mx-auto p-5">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <div>
            <h1 className="text-2xl font-bold">รายการซื้อ</h1>
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">
              จำนวน {totalAllData} รายการ
            </h2>
          </div>
          {hasPermission('purchases', 'create') && (
            <button
              onClick={togglePopup}
              className="mt-2 sm:mt-0 text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition w-full sm:w-auto"
            >
              เพิ่มรายการซื้อ
            </button>
          )}
        </div>

        {/* Search, Date Range, Export */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
          <input
            type="text"
            placeholder="ค้นหาโดยชื่อผู้จำหน่าย"
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
            {showPopup && <div className="mb-4"><AddPurchase trigger={trigger} setTrigger={setTrigger} /></div>}
            <FlexTable
              datas={data}
              customHeader={
                <tr className="text-left h-[9vh]">
                  <th className="p-2 w-[5%] text-center">#</th>
                  <th className="p-2 w-[15%]">วันที่</th>
                  <th className="p-2 w-[20%]">รายการ</th>
                  <th className="p-2 w-[25%]">ผู้จำหน่าย</th>
                  <th className="p-2 flex-1">มูลค่า</th>
                  <th className="p-2 flex-1">สถานะ</th>
                  <th className="p-2 w-[5%]"> </th>
                </tr>
              }
              customRow={(data, index) => (
                <tr
                  key={data.id}
                  className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <td className="p-2 w-[5%] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
                  <td className="p-2 w-[15%] whitespace-nowrap overflow-hidden text-ellipsis">
                    {data.created_date ?
                      new Date(data.created_date.toDate()).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                      : "-"}
                  </td>
                  <td className="p-2 w-[20%] whitespace-nowrap"
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
                          className="absolute bg-white border border-gray-200 shadow-lg rounded-md p-3 z-50 dark:bg-zinc-800"
                          style={{
                            top: window.innerWidth <= 768 ? '50%' : `${tooltipPosition.y - 90}px`,
                            left: window.innerWidth <= 768 ? '50%' : `${tooltipPosition.x + 20}px`,
                            transform: window.innerWidth <= 768 ? 'translate(-50%, -50%)' : 'none',
                            maxWidth: window.innerWidth <= 768 ? '90vw' : '450px',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            position: window.innerWidth <= 768 ? 'fixed' : 'absolute'
                          }}
                        >
                          <h3 className="font-bold text-gray-800 border-b pb-1 mb-2 dark:text-white">{data.transaction_id}</h3>
                          <div className="text-sm space-y-1">
                            <p><span className="font-semibold dark:text-gray-200">วันที่:</span> {data.created_date ?
                              new Date(data.created_date.toDate()).toLocaleString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : "-"}
                            </p>
                            <p><span className="font-semibold">ผู้จำหน่าย:</span> {data.supplier_name}</p>
                            <p><span className="font-semibold">มูลค่า:</span> {data.total_amount} บาท</p>
                            <p><span className="font-semibold">หมายเหตุ:</span> {data.notes}</p>
                            <div className="mt-2 border-t pt-2">
                              <p className="font-semibold">เข้าคลังสินค้า: {data.warehouse}</p>
                              <p className="font-semibold">รายการสินค้า:</p>
                              {data.items.map((item: any, idx: number) => (
                                <div key={idx} className="pl-2 mt-1 break-words">
                                  - {item.name} ({item.price}฿) : {item.quantity} ชิ้น
                                </div>
                              ))}
                            </div>
                            {data.payment_method && (
                              <p><span className="font-semibold">ชำระโดย:</span> {data.payment_method}</p>
                            )}
                            {data.note && (
                              <p><span className="font-semibold">หมายเหตุ:</span> {data.note}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-2 w-[25%] whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]"
                  title={data.supplier_name}
                  >{data.supplier_name}</td>
                  <td className="p-2 flex-1">{data.total_amount}</td>
                  {/* <td className="p-2">{PurchaseStatusDisplay[data.status]}</td> */}
                  <td className="p-2">
                    <div className="relative" style={{ width: "130px" }}>
                      <select
                        value={data.status}
                        onChange={(e) => handleStatusChange(
                          data.transaction_id,
                          data.status,
                          e.target.value as PurchaseStatus
                        )}
                        className={`w-full px-3 py-2 text-sm appearance-none rounded-md border border-gray-300 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-colors ${
                          !hasPermission('purchases', 'edit') 
                            ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-60' 
                            : 'bg-white dark:bg-gray-800'
                        } ${data.status === PurchaseStatus.PENDING ? 'text-yellow-600 dark:text-yellow-500' : ''} ${data.status === PurchaseStatus.COMPLETED ? 'text-green-600' : ''} ${data.status === PurchaseStatus.CANCELLED ? 'text-red-500 dark:text-red-600' : ''}`}
                        style={{ paddingRight: "2.5rem" }}
                        disabled={!hasPermission('purchases', 'edit')}
                      >
                        <option value={PurchaseStatus.PENDING} disabled={!PURCHASE_STATUS_TRANSITIONS[data.status as keyof typeof PURCHASE_STATUS_TRANSITIONS]?.includes(PurchaseStatus.PENDING)}>
                          {PurchaseStatusDisplay.PENDING}
                        </option>
                        <option value={PurchaseStatus.COMPLETED} disabled={!PURCHASE_STATUS_TRANSITIONS[data.status as keyof typeof PURCHASE_STATUS_TRANSITIONS]?.includes(PurchaseStatus.COMPLETED)}>
                          {PurchaseStatusDisplay.COMPLETED}
                        </option>
                        <option value={PurchaseStatus.CANCELLED} disabled={!PURCHASE_STATUS_TRANSITIONS[data.status as keyof typeof PURCHASE_STATUS_TRANSITIONS]?.includes(PurchaseStatus.CANCELLED)}>
                          {PurchaseStatusDisplay.CANCELLED}
                        </option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                        <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </td>
                  <td className="p-2 w-[5%] relative">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const dropdown = document.getElementById(`more-dropdown-${data.transaction_id}`);

                          document.querySelectorAll('[id^="more-dropdown-"]').forEach(el => {
                            if (el.id !== `more-dropdown-${data.transaction_id}`) {
                              el.classList.add('hidden');
                              // Cleanup listeners for other dropdowns
                              if ((el as any)._cleanup) {
                                (el as any)._cleanup();
                              }
                            }
                          });

                          if (dropdown) {
                            dropdown.classList.toggle('hidden');

                            if (!dropdown.classList.contains('hidden')) {
                              const button = e.currentTarget;
                              const rect = button.getBoundingClientRect();

                              // Calculate position for fixed positioning (no scroll offsets needed)
                              let leftPosition = rect.left - dropdown.offsetWidth + button.offsetWidth;

                              // Check if dropdown would go off left edge
                              if (leftPosition < 0) {
                                leftPosition = rect.left;
                              }

                              // Set position styles for fixed positioning
                              dropdown.style.top = `${rect.bottom}px`;
                              dropdown.style.left = `${leftPosition}px`;
                              dropdown.style.zIndex = '9999';

                              // Function to update position when scrolling or resizing
                              const updatePosition = () => {
                                const newRect = button.getBoundingClientRect();
                                let newLeftPosition = newRect.left - dropdown.offsetWidth + button.offsetWidth;
                                
                                if (newLeftPosition < 0) {
                                  newLeftPosition = newRect.left;
                                }
                                
                                dropdown.style.top = `${newRect.bottom}px`;
                                dropdown.style.left = `${newLeftPosition}px`;
                              };

                              // Add scroll and resize listeners
                              const scrollHandler = updatePosition;
                              const resizeHandler = updatePosition;
                              
                              window.addEventListener('scroll', scrollHandler, { passive: true });
                              window.addEventListener('resize', resizeHandler, { passive: true });

                              // Store cleanup function
                              (dropdown as any)._cleanup = () => {
                                window.removeEventListener('scroll', scrollHandler);
                                window.removeEventListener('resize', resizeHandler);
                              };

                              setTimeout(() => {
                                const clickHandler = (event: MouseEvent) => {
                                  if (!dropdown.contains(event.target as Node) && event.target !== button) {
                                    dropdown.classList.add('hidden');
                                    document.removeEventListener('click', clickHandler);
                                    // Cleanup scroll/resize listeners
                                    if ((dropdown as any)._cleanup) {
                                      (dropdown as any)._cleanup();
                                    }
                                  }
                                };
                                document.addEventListener('click', clickHandler);
                              }, 0);
                            } else {
                              // Cleanup listeners when hiding dropdown
                              if ((dropdown as any)._cleanup) {
                                (dropdown as any)._cleanup();
                              }
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

                      <div
                        id={`more-dropdown-${data.transaction_id}`}
                        className="fixed hidden z-50 w-56 bg-white shadow-lg rounded-md border border-gray-200 dark:bg-zinc-800"
                      >
                        <div className="py-1">
                          <NavigationLink href={`/purchases/create?ref=${data.transaction_id}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">
                            สร้างรายการซ้ำ
                          </NavigationLink>
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

          {/* Pagination controls */}
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