"use client";

import { getProductFiltered, getTotalProductCount, getProductByName, deleteProductById, getProductCategory, getProductWarehouse } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AddProductPopup from "@/components/AddProduct";
import { ProductStatus } from "@/app/firebase/enum";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from '@/app/contexts/AuthContext';
import { ModalTitle } from '@/components/enum';
import Modal from "@/components/modal";
import StockDetailsPopup from "@/components/StockDetailsPopup";
import Image from "next/image";
import { NavigationLink } from "@/components/providers/navigation-link";
import { useSearchParams } from 'next/navigation';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  sku: string;
}

export default function ProductListPage() {
  const searchParams = useSearchParams();
  const warehouseFilter = searchParams.get('warehouse');
  const categoryFilter = searchParams.get('category');

  const [search, setSearch] = useState("");
  const [data, setDatas] = useState<any>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [lastDoc, setLastDoc] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalData, setTotalData] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [trigger, setTrigger] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const { hasPermission } = useAuth();
  const [selectedStock, setSelectedStock] = useState<{
    productName: string;
    productSKU: string;
    stocks: Record<string, number>;
    pendingStocks: Record<string, number>;
    buyPrice: number;
  } | null>(null);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: "",
    message: "",
    sku: ""
  });

  // Fetch categories and warehouses on component mount
  useEffect(() => {
    const fetchCategoriesAndWarehouses = async () => {
      try {
        const categoriesData = await getProductCategory();
        const warehousesData = await getProductWarehouse();
        setCategories(categoriesData);
        setWarehouses(warehousesData);
      } catch (error) {
        console.error("Error fetching categories and warehouses:", error);
      }
    };

    fetchCategoriesAndWarehouses();
  }, []);

  // Fetch products with filtering using the new server-side filtering functions
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Use the new combined filter function
        const filters: { category?: string; warehouse?: string } = {};
        if (categoryFilter) filters.category = categoryFilter;
        if (warehouseFilter) filters.warehouse = warehouseFilter;
        const result = await getProductFiltered(filters, null, pageSize);

        setDatas(result.data);
        setLastDoc(result.lastDoc);
        setTotalData(result.totalCount);
        setHasMore(result.hasMore || false);
        setShowPopup(false);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pageSize, trigger, warehouseFilter, categoryFilter]);

  // Handle page size change
  const handlePageSizeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    setLastDoc(null);

    try {
      setLoading(true);

      // Use the new combined filter function
      const filters: { category?: string; warehouse?: string } = {};
      if (categoryFilter) filters.category = categoryFilter;
      if (warehouseFilter) filters.warehouse = warehouseFilter;

      const result = await getProductFiltered(filters, null, newSize);

      setDatas(result.data);
      setLastDoc(result.lastDoc);
      setTotalData(result.totalCount);
      setHasMore(result.hasMore || false);
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

        // Use the new combined filter function
        const filters: { category?: string; warehouse?: string } = {};
        if (categoryFilter) filters.category = categoryFilter;
        if (warehouseFilter) filters.warehouse = warehouseFilter;

        const result = await getProductFiltered(filters, null, pageSize);

        setDatas(result.data);
        setLastDoc(result.lastDoc);
        setTotalData(result.totalCount);
        setHasMore(result.hasMore || false);
      } else {
        // Perform search and reset pagination
        const searchResults = await getProductByName(search, ProductStatus.ACTIVE);

        // Apply filters client-side to search results
        let filteredResults = [...searchResults];

        if (categoryFilter) {
          filteredResults = filteredResults.filter(product => (product as any).category === categoryFilter);
        }

        if (warehouseFilter) {
          filteredResults = filteredResults.filter(product => {
            const prod = product as { stocks?: Record<string, number> };
            return (
              prod.stocks &&
              prod.stocks[warehouseFilter] !== undefined &&
              prod.stocks[warehouseFilter] > 0
            );
          });
        }

        setDatas(filteredResults);
        setCurrentPage(1);
        setTotalData(filteredResults.length);
        setLastDoc(null);
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle next page navigation
  const handleNextPage = async () => {
    if (!lastDoc || !hasMore || currentPage === Math.ceil(totalData / pageSize)) return; // Prevent invalid navigation
    try {
      setLoading(true);

      // Use the new combined filter function for pagination
      const filters: { category?: string; warehouse?: string } = {};
      if (categoryFilter) filters.category = categoryFilter;
      if (warehouseFilter) filters.warehouse = warehouseFilter;

      const result = await getProductFiltered(filters, lastDoc, pageSize);

      setDatas(result.data);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore || false);
      setCurrentPage(currentPage + 1);
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
      setCurrentPage(currentPage - 1);

      // For previous page, we need to start from the beginning and page forward
      // Use the new combined filter function
      const filters: { category?: string; warehouse?: string } = {};
      if (categoryFilter) filters.category = categoryFilter;
      if (warehouseFilter) filters.warehouse = warehouseFilter;

      // This is simplified - in a production app you might want to maintain
      // a history of lastDoc values to navigate backward more efficiently
      const result = await getProductFiltered(filters, null, pageSize);

      setDatas(result.data);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore || false);
    } catch (error) {
      console.error("Error fetching previous page:", error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle Add Product Popup
  const togglePopup = () => setShowPopup(!showPopup);

  // Calculate total pages - estimation for filtered data
  const totalPages = Math.max(1, Math.ceil(totalData / pageSize));

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

  // Render filter feedback text
  const renderFilterText = () => {
    let filterText = [];

    if (categoryFilter) {
      const category = categories.find(cat => cat.id === categoryFilter);
      if (category) {
        filterText.push(`หมวดหมู่: ${category.category_name}`);
      }
    }

    if (warehouseFilter) {
      // We no longer need to find the warehouse by ID since the filter is now the warehouse name
      filterText.push(`คลัง: ${warehouseFilter}`);
    }

    return filterText.length > 0 ? `กรองตาม ${filterText.join(', ')}` : '';
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
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">รายการสินค้า</h1>
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                จำนวน {totalData} รายการ
              </h2>
              {renderFilterText() && (
                <div className="mt-2 py-2 px-3 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 text-green-800 dark:text-green-100 rounded-lg text-sm font-medium shadow-sm">
                  {renderFilterText()}
                </div>
              )}
            </div>
            <div className="flex gap-3 items-center">
              <NavigationLink href="/products" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline cursor-pointer font-medium">
                กลับไปหน้าสินค้า
              </NavigationLink>
              {hasPermission('products', 'create') && (
                <button
                  onClick={togglePopup}
                  className="text-white py-3 px-4 sm:px-6 rounded-lg bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold tracking-wide text-sm sm:text-base whitespace-nowrap"
                >
                  เพิ่มสินค้า
                </button>
              )}
            </div>
          </div>

          {/* Enhanced Search Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 backdrop-blur-sm">
            <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              <div className="p-1.5 bg-gradient-to-r from-green-600 to-green-700 rounded-lg mr-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              ค้นหาสินค้า
            </label>
            <div className="flex gap-3">
              <div className="relative group flex-1 max-w-lg">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 group-focus-within:text-green-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="ค้นหาโดยชื่อสินค้า..."
                  className="block w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
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
              <button
                onClick={handleSearch}
                className="px-6 py-3 bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 whitespace-nowrap"
              >
                ค้นหา
              </button>
            </div>
          </div>

          {/* Data Table with Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-600 dark:border-green-400 border-solid"></div>
              <span className="ml-4 text-green-600 dark:text-green-400">กำลังโหลด...</span>
            </div>
          ) : (
            <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
              {showPopup && <div className="mb-6"><AddProductPopup trigger={trigger} setTrigger={setTrigger} /></div>}
              <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg overflow-hidden">
                <FlexTable
                  datas={data}
                  customHeader={
                    <tr className="text-left h-[9vh] bg-gray-50 dark:bg-zinc-700">
                      <th className="p-4 w-[5%] text-center font-semibold text-gray-700 dark:text-gray-300">#</th>
                      <th className="p-4 w-[50px] font-semibold text-gray-700 dark:text-gray-300">รหัส</th>
                      <th className="p-4 w-[300px] font-semibold text-gray-700 dark:text-gray-300">ชื่อสินค้า</th>
                      <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">ราคาซื้อ</th>
                      <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">ราคาขาย</th>
                      <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">คงเหลือ</th>
                      <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">รอยืนยัน</th>
                      <th className="p-4 font-semibold text-gray-700 dark:text-gray-300">เคลื่อนไหวล่าสุด</th>
                      <th className="p-4 whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300"></th>
                    </tr>
                  }
                  customRow={(product, index) => (
                    <tr key={product.id} className="border-b border-gray-100 dark:border-gray-700 transition-all duration-300 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="p-4 w-[5%] text-center text-gray-600 dark:text-gray-400">{index + 1 + (currentPage - 1) * pageSize}</td>
                      <td className="p-4 w-[50px] text-gray-900 dark:text-gray-100 font-medium">{product.sku}</td>
                      <td className="p-4 w-[300px] flex items-center gap-2">
                        {product.sku_image && (
                          <Image
                            priority={true}
                            src={product.sku_image}
                            alt={product.name}
                            width={50}
                            height={50}
                            className="transition-opacity duration-500 ease-in-out opacity-0 w-auto h-auto max-h-[100px] rounded-md shadow-sm"
                            onLoad={(img) => (img.currentTarget as HTMLImageElement).classList.remove("opacity-0")}
                          />
                        )}
                        <div>
                          <NavigationLink
                            href={`/products/details?psku=${product.sku}`}
                            passHref
                          >
                            <span className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:underline cursor-pointer font-semibold">
                              {product.name}
                            </span>
                          </NavigationLink>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{product.description}</div>
                          {product.category && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">{'หมวดหมู่: ' + product.category}</div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-900 dark:text-gray-100 font-medium">{product.price.buy_price.toLocaleString()}</td>
                      <td className="p-4 text-gray-900 dark:text-gray-100 font-medium">{product.price.sell_price.toLocaleString()}</td>
                      <td className="p-4">
                        <span
                          onClick={() => setSelectedStock({
                            productName: product.name,
                            productSKU: product.sku,
                            stocks: product.stocks,
                            pendingStocks: product.pending_stock,
                            buyPrice: product.price.buy_price
                          })}
                          className={`cursor-pointer hover:opacity-80 text-left font-semibold ${Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0) <= 0
                            ? 'text-red-600 dark:text-red-400' // red if stock is 0 or less
                            : Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0) < 5
                              ? 'text-yellow-600 dark:text-yellow-400' // yellow if stock is less than 5
                              : 'text-green-600 dark:text-green-400' // green if stock is greater than 5
                            }`}
                        >
                          {Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)}
                          {" " + product.unit_type}
                        </span>
                      </td>
                      <td className="p-4 w-[10%] text-left">
                        <span
                          onClick={() => setSelectedStock({
                            productName: product.name,
                            productSKU: product.sku,
                            stocks: product.stocks,
                            pendingStocks: product.pending_stock,
                            buyPrice: product.price.buy_price
                          })}
                          className={`cursor-pointer hover:opacity-80 font-semibold ${Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0) >
                            Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)
                            ? 'text-red-600 dark:text-red-400'
                            : Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0) ===
                              Object.values(product.stocks as Record<string, number>).reduce((a, b) => a + b, 0)
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                            }`}
                        >
                          {Object.values(product.pending_stock as Record<string, number>).reduce((a, b) => a + b, 0)}
                          {" " + product.unit_type}
                        </span>
                      </td>
                      <td className="p-4 w-[180px] whitespace-nowrap overflow-hidden text-ellipsis text-gray-600 dark:text-gray-400">
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
                      <td className="p-4 w-[5%] relative">
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
                            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 whitespace-nowrap text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors duration-200"
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
                            className="fixed hidden z-50 w-56 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-600 backdrop-blur-sm"
                          >
                            <div className="py-2">
                              <NavigationLink href={`/products/details?psku=${product.sku}`} className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                                ดูภาพรวม
                              </NavigationLink>
                              <div className="border-t border-gray-100 dark:border-gray-600 my-1" />
                              <button
                                disabled={!hasPermission('products', 'edit')}
                                onClick={() => setSelectedStock({
                                  productName: product.name,
                                  productSKU: product.sku,
                                  stocks: product.stocks,
                                  pendingStocks: product.pending_stock,
                                  buyPrice: product.price.buy_price
                                })}
                                className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200">
                                ปรับจำนวน
                              </button>
                              {hasPermission('products', 'edit') ? (
                                <>
                                  <NavigationLink href={`/products/addtransfer?psku=${product.sku}`} className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                                    โอนสินค้า
                                  </NavigationLink>
                                  <NavigationLink href={`/products/edit?psku=${product.sku}`} className="block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                                    แก้ไข
                                  </NavigationLink>
                                </>
                              ) : (
                                null
                              )}
                              <button
                              disabled={!hasPermission('products', 'delete')}
                                onClick={() => {
                                  setModalState({
                                    isOpen: true,
                                    title: ModalTitle.DELETE,
                                    message: `คุณต้องการลบสินค้า ${product.name} ใช่หรือไม่?`,
                                    sku: product.sku
                                  });
                                }}
                                className="block w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
                              >
                                ลบ
                              </button>
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

          {/* Enhanced Pagination Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 mt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              {/* Page Size Selection */}
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">แถว/หน้า:</span>
                <div className="relative">
                  <select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-center sm:justify-end gap-2">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || search.trim() !== ""}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                    currentPage === 1 || search.trim() !== ""
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                
                <button
                  onClick={handleNextPage}
                  disabled={!hasMore || currentPage === totalPages || !lastDoc || search.trim() !== ""}
                  className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 ${
                    !hasMore || currentPage === totalPages || !lastDoc || search.trim() !== ""
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900 dark:from-green-600 dark:to-green-700 dark:hover:from-green-700 dark:hover:to-green-800 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
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
              onUpdate={() => setTrigger(!trigger)}
            />
          )}
        </div>
      </ProtectedRoute>
    </>
  );
}