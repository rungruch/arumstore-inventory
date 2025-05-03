"use client";
import AddTransfer from "@/components/AddProductTransfer";
import { useSearchParams } from "next/navigation";

const addProductpage = () => {
  const searchParams = useSearchParams();
  const ref_product_id = searchParams.get("psku");
  return (
  <AddTransfer ref_product_id={ref_product_id}></AddTransfer>
  )
}
export default addProductpage