"use client"
import { useSearchParams } from "next/navigation";
import EditProduct from "@/components/EditProduct";

const addProductpage = () => {
    const searchParams = useSearchParams();
    const sku = searchParams.get("psku") || "";
  return (
  <EditProduct sku={sku}></EditProduct>
  )
}
export default addProductpage