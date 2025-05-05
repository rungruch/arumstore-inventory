"use client";
import AddTransfer from "@/components/AddProductTransfer";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const addProductpage = () => {
  const searchParams = useSearchParams();
  const ref_product_id = searchParams.get("psku");
  return (
    <ProtectedRoute module="products" action="create">
    <AddTransfer ref_product_id={ref_product_id} ></AddTransfer>
    </ProtectedRoute>
  )
}
export default addProductpage