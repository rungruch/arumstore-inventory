"use client";
import React, { useState, useEffect } from 'react';
import { getProductPaginated, getProductByName } from "@/app/firebase/firestore";
import {VatType} from "@/app/firebase/enum";
import { X, Plus, Search, ShoppingCart } from 'lucide-react';
import Image from "next/image";
import { ProductStatus } from '@/app/firebase/enum';

// Define TypeScript interfaces
interface Product {
  id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  price: number;
  discount?: number;
  total: number;
  stock?: number;
  unit_type: string;
}

interface ProductData {
  [key: string]: any;
}

interface ProductSectionProps {
  onProductsChange?: (products: Product[], totalAmount: number, totalAmountNoVat: number, totalVat: number) => void;
  warehouseName: string;
  vatType: VatType;
  shippingCost: number;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

interface PaginatedResponse {
    [key: string]: any;
}

  const ProductSection: React.FC<ProductSectionProps> = ({ onProductsChange, warehouseName, vatType, shippingCost, products, setProducts }) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<ProductData[]>([]);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [totalAmountNoVat, setTotalAmountNoVat] = useState<number>(0);
  const [totalVat, setTotalVat] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  


  useEffect(() => {
    // Calculate total amount whenever products change
    const sum:number = products.reduce((acc, product) => acc + (product.total || 0), 0);
    if (vatType === VatType.VAT7) {
        setTotalAmountNoVat(Number(sum));
        setTotalVat(Number(sum) * 0.07);
        setTotalAmount(Number(sum + (sum * 0.07)) + Number(shippingCost));
    } else if (vatType === VatType.VAT0) {
        setTotalAmount(Number(sum) + Number(shippingCost));
        setTotalAmountNoVat(Number(sum) * (100/107));
        setTotalVat(sum * (7/107));
    }else{
        setTotalAmount(Number(sum) + Number(shippingCost));
        setTotalAmountNoVat(sum);
        setTotalVat(0);
    }
    
    // Send the updated products to parent component
    if (onProductsChange) {
      onProductsChange(products, totalAmount, totalAmountNoVat, totalVat,);
    }
  }, [products, onProductsChange, vatType]);

  useEffect(() => {
    // Reset products when warehouseName changes
    setProducts([
      { id: '', product_code: '', product_name: '', quantity: 1, price: 0, discount: 0, total: 0, unit_type: 'ชิ้น' }
    ]);
  }, [warehouseName]);

  const handleAddProduct = (): void => {
    setProducts([...products, { id: '', product_code: '', product_name: '', quantity: 1, price: 0, discount: 0, total: 0, unit_type: 'ชิ้น' }]);
  };

  const handleRemoveProduct = (index: number): void => {
    const updatedProducts = [...products];
    updatedProducts.splice(index, 1);
    
    // Always keep at least one row
    if (updatedProducts.length === 0) {
      updatedProducts.push({ id: '', product_code: '', product_name: '', quantity: 1, price: 0, discount: 0, total: 0, unit_type: 'ชิ้น' });
    }
    
    setProducts(updatedProducts);
  };

  const handleProductChange = (index: number, field: keyof Product, value: string | number): void => {
    const updatedProducts = [...products];
    const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
    
    // Ensure type safety for each field
    if (field === 'id' || field === 'product_code' || field === 'product_name') {
      (updatedProducts[index][field] as string) = value as string;
    } else {
      (updatedProducts[index][field] as number) = Number(value);
    }

    // Handle discount validation
    if (field === 'discount') {
      if (numericValue > updatedProducts[index].price) {
        updatedProducts[index].discount = updatedProducts[index].price;
        updatedProducts[index].total = updatedProducts[index].quantity * (updatedProducts[index].price - updatedProducts[index].discount);
        setProducts(updatedProducts);
        return;
      } else if (numericValue < 0) {
        updatedProducts[index].discount = 0;
        updatedProducts[index].total = updatedProducts[index].quantity * (updatedProducts[index].price - updatedProducts[index].discount);
        setProducts(updatedProducts);
        return;
      }
    } else if (field === 'quantity') {
        if (numericValue < 0) { 
            updatedProducts[index].quantity = 0;
            updatedProducts[index].total = 0;
            updatedProducts[index].discount = 0;
            setProducts(updatedProducts);
            return;
        }
    }
    
    // Recalculate total for this product
    if (field === 'quantity' || field === 'price' || field === 'discount') {
      const quantity = field === 'quantity' ? numericValue : updatedProducts[index].quantity;
      const price = field === 'price' ? numericValue : updatedProducts[index].price;
      const discount = field === 'discount' ? 
        Math.max(numericValue, 0) : 
        (updatedProducts[index].discount || 0);
      
      updatedProducts[index].total = quantity * (price - discount);
    }
    
    setProducts(updatedProducts);
  };

