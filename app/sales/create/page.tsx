"use client";
import AddOrder from "@/components/AddOrder";
import { useSearchParams } from "next/navigation";

const addProductpage = () => {
    const searchParams = useSearchParams();
    const ref_transaction_id = searchParams.get("ref");
  return (
  <AddOrder ref_transaction_id={ref_transaction_id}></AddOrder>
  )
}
export default addProductpage