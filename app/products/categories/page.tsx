"use client";

import { getProductCategoryPaginated, getTotalCategoryCount, getProductCategoryByName } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import AddCategoryPopup from "@/components/AddCategory";
import { Timestamp, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

interface Category {
  id: string;
  category_name: string;
  created_at: Timestamp;
  stock?: number;
  value?: number;
}

export default function ProductsPage() {
  const [search, setSearch] = useState(""); // Search input state
  const [categories, setCategories] = useState<any>([]); // Current categories
  const [showPopup, setShowPopup] = useState(false); // Add category popup visibility
  const [lastDoc, setLastDoc] = useState<any | null>(null); // Last document for pagination
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totalCategories, setTotalCategories] = useState(0); // Total number of categories
  const [loading, setLoading] = useState(false); // Loading state
  const pageSize = 10; // Number of items per page

  // Fetch initial data on component mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const totalCount = await getTotalCategoryCount();
        setTotalCategories(totalCount); // Update total categories
        const { categories, lastDoc } = await getProductCategoryPaginated(null, pageSize);
        setCategories(categories);
        setLastDoc(lastDoc);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  return (
    <div className="container mx-auto p-6">
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
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-black-500 border-solid"></div>
          <span className="ml-4 text-gray-500">Loading...</span>
        </div>
      ) : (
        <FlexTable
          datas={categories}
          customHeader={
            <tr className="text-left h-[9vh]">
              <th className="p-2 w-[5%] text-center">#</th>
              <th className="p-2 w-[35%]">ชื่อหมวดหมู่</th>
              <th className="p-2">จำนวน SKU</th>
              <th className="p-2">มูลค่าสินค้าคงเหลือ</th>
              <th className="p-2">มูลค่าสินค้าพร้อมขาย</th>
            </tr>
          }
          customRow={(category, index) => (
            <tr key={category.id} className="overflow-y-auto border-b">
              <td className="p-2 w-[5%] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
              <td className="p-2 w-[35%]">{category.category_name}</td>
              <td className="p-2">{category.stock ?? "0"}</td>
              <td className="p-2">{category.value ?? "0"}</td>
              <td className="p-2">{category.value ?? "0"}</td>
            </tr>
          )}
        />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-start mt-4 space-x-2">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1 || search.trim() !== ""}
          className={`px-2 py-1 rounded-md transition ${
            currentPage === 1 || search.trim() !== ""
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gray-800 text-white hover:bg-gray-700"
          }`}
        >
          ⬅️ 
        </button>
        <span className="py-2 text-gray-700">
           {currentPage} / {totalPages}
        </span>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages || !lastDoc || search.trim() !== ""}
          className={`px-2 py-1 rounded-md transition ${
            currentPage === totalPages || !lastDoc || search.trim() !== ""
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-gray-800 text-white hover:bg-gray-700"
          }`}
        >
          ➡️
        </button>
      </div>

      {/* Add Category Popup */}
      <AddCategoryPopup isOpen={showPopup} onClose={togglePopup} />
    </div>
  );
}
