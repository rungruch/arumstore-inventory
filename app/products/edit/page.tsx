"use client"
import { useSearchParams } from "next/navigation";
import EditProduct from "@/components/EditProduct";
import ProtectedRoute from "@/components/ProtectedRoute";

const addProductpage = () => {
  const searchParams = useSearchParams();
  const sku = searchParams.get("psku") || "";
  return (
    <ProtectedRoute module='products' action="edit">
      <EditProduct sku={sku}></EditProduct>
    </ProtectedRoute>
  )
}
export default addProductpage