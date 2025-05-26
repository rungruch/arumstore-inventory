"use client";

import EditOrder from "@/components/EditOrder";
import { useParams } from 'next/navigation';
import { Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function EditSalePage() {
  const params = useParams();
  const transactionId = params.transactionId as string;

  return (
    <ProtectedRoute module="sales" action="edit">
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">แก้ไขรายการขาย</h1>
      <Suspense fallback={<div>กำลังโหลด...</div>}>
        <EditOrder transactionId={transactionId} />
      </Suspense>
    </div>
    </ProtectedRoute>
  );
}
