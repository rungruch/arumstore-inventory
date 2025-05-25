"use client";

import { getProductWarehousePaginated, getTotalWarehouseCount, getProductWarehouseByName, deleteProductWarehouse } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Warehouse } from "@/app/firebase/interfaces";
import AddWarehousePopup from "@/components/AddWarehouse";
import { getCachedProductCountByWarehouse as getTotalProductsofWarehouse } from "@/app/firebase/firestoreStats";
import ProtectedRoute from "@/components/ProtectedRoute";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { EditWarehousePopup } from "@/components/AddWarehouse";
import { useAuth } from '@/app/contexts/AuthContext';

export default function ProductWarehousePage() {
  const [search, setSearch] = useState(""); // Search input state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]); // Changed from categories to warehouses
  const [showPopup, setShowPopup] = useState(false); // Add category popup visibility
  const [lastDoc, setLastDoc] = useState<any | null>(null); // Last document for pagination
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totalWarehouses, setTotalWarehouses] = useState(0); // Changed from totalCategories to totalWarehouses
  const [loading, setLoading] = useState(false); // Loading state
  const [pageSize, setPageSize] = useState(10); // Default page size is 10
  const [totalProducts, setTotalProducts] = useState<Array<{ warehouse_id: string; warehouse_name: string; count: number }>>(); // Total products in the warehouse
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null); // Track open dropdown
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    warehouseId: '',
    warehouseName: '',
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<any>(null);
  const { hasPermission } = useAuth();


  // Fetch initial data on component mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const totalCount = await getTotalWarehouseCount();
        setTotalWarehouses(totalCount); // Update total warehouses
        const { warehouses, lastDoc } = await getProductWarehousePaginated(null, pageSize);
        setWarehouses(warehouses);
        setLastDoc(lastDoc);

        // Fetch total products for all warehouse
        const productCounts = await getTotalProductsofWarehouse()
        setTotalProducts(productCounts);


      } catch (error) {
        console.error("Error fetching warehouses:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handle page size change
  const handlePageSizeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    setLastDoc(null);

    try {
      setLoading(true);
      const totalCount = await getTotalWarehouseCount();
      setTotalWarehouses(totalCount);
      const { warehouses, lastDoc } = await getProductWarehousePaginated(null, newSize);
      setWarehouses(warehouses);
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
        const totalCount = await getTotalWarehouseCount(); // Recalculate total warehouses
        setTotalWarehouses(totalCount);
        const { warehouses, lastDoc } = await getProductWarehousePaginated(null, pageSize);
        setWarehouses(warehouses);
        setLastDoc(lastDoc);
      } else {
        // Perform search and reset pagination
        const filteredWarehouses = await getProductWarehouseByName(search);
        setWarehouses(filteredWarehouses);
        setCurrentPage(1);
        setTotalWarehouses(filteredWarehouses.length); // Set total to match filtered results
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
    if (!lastDoc || currentPage === Math.ceil(totalWarehouses / pageSize)) return; // Prevent invalid navigation
    try {
      setLoading(true);
      const { warehouses: nextWarehouses, lastDoc: newLastDoc } = await getProductWarehousePaginated(lastDoc, pageSize);
      setWarehouses(nextWarehouses); // Update warehouses to the next page
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
      const { warehouses, lastDoc } = await getProductWarehousePaginated(null, pageSize); // Re-fetch for the page
      setWarehouses(warehouses);
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
  const totalPages = Math.ceil(totalWarehouses / pageSize);

  // Add this function to refresh warehouses after edit
  const refreshWarehouses = async () => {
    setLoading(true);
    const totalCount = await getTotalWarehouseCount();
    setTotalWarehouses(totalCount);
    const { warehouses, lastDoc } = await getProductWarehousePaginated(null, pageSize);
    setWarehouses(warehouses);
    setLastDoc(lastDoc);
    // Fetch total products for all warehouse
    const productCounts = await getTotalProductsofWarehouse();
    setTotalProducts(productCounts);
    setLoading(false);
  };

  // Delete warehouse handler
  const handleDeleteWarehouse = async (warehouseId: string) => {
    try {
      // You need to implement deleteProductWarehouse in your firestore utils
      await deleteProductWarehouse(warehouseId);
      setWarehouses((prev: any[]) => prev.filter((w: any) => w.id !== warehouseId));
      closeModal();
    } catch (error) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: 'เกิดข้อผิดพลาดในการลบคลังสินค้า',
        warehouseId: '',
        warehouseName: '',
      });
    }
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ProtectedRoute module='products' action="view">
    <EditWarehousePopup
      isOpen={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      warehouse={editWarehouse}
      onSuccess={refreshWarehouses}
    />
    <Modal
      isOpen={modalState.isOpen}
      onClose={closeModal}
      title={modalState.title}
      message={modalState.message || `คุณต้องการลบคลังสินค้า ${modalState.warehouseName} ใช่หรือไม่?`}
      onConfirm={() => handleDeleteWarehouse(modalState.warehouseId)}
    />
    <div className="container mx-auto p-3 sm:p-5 min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">คลังสินค้า</h1>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            จำนวน {totalWarehouses} รายการ
          </h2>
        </div>
        {hasPermission('products', 'create') && (
          <button
            onClick={togglePopup}
            className="text-white py-3 px-4 sm:px-6 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold tracking-wide text-sm sm:text-base whitespace-nowrap"
          >
            เพิ่มคลังสินค้า
          </button>
        )}
      </div>

      {/* Enhanced Search Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 backdrop-blur-sm">
        <div className="flex-1 max-w-lg">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <div className="p-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg mr-2">
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
              placeholder="ค้นหาคลังสินค้า..."
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
      </div>

      {/* Data Table with Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-slate-600 dark:border-slate-400 border-solid"></div>
          <span className="ml-4 text-slate-600 dark:text-slate-400">กำลังโหลด...</span>
        </div>
      ) : (
        <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-gray-100 dark:border-zinc-700 overflow-hidden">
<FlexTable
  datas={warehouses}
  customHeader={
    <tr className="text-left h-[9vh] bg-gradient-to-r from-gray-50 to-gray-100 dark:from-zinc-700 dark:to-zinc-600 border-b border-gray-200 dark:border-zinc-600">
      <th className="p-4 w-[5%] text-center font-bold text-gray-900 dark:text-gray-100 tracking-wide">#</th>
      <th className="p-4 font-bold text-gray-900 dark:text-gray-100 tracking-wide">รหัส</th>
      <th className="p-4 font-bold text-gray-900 dark:text-gray-100 tracking-wide">ชื่อคลัง</th>
      <th className="p-4 font-bold text-gray-900 dark:text-gray-100 tracking-wide">ประเภท</th>
      <th className="p-4 font-bold text-gray-900 dark:text-gray-100 tracking-wide">จำนวนสินค้า</th>
      <th className="p-4 font-bold text-gray-900 dark:text-gray-100 tracking-wide">เคลื่อนไหวล่าสุด</th>
      <th className="p-4 w-[5%] font-bold text-gray-900 dark:text-gray-100"> </th>
    </tr>
  }
  customRow={(warehouse, index) => (
    <tr key={warehouse.id} className="border-b border-gray-100 dark:border-zinc-600 transition-all duration-300 ease-in-out hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 dark:hover:from-zinc-700 dark:hover:to-zinc-600 group">
      <td className="p-4 w-[5%] text-center text-gray-700 dark:text-gray-300 font-medium">{index + 1 + (currentPage - 1) * pageSize}</td>
      <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">{warehouse.warehouse_id}</td>
      <td className="p-4 text-gray-700 dark:text-gray-300">
        <a
          href={`/products/list?warehouse=${encodeURIComponent(warehouse.warehouse_id)}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer font-semibold transition-colors duration-200 hover:underline"
        >
          {warehouse.warehouse_name}
        </a>
      </td>
      <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">{warehouse.type || "-"}</td>
      <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">{totalProducts?.find(warehouses => warehouse.warehouse_name === warehouses.warehouse_name)?.count || 0}</td>
      <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">
        {warehouse.updated_date ? 
          new Date(warehouse.updated_date.toDate()).toLocaleString('th-TH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          }) 
          : "-"}
      </td>
      <td className="p-3 w-[5%]">
        <div className="relative inline-block text-left">
          <button
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdownId(openDropdownId === warehouse.id ? null : warehouse.id);
            }}
          >
            <svg width="20" height="20" fill="currentColor" className="text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors" viewBox="0 0 20 20">
              <circle cx="4" cy="10" r="2" />
              <circle cx="10" cy="10" r="2" />
              <circle cx="16" cy="10" r="2" />
            </svg>
          </button>
          {openDropdownId === warehouse.id && (
            <div
              id={`dropdown-${warehouse.id}`}
              className="fixed z-50 mt-2 w-40 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-xl backdrop-blur-sm"
              style={{
                top: 'auto',
                left: 'auto',
                right: '16px',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-zinc-700 dark:hover:to-zinc-600 transition-all duration-200 rounded-t-lg font-medium"
                onClick={() => {
                  setEditWarehouse(warehouse);
                  setEditModalOpen(true);
                  setOpenDropdownId(null);
                }}
                disabled={!hasPermission('products', 'edit')}
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                  </svg>
                  แก้ไข
                </div>
              </button>
              <button
                className="block w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-200 rounded-b-lg font-medium"
                disabled={!hasPermission('products', 'delete')}
                onClick={() => {
                  setModalState({
                    isOpen: true,
                    title: ModalTitle.DELETE,
                    message: '',
                    warehouseId: warehouse.id,
                    warehouseName: warehouse.warehouse_name,
                  });
                  setOpenDropdownId(null);
                }}
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                  ลบ
                </div>
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )}
/>
          </div>
        </div>
      )}

      {/* Enhanced Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 gap-4 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">แถว/หน้า:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200 font-medium"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        {/* Pagination controls */}
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
          <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 min-w-[80px] text-center">
            {currentPage} / {totalPages}
          </span>
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

      {/* Add Category Popup - You'll need to create an AddWarehousePopup component */}
      <AddWarehousePopup isOpen={showPopup} onClose={togglePopup} />
    </div>
    </ProtectedRoute>
  );
}