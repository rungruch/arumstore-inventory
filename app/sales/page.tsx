"use client";

import { getSellTransactionPaginated, getProductPaginated, getTotalSellTransactionCount, getProductByName, updateOrderTransactionStatus } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddOrderPopup from "@/components/AddOrder";
import { Warehouse } from "@/app/firebase/interfaces";
import Image from "next/image";
import Link from "next/link";
import { OrderStatus, OrderStatusDisplay } from "@/app/firebase/enum"
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
}

export default function ProductPage() {
  const [search, setSearch] = useState(""); // Search input state
  const [data, setDatas] = useState<any>([]); // Current categories
  const [showPopup, setShowPopup] = useState(false); // Add popup visibility
  const [lastDoc, setLastDoc] = useState<any | null>(null); // Last document for pagination
  const [currentPage, setCurrentPage] = useState(1); // Current page number
  const [totalData, setTotalData] = useState(0); // Total number of categories
  const [loading, setLoading] = useState(false); // Loading state
  const [pageSize, setPageSize] = useState(10); // Default page size is 10
  const [trigger, setTrigger] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
  });

  // Fetch initial data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        
        setLoading(true);
        const totalCount = await getTotalSellTransactionCount();
        setTotalData(totalCount); // Update total categories
        const { data, lastDoc } = await getSellTransactionPaginated(null, pageSize);
        console.log(data);

        // Ensure categories and lastDoc are correctly set
        if (data && lastDoc !== undefined) {
            setDatas(data);
          setLastDoc(lastDoc);
        } else {
          console.error("Invalid data returned from getTransactionPaginated");
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
        setCurrentPage(1);
        setLastDoc(null);
        const totalCount = await getTotalSellTransactionCount(); // Recalculate total categories
        setTotalData(totalCount);
        const { data, lastDoc } = await getSellTransactionPaginated(null, pageSize);
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
      const { data: nextData, lastDoc: newLastDoc } = await getSellTransactionPaginated(lastDoc, pageSize);
      
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
      const { data, lastDoc } = await getSellTransactionPaginated(null, pageSize); // Re-fetch for the page
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
      await updateOrderTransactionStatus(transactionId, currentStatus, newStatus);
      
      // Optionally refresh the data or update locally
      setTrigger(prev => !prev);
      
      setModalState({
        isOpen: true,
        title: ModalTitle.SUCCESS,
        message: "สถานะรายการขายถูกอัปเดตเรียบร้อย"
      });
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

  const closeModal = (): void => {
    setModalState(prev => ({
      ...prev,
      isOpen: false
    }));
  };

  // Toggle Add Category Popup
  const togglePopup = () => setShowPopup(!showPopup);

  // Calculate total pages
  const totalPages = Math.ceil(totalData / pageSize);

  return (
    <>
    <Modal 
        isOpen={modalState.isOpen} 
        onClose={closeModal} 
        title={modalState.title} 
        message={modalState.message}
      />
    <div className="container mx-auto p-5">
      <div className="flex flex-col items-start mb-4">
        <h1 className="text-2xl font-bold">รายการขาย</h1>
        <h2 className="text-1xl font-semibold text-gray-700">จำนวน {totalData} รายการ</h2>
      </div>
      {/* Search and Add */}
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
          เพิ่มรายการขาย
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
          {showPopup && <div><AddOrderPopup trigger={trigger} setTrigger={setTrigger} /></div>}
          <div className="mb-10"/>
          <FlexTable
            datas={data}
            customHeader={
              <tr className="text-left h-[9vh]">
                <th className="p-2 w-[5%] text-center">#</th>
                <th className="p-2 w-[150px] ">วันที่</th>
                <th className="p-2 w-[150px]">รายการ</th>
                <th className="p-2 w-[200px]">ลูกค้า</th>
                <th className="p-2 ">มูลค่า</th>
                <th className="p-2 ">สถานะ</th>
                <th className="p-2 ]">วันส่งสินค้า</th>
                <th className="p-2 whitespace-nowrap">.</th>
              </tr>
            }
            customRow={(data, index) => (
              <tr key={data.id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100">
                <td className="p-2 w-[5%] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
                <td className="p-2 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">
                    {data.created_date ? 
                        new Date(data.created_date.toDate()).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    }) 
                    : "-"}
                </td>
                <td className="p-2 w-[150px] ">{data.transaction_id}</td>
                <td className="p-2 w-[200px]">{data.client_name}</td>
                <td className="p-2">{data.total_amount}</td>
                <td className="p-2">
                    <select
                      value={data.status}
                      onChange={(e) => handleStatusChange(
                      data.transaction_id, 
                      data.status, 
                      e.target.value as OrderStatus
                      )}
                      className="p-1 rounded border border-gray-300"
                    >
                    <option value={OrderStatus.PENDING}>{OrderStatusDisplay.PENDING}</option>
                    <option value={OrderStatus.SHIPPING}>{OrderStatusDisplay.SHIPPING}</option>
                    <option value={OrderStatus.SHIPPED}>{OrderStatusDisplay.SHIPPED}</option>
                    <option value={OrderStatus.PICKED_UP}>{OrderStatusDisplay.PICKED_UP}</option>
                    <option value={OrderStatus.CANCELLED}>{OrderStatusDisplay.CANCELLED}</option>
                    </select>
                </td>
                <td className="p-2">{"-"}</td>
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
    </div>
    </>
  );
}