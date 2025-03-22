"use client";

import { useSearchParams } from "next/navigation"; // Correctly use `useSearchParams` from "next/navigation"
import { useEffect, useState } from "react";
import { getProductBySKU } from "@/app/firebase/firestore";
import Image from "next/image";


export default function ProductDetails() {
  const searchParams = useSearchParams();
  const psku = searchParams.get("psku"); // Get the 'psku' parameter from the URL query
  const [product, setProduct] = useState<any>(null); // Product data
  const [loading, setLoading] = useState(true);

  
  useEffect(() => {
    if (!psku) return;

    // Fetch product details based on the psku
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const productData = await getProductBySKU(psku);
        setProduct(productData[0]);
        console.log("Product details:", productData[0]);
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [psku]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500"></div>
        <span className="ml-4 text-gray-500">Loading...</span>
      </div>
    );
  }

  if (!product) {
    return <div className="text-center text-gray-500">Product not found</div>;
  }

  return (
    <div className="container mx-auto p-5">
      <h1 className="text-2xl font-bold mb-4">{product.name}</h1>
      <div className="text-gray-700">{product.description}</div>
      <div className="mt-4">
        {product && (
          <>
          <Image
                    src={product.sku_image}
                    alt="Product"
                    width={100}
                    height={100}
                    className="transition-opacity duration-500 ease-in-out opacity-0"
                    onLoadingComplete={(img: HTMLImageElement) => img.classList.remove("opacity-0")}
                />
            <p>รหัสสินค้า: {product.sku}</p>
            <p>ราคาซื้อ: {product.price.buy_price} ฿</p>
            <p>ราคาขาย: {product.price.sell_price} ฿</p>
            <p>หมวดหมู่: {product.category || "ไม่ระบุ"}</p>
            <p>คงเหลือ: {Object.values(product.stocks).reduce((a: number, b: number) => a + b, 0).toString()}</p>
          </>
        )}
      </div>
    </div>
  );
}
