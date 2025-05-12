"use client";
import { useState, useEffect } from "react";
import { getShippingMethods, addShippingMethod, deleteShippingMethod } from "@/app/firebase/firestore";
import { Plus, Trash2 } from "lucide-react";

export default function AddShippingMethod() {
  const [methods, setMethods] = useState<string[]>([]);
  const [newMethod, setNewMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMethods = async () => {
    setLoading(true);
    try {
      setMethods(await getShippingMethods());
      setError("");
    } catch (e: any) {
      setError(e.message || "โหลดข้อมูลล้มเหลว");
    }
    setLoading(false);
  };

  useEffect(() => { loadMethods(); }, []);

  const handleAdd = async () => {
    if (!newMethod.trim()) return setError("กรุณากรอกชื่อช่องทางการจัดส่ง");
    setLoading(true);
    try {
      await addShippingMethod(newMethod.trim());
      setNewMethod("");
      loadMethods();
    } catch (e: any) {
      setError(e.message || "เพิ่มช่องทางล้มเหลว");
    }
    setLoading(false);
  };

  const handleDelete = async (method: string) => {
    if (!confirm(`ลบช่องทาง "${method}"?`)) return;
    setLoading(true);
    try {
      await deleteShippingMethod(method);
      loadMethods();
    } catch (e: any) {
      setError(e.message || "ลบช่องทางล้มเหลว");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg w-full mx-auto mt-8 border border-gray-200 dark:border-zinc-700">
      <form
        onSubmit={e => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <div className="mb-4 flex gap-2">
          <input
            className="w-full border border-gray-300 p-2 rounded-md text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={newMethod}
            onChange={e => setNewMethod(e.target.value)}
            placeholder="ชื่อช่องทางการจัดส่ง"
            disabled={loading}
          />
          <button
            type="submit"
            className={`flex items-center px-4 py-2 rounded-md text-white text-sm font-medium transition shadow-sm ${loading ? 'bg-gray-500 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}
            disabled={loading}
          >
            <Plus size={16} className="mr-1" /> เพิ่ม
          </button>
        </div>
      </form>
      {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}
      <ul className="divide-y divide-gray-200 dark:divide-zinc-700 mt-2">
        {methods.map(method => (
          <li key={(method as any).value ?? method} className="flex justify-between items-center py-2">
            <span className="text-gray-700 dark:text-gray-200 text-sm">{(method as any).label ?? method}</span>
            <button
              className="text-red-600 hover:text-red-800 p-1 rounded transition-colors disabled:opacity-60"
              onClick={() => handleDelete((method as any).value ?? method)}
              disabled={loading}
              title="ลบช่องทาง"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      {loading && <div className="text-gray-500 mt-2 text-sm">กำลังโหลด...</div>}
    </div>
  );
}
