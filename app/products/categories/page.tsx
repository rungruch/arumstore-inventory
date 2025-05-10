"use client";

import { getProductCategoryPaginated, getTotalCategoryCount, getProductCategoryByName, deleteProductCategory } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import AddCategoryPopup, { EditCategoryPopup } from "@/components/AddCategory";
import { ChevronLeft, ChevronRight } from "lucide-react"
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';

export default function ProductCategoryPage() {
  const [search, setSearch] = useState(""); // Search input state
  const [categories, setCategories] = useState<any>([]); // Current categories
  const [showPopup, setShowPopup] = useState(false); // Add category popup visibility
  const [lastDoc, setLastDoc] = useState<any | null>(null); // Last document for pagination
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totalCategories, setTotalCategories] = useState(0); // Total number of categories
  const [loading, setLoading] = useState(false); // Loading state
  const [pageSize, setPageSize] = useState(10); // Default page size is 10
  const [skuCount, setSkuCount] = useState<any>([]); // SKU count state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null); // Track open dropdown
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    categoryId: '',
    categoryName: '',
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);

  // Fetch initial data on component mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const totalCount = await getTotalCategoryCount();
        setTotalCategories(totalCount); // Update total categories
        const { categories, lastDoc, skuCount } = await getProductCategoryPaginated(null, pageSize);
        setCategories(categories);
        setLastDoc(lastDoc);
        setSkuCount(skuCount);
      } catch (error) {
        console.error("Error fetching categories:", error);
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
      const totalCount = await getTotalCategoryCount();
      setTotalCategories(totalCount);
      const { categories, lastDoc } = await getProductCategoryPaginated(null, newSize);
      setCategories(categories);
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
        const totalCount = await getTotalCategoryCount(); // Recalculate total categories
        setTotalCategories(totalCount);
        const { categories, lastDoc } = await getProductCategoryPaginated(null, pageSize);
        setCategories(categories);
        setLastDoc(lastDoc);
      } else {
        // Perform search and reset pagination
        const filteredCategories = await getProductCategoryByName(search);
        setCategories(filteredCategories);
        setCurrentPage(1);
        setTotalCategories(filteredCategories.length); // Set total to match filtered results
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
    if (!lastDoc || currentPage === Math.ceil(totalCategories / pageSize)) return; // Prevent invalid navigation
    try {
      setLoading(true);
      const { categories: nextCategories, lastDoc: newLastDoc } = await getProductCategoryPaginated(lastDoc, pageSize);
      setCategories(nextCategories); // Update categories to the next page
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
      const { categories, lastDoc } = await getProductCategoryPaginated(null, pageSize); // Re-fetch for the page
      setCategories(categories);
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
  const totalPages = Math.ceil(totalCategories / pageSize);

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteProductCategory(categoryId);
      // Refresh categories after deletion
      setCategories((prev: any[]) => prev.filter((cat: any) => cat.id !== categoryId));
      closeModal();
    } catch (error) {
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: 'เกิดข้อผิดพลาดในการลบหมวดหมู่',
        categoryId: '',
        categoryName: '',
      });
    }
  };

  // Add this function to refresh categories after edit
  const refreshCategories = async () => {
    setLoading(true);
    const { categories, lastDoc, skuCount } = await getProductCategoryPaginated(null, pageSize);
    setCategories(categories);
    setLastDoc(lastDoc);
    setSkuCount(skuCount);
    setLoading(false);
  };

  return (
    <>
    <ProtectedRoute module='products' action="view">
    <EditCategoryPopup
      isOpen={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      category={editCategory}
      onSuccess={refreshCategories}
    />
    <Modal
      isOpen={modalState.isOpen}
      onClose={closeModal}
      title={modalState.title}
      message={modalState.message || `คุณต้องการลบหมวดหมู่ ${modalState.categoryName} ใช่หรือไม่?`}
      onConfirm={() => handleDeleteCategory(modalState.categoryId)}
    />
    <div className="container mx-auto p-5">
      <div className="flex flex-col items-start mb-4">
        <h1 className="text-2xl font-bold">หมวดหมู่</h1>
        <h2 className="text-1xl font-semibold text-gray-700 dark:text-gray-200">จำนวน {totalCategories} รายการ</h2>
      </div>
      {/* Search and Add Category */}
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
          เพิ่มหมวดหมู่
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
            datas={categories}
            customHeader={
              <tr className="text-left h-[9vh]">
                <th className="p-2 w-[5%] text-center">#</th>
                <th className="p-2 w-[35%]">ชื่อหมวดหมู่</th>
                <th className="p-2">จำนวนสินค้า</th>
                <th className="p-2">มูลค่าสินค้าคงเหลือ</th>
                <th className="p-2">มูลค่าสินค้ารอยืนยัน</th>
                <th className="p-2 w-[5%]"> </th>
              </tr>
            }
            customRow={(category, index) => (
              <tr key={category.id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800">
                <td className="p-2 w-[5%] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
                <td className="p-2 w-[35%]">
                  <Link
                    href={`/products/list?category=${encodeURIComponent(category.category_name)}`}
                    className="text-blue-500 hover:underline cursor-pointer"
                  >
                    {category.category_name}
                  </Link>
                </td>
                <td className="p-2">{skuCount?.skus?.[category.category_name]?.count || 0}</td>
                <td className="p-2">{skuCount?.skus?.[category.category_name]?.totalIncome?.toLocaleString() || 0}</td>
                  <td className="p-2">{skuCount?.skus?.[category.category_name]?.totalPendingIncome?.toLocaleString() || 0}</td>
                  <td className="p-2 w-[5%]">
                    <div className="relative inline-block text-left">
                      <button
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === category.id ? null : category.id);
                        }}
                      >
                        <svg width="20" height="20" fill="currentColor" className="text-gray-600 dark:text-gray-300" viewBox="0 0 20 20">
                          <circle cx="4" cy="10" r="2" />
                          <circle cx="10" cy="10" r="2" />
                          <circle cx="16" cy="10" r="2" />
                        </svg>
                      </button>
                      {/* Use portal-like absolute positioning to overflow out of the table */}
                      {openDropdownId === category.id && (
                        <div
                          id={`dropdown-${category.id}`}
                          className="fixed z-50 mt-2 w-32 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg"
                          style={{
                            top: 'auto',
                            left: 'auto',
                            right: '16px', // adjust as needed
                          }}
                          onClick={e => e.stopPropagation()}
                        >
                          <button
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                            onClick={() => {
                              setEditCategory(category);
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
                                categoryId: category.id,
                                categoryName: category.category_name,
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

        {/* Pagination (unchanged) */}
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


      {/* Add Category Popup */}
      <AddCategoryPopup isOpen={showPopup} onClose={togglePopup} />
    </div>
    </ProtectedRoute>
    </>
  );
}
