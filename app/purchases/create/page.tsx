"use client";
import AddPurchase from "@/components/AddPurchase";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const AddPurchasePage = () => {
  const searchParams = useSearchParams();
  const ref_transaction_id = searchParams.get("ref");
  
  return (
    <ProtectedRoute module="purchases" action="create">
      <AddPurchase ref_transaction_id={ref_transaction_id}></AddPurchase>
    </ProtectedRoute>

  )
}

export default AddPurchasePage