"use client";
import AddPurchase from "@/components/AddPurchase";
import { useSearchParams } from "next/navigation";

const AddPurchasePage = () => {
  const searchParams = useSearchParams();
  const ref_transaction_id = searchParams.get("ref");
  
  return (
    <AddPurchase ref_transaction_id={ref_transaction_id}></AddPurchase>
  )
}

export default AddPurchasePage