"use client";

import { getProductPaginated, getTotalProductCount, getProductByName, deleteProductById } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddProductPopup from "@/components/AddProduct";
import { Warehouse } from "@/app/firebase/interfaces";
import Image from "next/image";
import { NavigationLink } from "@/components/providers/navigation-link";
import StockDetailsPopup from "@/components/StockDetailsPopup";
import { ProductStatus } from "../firebase/enum";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from '@/app/contexts/AuthContext';
import { useUserActivity } from "@/hooks/useUserActivity";

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


  // Track employee activity on products page
  useUserActivity({
    profile: 'standard', // Employee-optimized intervals (1min clicks, 30s keyboard)
    trackOnClick: true,
    trackOnKeyboard: true, // Track product data entry
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
    <div className="container mx-auto p-3 sm:p-5 min-h-screen bg-gray-50 dark:bg-zinc-900">
      <div className="flex flex-col items-start mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">สินค้า</h1>
        <h2 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">จำนวน {totalData} รายการ</h2>
      </div>
      {/* Search and Add */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="ค้นหาโดยชื่อสินค้า"
          className="border border-gray-200 dark:border-zinc-700 p-3 rounded-lg w-full sm:w-1/2 lg:w-1/3 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200"
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
            className="text-white py-3 px-4 sm:px-6 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold tracking-wide text-sm sm:text-base whitespace-nowrap"
          >
            เพิ่มสินค้า
          </button>
        )}
      </div>

      {/* Data Table with Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-slate-600 dark:border-slate-400 border-solid"></div>
          <span className="ml-4 text-slate-600 dark:text-slate-400">กำลังโหลด...</span>
        </div>
      ) : (
        <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
          {showPopup && <div className="mb-6"><AddProductPopup trigger={trigger} setTrigger={setTrigger} /></div>}
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg overflow-hidden">
            <FlexTable
              datas={data}
            customHeader={
              <tr className="text-left h-[9vh] bg-gray-50 dark:bg-zinc-700">
                <th className="p-3 w-[5%] text-center font-semibold text-gray-900 dark:text-gray-100">#</th>
                <th className="p-3 w-[50px] font-semibold text-gray-900 dark:text-gray-100">รหัส</th>
                <th className="p-3 w-[300px] font-semibold text-gray-900 dark:text-gray-100">ชื่อสินค้า</th>
                <th className="p-3 font-semibold text-gray-900 dark:text-gray-100">ราคาซื้อ</th>
                <th className="p-3 font-semibold text-gray-900 dark:text-gray-100">ราคาขาย</th>
                <th className="p-3 font-semibold text-gray-900 dark:text-gray-100">คงเหลือ</th>
                <th className="p-3 font-semibold text-gray-900 dark:text-gray-100">รอยืนยัน</th>
                <th className="p-3 font-semibold text-gray-900 dark:text-gray-100">เคลื่อนไหวล่าสุด</th>
                <th className="p-3 whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100"></th>
              </tr>
            }
            customRow={(product, index) => (
              <tr key={product.id} className="border-b border-gray-200 dark:border-zinc-700 transition-all duration-300 ease-in-out hover:bg-gray-50 dark:hover:bg-zinc-700">
                <td className="p-3 w-[5%] text-center text-gray-700 dark:text-gray-300">{index + 1 + (currentPage - 1) * pageSize}</td>
                <td className="p-3 w-[50px] font-mono text-sm text-gray-700 dark:text-gray-300">{product.sku}</td>
                <td className="p-3 w-[300px] flex items-center gap-2 group">
                    {product.sku_image && (
                      <div className="group-image">
                      <Image
                        priority={true}
                        src={product.sku_image}
                        alt={product.name}
                        width={70}
                        height={70}
                        className="h-20 w-20 object-cover rounded border cursor-pointer transition-transform duration-100 hover:scale-170 hover:z-50 hover:shadow-lg hover:w-auto hover:h-20 transition-opacity duration-500 ease-in-out opacity-0"
                        onLoad={(img) => (img.currentTarget as HTMLImageElement).classList.remove("opacity-0")}
                      />
                      </div>
                    )}
                  <div>
                    <NavigationLink
                      href={`/products/details?psku=${product.sku}`}
                      passHref
                    >
                      <span className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:underline truncate cursor-pointer max-w-[200px] block overflow-hidden text-ellipsis whitespace-nowrap font-medium" title={product.name}>
                        {product.name}
                      </span>
                    </NavigationLink>
                    <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={product.description}>
                      {product.description}
                    </div>
                    {product.category && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{'หมวดหมู่: ' + product.category}</div>
                    )}
                  </div>
                </td>
                <td className="p-3 font-mono text-gray-900 dark:text-gray-100">{product.price.buy_price.toLocaleString()}</td>
                <td className="p-3 font-mono text-gray-900 dark:text-gray-100">{product.price.sell_price.toLocaleString()}</td>
                <td className="p-3">
                  <span
                    onClick={() => setSelectedStock({
                      productName: product.name,
                      productSKU: product.sku,
                      stocks: product.stocks,
                      pendingStocks: product.pending_stock,
                      buyPrice: product.price.buy_price
                    })}
                    className={`cursor-pointer hover:opacity-80 font-semibold text-left transition-all duration-200 px-2 py-1 rounded-md ${
                      Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0) <= 0
                        ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' // red if stock is 0 or less
                        : Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0) < 5
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30' // amber if stock is less than 5
                          : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' // green if stock is greater than 5
                    }`}
                  >
                    {Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)}
                    <span className="text-xs ml-1 opacity-75">{product.unit_type}</span>
                  </span>
                </td>
                <td className="p-3 w-[10%] text-left">
                  <span
                    onClick={() => setSelectedStock({
                      productName: product.name,
                      productSKU: product.sku,
                      stocks: product.stocks,
                      pendingStocks: product.pending_stock,
                      buyPrice: product.price.buy_price
                    })}
                    className={`cursor-pointer hover:opacity-80 font-semibold text-left transition-all duration-200 px-2 py-1 rounded-md ${
                      Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0) <= 0
                        ? 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 hover:bg-gray-100 dark:hover:bg-gray-900/30' // gray if no pending stock
                        : Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0) > 
                          Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)
                          ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' // red if pending stock > current stock
                          : Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0) ===
                            Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)
                            ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30' // amber if pending stock equals current stock
                            : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' // green if pending stock < current stock
                    }`}
                  >
                    {Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0)}
                    <span className="text-xs ml-1 opacity-75">{product.unit_type}</span>
                  </span>
                </td>
                <td className="p-3 w-[180px] whitespace-nowrap overflow-hidden text-ellipsis text-gray-700 dark:text-gray-300">
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
                <td className="p-3 w-[5%] relative">
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
                            // Cleanup listeners for other dropdowns
                            if ((el as any)._cleanup) {
                              (el as any)._cleanup();
                            }
                          }
                        });

                        if (dropdown) {
                          dropdown.classList.toggle('hidden');

                          // Position the dropdown relative to the button
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

                            // Add click event listener to document to close dropdown when clicking outside
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
                      className="flex items-center justify-center p-2 text-slate-700 hover:text-slate-900 dark:text-gray-200 dark:hover:text-white whitespace-nowrap text-sm hover:bg-slate-100 dark:hover:bg-zinc-600 rounded-md transition-colors duration-200"
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
                      className="fixed hidden z-50 w-56 bg-white shadow-xl rounded-lg border border-gray-200 dark:bg-zinc-800 dark:border-zinc-600"
                    >
                      <div className="py-1">
                        <NavigationLink href={`/products/details?psku=${product.sku}`} className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-zinc-700">
                          ดูภาพรวม
                        </NavigationLink>
                        {hasPermission('products', 'edit') && (
                          <>
                          <div className="border-t border-gray-200 dark:border-zinc-600 my-1" />
                        <button
                          onClick={() => setSelectedStock({
                          productName: product.name,
                          productSKU: product.sku,
                          stocks: product.stocks,
                          pendingStocks: product.pending_stock,
                          buyPrice: product.price.buy_price
                          })}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-zinc-700">
                          ปรับจำนวน
                        </button>
                        <NavigationLink href={`/products/addtransfer?psku=${product.sku}`} className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-zinc-700">
                          โอนสินค้า
                        </NavigationLink>
                        <NavigationLink href={`/products/edit?psku=${product.sku}`} className="block px-4 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-zinc-700">
                          แก้ไข
                        </NavigationLink>
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
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-gray-100 dark:border-zinc-700 gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">แถว/หน้า:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="border border-gray-200 dark:border-zinc-600 rounded-lg p-2 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200"
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
              ? "bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500 cursor-not-allowed"
              : "bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-700 shadow-md hover:shadow-lg transform hover:scale-105"
              }`}
          >
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 py-2 bg-gray-50 dark:bg-zinc-700 rounded-lg">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
          </div>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || !lastDoc || search.trim() !== ""}
            className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[40px] ${currentPage === totalPages || !lastDoc || search.trim() !== ""
              ? "bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500 cursor-not-allowed"
              : "bg-slate-700 dark:bg-slate-600 text-white hover:bg-slate-800 dark:hover:bg-slate-700 shadow-md hover:shadow-lg transform hover:scale-105"
              }`}
          >
            <ChevronRight size={16} />
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