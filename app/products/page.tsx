"use client";

import { getProductPaginated, getTotalProductCount, getProductByName, deleteProductById } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddProductPopup from "@/components/AddProduct";
import { Warehouse } from "@/app/firebase/interfaces";
import Image from "next/image";
import Link from "next/link";
import StockDetailsPopup from "@/components/StockDetailsPopup";
import { ProductStatus } from "../firebase/enum";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from '@/app/contexts/AuthContext';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  sku: string;
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
  const [selectedStock, setSelectedStock] = useState<{
    productName: string;
    productSKU: string;
    stocks: Record<string, number>;
    pendingStocks: Record<string, number>;
    buyPrice: number;
  } | null>(null);
    const { hasPermission } = useAuth(); // Get hasPermission from AuthContext
    const [modalState, setModalState] = useState<ModalState>({
      isOpen: false,
      title: "",
      message: "",
      sku: ""
    });


  // Fetch initial data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {

        setLoading(true);
        const totalCount = await getTotalProductCount();
        setTotalData(totalCount); // Update total categories
        const { data, lastDoc } = await getProductPaginated(null, pageSize, ProductStatus.ACTIVE);
        // Ensure categories and lastDoc are correctly set
        if (data && lastDoc !== undefined) {
          setDatas(data);
          setLastDoc(lastDoc);
        } else {
          console.error("Invalid data returned from getProductPaginated");
        }
        setShowPopup(false);
      } catch (error) {
        console.error("Error fetching products:", error);
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
      const totalCount = await getTotalProductCount();
      setTotalData(totalCount);
      const { data, lastDoc } = await getProductPaginated(null, newSize, ProductStatus.ACTIVE);
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
        const { data, lastDoc } = await getProductPaginated(null, pageSize, ProductStatus.ACTIVE);
        setDatas(data);
        setLastDoc(lastDoc);
      } else {
        // Perform search and reset pagination
        const filteredCategories = await getProductByName(search, ProductStatus.ACTIVE);
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
      const { data: nextData, lastDoc: newLastDoc } = await getProductPaginated(lastDoc, pageSize, ProductStatus.ACTIVE);

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
      const { data, lastDoc } = await getProductPaginated(null, pageSize, ProductStatus.ACTIVE); // Re-fetch for the page
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

  const handleDeleteProduct = async (sku: string) => {
    try {
      await deleteProductById(sku);
      setTrigger(!trigger); // Refresh the product list
      closeModal();
    } catch (error) {
      console.error("Error deleting product:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: "เกิดข้อผิดพลาดในการลบสินค้า",
        sku: ""
      });
    }
  };




  return (
<>
<ProtectedRoute action="view" module="products">
<Modal
  isOpen={modalState.isOpen}
  onClose={closeModal}
  title={modalState.title}
  message={modalState.message}
  onConfirm={() => handleDeleteProduct(modalState.sku)}
/>
    <div className="container mx-auto p-5">
      <div className="flex flex-col items-start mb-4">
        <h1 className="text-2xl font-bold">สินค้า</h1>
        <h2 className="text-1xl font-semibold text-gray-700 dark:text-gray-200">จำนวน {totalData} รายการ</h2>
      </div>
      {/* Search and Add */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="ค้นหาโดยชื่อสินค้า"
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
        {hasPermission('products', 'create') && (
          <button
            onClick={togglePopup}
            className="relative text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition"
          >
            เพิ่มสินค้า
          </button>
        )}
      </div>

      {/* Data Table with Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
          <span className="ml-4 text-gray-500">Loading...</span>
        </div>
      ) : (
        <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
          {showPopup && <div className="mb-6"><AddProductPopup trigger={trigger} setTrigger={setTrigger} /></div>}
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
                <th className="p-2 ]">รอยืนยัน</th>
                <th className="p-2 ]">เคลื่อนไหวล่าสุด</th>
                <th className="p-2 whitespace-nowrap"></th>
              </tr>
            }
            customRow={(product, index) => (
              <tr key={product.id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800">
                <td className="p-2 w-[5%] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
                <td className="p-2 w-[50px] ">{product.sku}</td>
                <td className="p-2 w-[300px] flex items-center gap-2">
                    {product.sku_image && (
                    <Image
                      priority={true}
                      src={product.sku_image}
                      alt={product.name}
                      width={50}
                      height={50}
                      className="transition-opacity duration-500 ease-in-out opacity-0 w-auto h-auto max-h-[100px] rounded-md"
                      onLoad={(img) => (img.currentTarget as HTMLImageElement).classList.remove("opacity-0")}
                    />
                    )}
                  <div>
                    <Link
                      href={`/products/details?psku=${product.sku}`}
                      passHref
                    >
                      <span className="text-blue-500 hover:underline cursor-pointer">
                        {product.name}
                      </span>
                    </Link>
                    <div className="text-sm text-gray-500">{product.description}</div>
                    {product.category && (
                      <div className="text-sm text-gray-500">{'หมวดหมู่: ' + product.category}</div>
                    )}
                  </div>
                </td>
                <td className="p-2">{product.price.buy_price.toLocaleString()}</td>
                <td className="p-2">{product.price.sell_price.toLocaleString()}</td>
                <td className="p-2">
                  <span
                    onClick={() => setSelectedStock({
                      productName: product.name,
                      productSKU: product.sku,
                      stocks: product.stocks,
                      pendingStocks: product.pending_stock,
                      buyPrice: product.price.buy_price
                    })}
                    className={`cursor-pointer hover:opacity-80 text-left ${Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0) <= 0
                        ? 'text-red-500' // red if stock is 0 or less
                        : Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0) < 5
                          ? 'text-yellow-500' // yellow if stock is less than 5
                          : 'text-green-500' // green if stock is greater than 5
                      }`}
                  >
                    {Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)}
                    {" " + product.unit_type}
                  </span>
                </td>
                <td className="p-2 w-[10%] text-left">
                  <span
                    onClick={() => setSelectedStock({
                      productName: product.name,
                      productSKU: product.sku,
                      stocks: product.stocks,
                      pendingStocks: product.pending_stock,
                      buyPrice: product.price.buy_price
                    })}
                    className={`cursor-pointer hover:opacity-80 ${
                      Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0) >
                      Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)
                        ? 'text-red-500'
                        : Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0) ===
                          Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)
                          ? 'text-yellow-500'
                          : 'text-green-500'
                    }`}
                  >
                    {Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0)}
                    {" " + product.unit_type}
                  </span>
                </td>
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
                <td className="p-2 w-[5%] relative">
                  <div className="relative inline-block">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent event from bubbling up
                        // Toggle dropdown visibility
                        const dropdown = document.getElementById(`more-dropdown-${product.sku}`);

                        // Close all other dropdowns first
                        document.querySelectorAll('[id^="more-dropdown-"]').forEach(el => {
                          if (el.id !== `more-dropdown-${product.sku}`) {
                            el.classList.add('hidden');
                          }
                        });

                        if (dropdown) {
                          dropdown.classList.toggle('hidden');

                          // Position the dropdown relative to the button
                          if (!dropdown.classList.contains('hidden')) {
                            const button = e.currentTarget;
                            const rect = button.getBoundingClientRect();
                            const scrollY = window.scrollY || document.documentElement.scrollTop;
                            const scrollX = window.scrollX || document.documentElement.scrollLeft;

                            // Calculate position - default to right-aligned
                            let topPosition = rect.bottom + scrollY;
                            let leftPosition = rect.right + scrollX - dropdown.offsetWidth;

                            // Check if dropdown would go off right edge
                            if (leftPosition < 0) {
                              leftPosition = rect.left + scrollX;
                            }

                            // Set position styles
                            dropdown.style.position = 'fixed';
                            dropdown.style.top = `${rect.bottom}px`;
                            dropdown.style.left = `${rect.left - dropdown.offsetWidth + button.offsetWidth}px`;
                            dropdown.style.zIndex = '9999';

                            // Add click event listener to document to close dropdown when clicking outside
                            setTimeout(() => {
                              const clickHandler = (event: MouseEvent) => {
                                if (!dropdown.contains(event.target as Node) && event.target !== button) {
                                  dropdown.classList.add('hidden');
                                  document.removeEventListener('click', clickHandler);
                                }
                              };
                              document.addEventListener('click', clickHandler);
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
                      id={`more-dropdown-${product.sku}`}
                      className="fixed hidden z-50 w-56 bg-white shadow-lg rounded-md border border-gray-200 dark:bg-zinc-800"
                    >
                      <div className="py-1">
                        <Link href={`/products/details?psku=${product.sku}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">
                          ดูภาพรวม
                        </Link>
                        {hasPermission('products', 'edit') && (
                          <>
                          <div className="border-t border-gray-200 my-1" />
                        <button
                          onClick={() => setSelectedStock({
                          productName: product.name,
                          productSKU: product.sku,
                          stocks: product.stocks,
                          pendingStocks: product.pending_stock,
                          buyPrice: product.price.buy_price
                          })}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">
                          ปรับจำนวน
                        </button>
                        <Link href={`/products/addtransfer?psku=${product.sku}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">
                          โอนสินค้า
                        </Link>
                        <Link href={`/products/edit?psku=${product.sku}`} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700">
                          แก้ไข
                        </Link>
                        </>
                        )}
                        {hasPermission('products', 'delete') && (
                        <button 
                          onClick={() => {
                            setModalState({
                                isOpen: true,
                                title: ModalTitle.DELETE,
                                message: `คุณต้องการลบสินค้า ${product.name} ใช่หรือไม่?`,
                                sku: product.sku
                            });
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:text-red-400 dark:hover:bg-gray-700"
                        >
                          ลบ
                        </button>
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
              ? "bg-gray-300 dark:bg-zinc-700 cursor-not-allowed"
              : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
          >
            <ChevronRight size={16} className="inline-block" />
          </button>
        </div>
      </div>
      {selectedStock && (
        <StockDetailsPopup
          productName={selectedStock.productName}
          productSKU={selectedStock.productSKU}
          buyPrice={selectedStock.buyPrice}
          stocks={selectedStock.stocks}
          pendingStocks={selectedStock.pendingStocks}
          onClose={() => setSelectedStock(null)}
          onUpdate={() => setTrigger(!trigger)} // Add this line
        />
      )}
    </div>
    </ProtectedRoute>
    </>
  );
}