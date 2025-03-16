"use client";

import { getProductPaginated, getTotalProductCount, getProductByName } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import AddCategoryPopup from "@/components/AddCategory";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddProductPopup from "@/components/AddProduct";
import { Warehouse } from "@/app/firebase/interfaces";
import Image from "next/image";

export default function ProductPage() {
  const [search, setSearch] = useState(""); // Search input state
  const [data, setDatas] = useState<any>([]); // Current categories
  const [showPopup, setShowPopup] = useState(false); // Add category popup visibility
  const [lastDoc, setLastDoc] = useState<any | null>(null); // Last document for pagination
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totalData, setTotalData] = useState(0); // Total number of categories
  const [loading, setLoading] = useState(false); // Loading state
  const [pageSize, setPageSize] = useState(10); // Default page size is 10
  const [trigger, setTrigger] = useState(false);

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        
        setLoading(true);
        const totalCount = await getTotalProductCount();
        setTotalData(totalCount); // Update total categories
        const { data, lastDoc } = await getProductPaginated(null, pageSize);

        // Ensure categories and lastDoc are correctly set
        if (data && lastDoc !== undefined) {
            setDatas(data);
          setLastDoc(lastDoc);
        } else {
          console.error("Invalid data returned from getProductPaginated");
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageSize,trigger]);

  // Handle page size change
  const handlePageSizeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    setLastDoc(null);

    try {
      setLoading(true);
      const totalCount = await getTotalProductCount();
      setTotalData(totalCount);
      const { data, lastDoc } = await getProductPaginated(null, newSize);
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
        const totalCount = await getTotalProductCount(); // Recalculate total categories
        setTotalData(totalCount);
        const { data, lastDoc } = await getProductPaginated(null, pageSize);
        setDatas(data);
        setLastDoc(lastDoc);
      } else {
        // Perform search and reset pagination
        const filteredCategories = await getProductByName(search);
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
      const { data: nextData, lastDoc: newLastDoc } = await getProductPaginated(lastDoc, pageSize);
      
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
      const { data, lastDoc } = await getProductPaginated(null, pageSize); // Re-fetch for the page
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

  return (
    <div className="container mx-auto p-5">
      <div className="flex flex-col items-start mb-4">
        <h1 className="text-2xl font-bold">สินค้า</h1>
        <h2 className="text-1xl font-semibold text-gray-700">จำนวน {totalData} รายการ</h2>
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
          เพิ่มสินค้า
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
            datas={data}
            customHeader={
              <tr className="text-left h-[9vh]">
                <th className="p-2 w-[5%] text-center">#</th>
                <th className="p-2 w-[50px] ">รหัส</th>
                <th className="p-2 w-[300px]">ชื่อสินค้า</th>
                <th className="p-2 ">ราคาซื้อ</th>
                <th className="p-2 ">ราคาขาย</th>
                <th className="p-2 ">คงเหลือ</th>
                <th className="p-2 ]">พร้อมขาย</th>
                <th className="p-2 whitespace-nowrap">เคลื่อนไหวล่าสุด</th>
              </tr>
            }
            customRow={(product, index) => (
              <tr key={product.id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100">
                <td className="p-2 w-[5%] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
                <td className="p-2 w-[50px] ">{product.sku}</td>
                <td className="p-2 w-[300px] flex items-center gap-2">
                {product.sku_image && (
                    <Image
        src={product.sku_image}
        alt="Product"
        width={100}
        height={100}
        className="transition-opacity duration-500 ease-in-out opacity-0"
        onLoadingComplete={(img) => img.classList.remove("opacity-0")}
    />
)}
                                <div>
                                    <div>{product.name}</div>
                                    <div className="text-sm text-gray-500">{product.description}</div>
                                    <div className="text-sm text-gray-500">{'หมวดหมู่: '+product.category}</div>
                                </div>
                            </td>
                <td className="p-2">{product.price.buy_price} ฿</td>
                <td className="p-2">{product.price.sell_price} ฿</td>
                <td className="p-2">
  <span
    className={
      Object.values(product.stocks as Record<string, number> ).reduce((a, b) => a + b, 0) <= 0
        ? 'text-red-500' // red if stock is 0 or less
        : Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0) < 5
        ? 'text-yellow-500' // yellow if stock is less than 5
        : 'text-green-500' // green if stock is greater than 5
    }
  >
    {Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)}
  </span>
</td>
                <td className="p-2 w-[10%]">{Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)-(Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0))}</td>
                <td className="p-2 w-[180px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {product.updated_date ? 
                        new Date(product.updated_date.toDate()).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }) 
                    : "-"}
                </td>
              </tr>
            )}
          />
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center space-x-2">
          <span className="text-gray-700">แถว/หน้า:</span>
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
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
          >
            <ChevronLeft size={16} className="inline-block" />
          </button>
          <span className="py-2 text-gray-700">{currentPage} / {totalPages}</span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || !lastDoc || search.trim() !== ""}
            className={`px-3 py-2 rounded-md transition ${currentPage === totalPages || !lastDoc || search.trim() !== ""
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
          >
            <ChevronRight size={16} className="inline-block" />
          </button>
        </div>
      </div>

      {showPopup && <div className="mt-6"><AddProductPopup trigger={trigger} setTrigger={setTrigger} /></div>}
    </div>
  );
}