"use client";
import AddOrder from "@/components/AddOrder";
import { useSearchParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";

const addProductpage = () => {
    const searchParams = useSearchParams();
    const ref_transaction_id = searchParams.get("ref");
  return (
    <ProtectedRoute module="sales" action="create">
        <AddOrder ref_transaction_id={ref_transaction_id}></AddOrder>
    </ProtectedRoute>
  )
}
export default addProductpage