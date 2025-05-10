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
        console.log("Total products in warehouse:", productCounts);
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
    <div className="container mx-auto p-5">
      <div className="flex flex-col items-start mb-4">
        <h1 className="text-2xl font-bold">คลังสินค้า</h1>
        <h2 className="text-1xl font-semibold text-gray-700 dark:text-gray-200">จำนวน {totalWarehouses} รายการ</h2>
      </div>
      {/* Search and Add Warehouse */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="ค้นหา"
          className="border p-2 rounded-md w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <button
          onClick={togglePopup}
          className="relative text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition"
        >
          เพิ่มคลังสินค้า
        </button>
      </div>

      {/* Data Table with Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
          <span className="ml-4 text-gray-500">Loading...</span>
        </div>
      ) : (
        <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
<FlexTable
  datas={warehouses}
  customHeader={
    <tr className="text-left h-[9vh]">
      <th className="p-2 w-[50px] text-center">#</th>
      <th className="p-2 w-[150px] whitespace-nowrap">รหัส</th>
      <th className="p-2 w-[150px] whitespace-nowrap">ชื่อคลัง</th>
      <th className="p-2 w-[150px] whitespace-nowrap">ประเภท</th>
      <th className="p-2 w-[120px] whitespace-nowrap">จำนวนสินค้า</th>
      <th className="p-2 w-[180px] whitespace-nowrap">เคลื่อนไหวล่าสุด</th>
      <th className="p-2 w-[5%]"> </th>
    </tr>
  }
  customRow={(warehouse, index) => (
    <tr key={warehouse.id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800">
      <td className="p-2 w-[50px] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
      <td className="p-2 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">{warehouse.warehouse_id}</td>
      <td className="p-2 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">
        <a
          href={`/products/list?warehouse=${encodeURIComponent(warehouse.warehouse_id)}`}
          className="text-blue-500 hover:underline"
        >
          {warehouse.warehouse_name}
        </a>
      </td>
      <td className="p-2 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">{warehouse.type || "-"}</td>
      <td className="p-2 w-[120px] whitespace-nowrap overflow-hidden text-ellipsis">{totalProducts?.find(warehouses => warehouse.warehouse_name === warehouses.warehouse_name)?.count || 0}</td>
      <td className="p-2 w-[180px] whitespace-nowrap overflow-hidden text-ellipsis">
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
      <td className="p-2 w-[5%]">
        <div className="relative inline-block text-left">
          <button
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdownId(openDropdownId === warehouse.id ? null : warehouse.id);
            }}
          >
            <svg width="20" height="20" fill="currentColor" className="text-gray-600 dark:text-gray-300" viewBox="0 0 20 20">
              <circle cx="4" cy="10" r="2" />
              <circle cx="10" cy="10" r="2" />
              <circle cx="16" cy="10" r="2" />
            </svg>
          </button>
          {openDropdownId === warehouse.id && (
            <div
              id={`dropdown-${warehouse.id}`}
              className="fixed z-50 mt-2 w-32 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg"
              style={{
                top: 'auto',
                left: 'auto',
                right: '16px',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                onClick={() => {
                  setEditWarehouse(warehouse);
                  setEditModalOpen(true);
                  setOpenDropdownId(null);
                }}
              >
                แก้ไข
              </button>
              <button
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-zinc-700"
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
                ลบ
              </button>
            </div>
          )}
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
              ? "bg-gray-300 cursor-not-allowed dark:bg-zinc-700"
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
              ? "bg-gray-300 cursor-not-allowed dark:bg-zinc-700"
              : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
          >
            <ChevronRight size={16} className="inline-block" />
          </button>
        </div>
      </div>

      {/* Add Category Popup - You'll need to create an AddWarehousePopup component */}
      <AddWarehousePopup isOpen={showPopup} onClose={togglePopup} />
    </div>
    </ProtectedRoute>
  );
}