  const openSearchModal = async (index: number): Promise<void> => {
    try {
      const { data }: PaginatedResponse = await getProductPaginated(null, 10, ProductStatus.ACTIVE);
      setSearchResults(data);
      setSelectedProductIndex(index);
      setIsSearchModalOpen(true);
      setSearchTerm('');
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const closeSearchModal = (): void => {
    setIsSearchModalOpen(false);
    setSelectedProductIndex(null);
  };

  // Handle search functionality
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const search = e.target.value;
    setSearchTerm(search);

    try {
      if (search.trim() === "") {
        const { data }: PaginatedResponse = await getProductPaginated(null, 10, ProductStatus.ACTIVE);
        setSearchResults(data);
      } else {
        // Perform search and reset pagination
        const filteredProduct: ProductData[] = await getProductByName(search, ProductStatus.ACTIVE);
        setSearchResults(filteredProduct);
      }
    } catch (error) {
      console.error("Error during search:", error);
    }
  };

  const selectProduct = (product: ProductData): void => {
    if (!selectedProductIndex && selectedProductIndex !== 0) return;
    
    // Check if product already exists in the list
    const existingIndex = products.findIndex(p => p.id === product.sku);
    
    if (existingIndex !== -1 && existingIndex !== selectedProductIndex) {
      // Product already exists, update quantity instead
      const updatedProducts = [...products];
      updatedProducts[existingIndex].quantity += 1;
      updatedProducts[existingIndex].total = updatedProducts[existingIndex].quantity * 
        (updatedProducts[existingIndex].price - (updatedProducts[existingIndex].discount || 0));
      
      setProducts(updatedProducts);
      
      // Remove the empty row if it's not the only row
      if (products.length > 1 && !products[selectedProductIndex].id) {
        handleRemoveProduct(selectedProductIndex);
      }
    } else {
      // Add new product or update existing at current index
      const updatedProducts = [...products];
      const stockAmount = product.stocks[warehouseName] > 0 ? product.stocks[warehouseName] : 0;
      
      updatedProducts[selectedProductIndex] = {
        id: product.sku,
        product_code: product.sku,
        product_name: product.name,
        quantity: 1,
        price: product.price.sell_price,
        discount: 0,
        total: product.price.sell_price,
        stock: stockAmount,
        unit_type: product.unit_type || 'ชิ้น'
      };
      
      setProducts(updatedProducts);
    }
    
    closeSearchModal();
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  };

  return (
    <div className="mt-6 bg-white p-6 rounded-lg shadow-sm dark:bg-zinc-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-medium text-gray-800 flex items-center dark:text-white">
          <ShoppingCart size={18} className="mr-2 text-blue-600 dark:text-blue-400" />
          รายการสินค้า
        </h3>
        <div 
          onClick={handleAddProduct}
          className="flex items-center text-sm text-white bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 px-3 py-1.5 rounded-md transition-colors"
        >
          <Plus size={16} className="mr-1" /> เพิ่มสินค้า
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse mb-2">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-600 uppercase dark:bg-zinc-800 dark:text-gray-200">
              <th className="px-4 py-3 border-b border-r border-gray-200 text-left font-medium">รหัส</th>
              <th className="px-4 py-3 border-b border-r border-gray-200 text-left font-medium">ชื่อสินค้า</th>
              <th className="px-4 py-3 border-b border-r border-gray-200 text-center font-medium">จำนวน</th>
              <th className="px-4 py-3 border-b border-r border-gray-200 text-center font-medium">มูลค่าต่อหน่วย</th>
              <th className="px-4 py-3 border-b border-r border-gray-200 text-center font-medium">ส่วนลดบาทต่อหน่วย</th>
              <th className="px-4 py-3 border-b border-r border-gray-200 text-center font-medium">รวม</th>
              <th className="px-4 py-3 border-b border-gray-200 text-center font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={index} className={`hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} dark:bg-zinc-700`}>
                <td className="px-4 py-3 border-b border-r border-gray-200">
                  <div className="flex items-center">
                    <div 
                      onClick={() => openSearchModal(index)} 
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm cursor-pointer transition-colors flex items-center text-gray-700"
                    >
                      <Search size={14} className="mr-1" /> เลือก
                    </div>
                    {product.product_code && (
                      <span className="ml-2 text-gray-700 text-sm dark:text-white">{product.product_code}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 border-b border-r border-gray-200 text-sm text-gray-700 dark:text-white">{product.product_name}</td>
                <td className="px-4 py-3 border-b border-r border-gray-200">
                  <div className="flex flex-col items-center">
                    <input 
                      type="number" 
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      min="1" 
                      step="1"
                      value={product.quantity} 
                      onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                      className="w-20 text-center border border-gray-300 rounded p-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    {product.stock !== undefined && (
                      <span className={`text-xs mt-1 ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        คงเหลือ: {product.stock}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 border-b border-r border-gray-200">
                  <div className="flex justify-center">
                    <input 
                      type="number" 
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      min="0" 
                      step="1"
                      value={product.price} 
                      onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                      className="w-24 text-center border border-gray-300 rounded p-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 border-b border-r border-gray-200">
                  <div className="flex justify-center">
                    <input 
                      type="number" 
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="จำนวนเงิน"
                      min="0"
                      max={product.price || 0}
                      step="1"
                      value={product.discount ?? 0} 
                      onChange={(e) => handleProductChange(index, 'discount', e.target.value)}
                      className="w-32 text-center border border-gray-300 rounded p-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </td>
                <td className="px-4 py-3 border-b border-r border-gray-200 text-right font-medium">{formatCurrency(product.total)}</td>
                <td className="px-4 py-3 border-b border-gray-200 text-center">
                  <div 
                    onClick={() => handleRemoveProduct(index)}
                    className={`p-1.5 rounded-full flex items-center justify-center ${
                      products.length === 1 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-500 hover:bg-red-100 hover:text-red-700'
                    } transition-colors`}
                    aria-label="Remove product"
                  >
                    <X size={16} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="px-4 py-3 border-t border-r border-gray-200 text-right font-medium">มูลค่ารวมก่อนภาษี</td>
              <td className="px-4 py-3 border-t border-r border-gray-200 text-right font-medium text-black-700">{formatCurrency(totalAmountNoVat)}</td>
              <td className="px-4 py-3 border-t border-gray-200"></td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-3  border-r border-gray-200 text-right font-medium">ภาษีมูลค่าเพิ่ม</td>
              <td className="px-4 py-3 border-t border-r border-gray-200 text-right font-medium text-black-700">{formatCurrency(totalVat)}</td>
              <td className="px-4 py-3 border-t border-gray-200"></td>
            </tr>
            <tr>
              <td colSpan={5} className="px-4 py-3 border-t border-r border-gray-200 text-right font-medium">มูลค่ารวมสุทธิ</td>
              <td className="px-4 py-3 border-t border-r border-gray-200 text-right font-medium text-blue-700 dark:text-blue-500">{formatCurrency(totalAmount)}</td>
              <td className="px-4 py-3 border-t border-gray-200"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      {/* Product Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-gray-900/50">
          <div className="bg-white dark:bg-zinc-800 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col shadow-xl animate-fadeIn">
            <div className="p-4 border-b flex justify-between items-center bg-blue-50 dark:bg-zinc-700">
              <h3 className="text-lg font-medium text-gray-800 flex items-center dark:text-white">
                <ShoppingCart size={18} className="mr-2 text-blue-600" />
                เลือกสินค้า
              </h3>
              <div 
                onClick={closeSearchModal} 
                className="text-gray-500 hover:text-gray-700 p-1.5 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </div>
            </div>
            
            <div className="p-4 border-b dark:bg-zinc-700">
              <div className="relative ">
                <input
                  type="text"
                  placeholder="ค้นหาสินค้า..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full border border-gray-300 p-2.5 pl-10 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
                <Search size={18} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
            
            <div className="overflow-y-auto flex-grow">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr className="text-xs text-gray-600 uppercase dark:bg-zinc-800 dark:text-gray-200">
                    <th className="px-4 py-3 text-left font-medium border-b border-gray-200">สินค้า</th>
                    <th className="px-4 py-3 text-center font-medium border-b border-gray-200">คงเหลือ</th>
                    <th className="px-4 py-3 text-center font-medium border-b border-gray-200">พร้อมขาย</th>
                    <th className="px-4 py-3 text-center font-medium border-b border-gray-200">ราคาขาย</th>
                    <th className="px-4 py-3 text-center font-medium border-b border-gray-200">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.length > 0 ? (
                    searchResults.map((product, index) => (
                      <tr key={product.id} className={`border-b hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} dark:bg-zinc-800`}>
                        <td className="p-3">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gray-100 mr-3 flex items-center justify-center text-gray-400 rounded overflow-hidden">
                              {product.sku_image ? (
                                <Image
                                src={product.sku_image}
                                  alt={product.name || "Product image"}
                                  width={100}
                                  height={100}
                                  className="transition-opacity duration-500 ease-in-out opacity-0 object-cover"
                                  onLoad={(img) => img.currentTarget.classList.remove("opacity-0")}
                                />
                              ) : (
                                <ShoppingCart size={24} />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 dark:text-white">{product.name}</div>
                              <div className="text-sm text-gray-500">{product.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {product.stocks[warehouseName] > 0 ? (
                            <span className="text-green-600 font-medium">
                              {product.stocks[warehouseName] + (product.pending_stock[warehouseName] || 0)}
                            </span>
                          ) : (
                            <span className="text-red-600 font-medium">0</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {product.stocks[warehouseName] > 0 ? (
                            <span className="text-green-600 font-medium">{product.stocks[warehouseName]}</span>
                          ) : (
                            <span className="text-red-600 font-medium">0</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-medium">{formatCurrency(product.price.sell_price)}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => selectProduct(product)}
                            className="py-1.5 px-3 bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded text-sm transition-colors"
                          >
                            เลือก
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 dark:bg-zinc-800">
                        ไม่พบสินค้า
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default ProductSection;