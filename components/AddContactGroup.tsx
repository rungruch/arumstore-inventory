"use client";
import { useState, useEffect } from "react";
import { getContactGroups, addContactGroup, deleteContactGroup } from "@/app/firebase/firestore";
import { Plus, Trash2 } from "lucide-react";

export default function AddContactGroup() {
  const [groups, setGroups] = useState<string[]>([]);
  const [newGroup, setNewGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadGroups = async () => {
    setLoading(true);
    try {
      setGroups(await getContactGroups());
      setError("");
    } catch (e: any) {
      setError(e.message || "โหลดกลุ่มล้มเหลว");
    }
    setLoading(false);
  };

  useEffect(() => { loadGroups(); }, []);

  const handleAdd = async () => {
    if (!newGroup.trim()) return setError("กรุณากรอกชื่อกลุ่ม");
    setLoading(true);
    try {
      await addContactGroup(newGroup.trim());
      setNewGroup("");
      loadGroups();
    } catch (e: any) {
      setError(e.message || "เพิ่มกลุ่มล้มเหลว");
    }
    setLoading(false);
  };

  const handleDelete = async (group: string) => {
    if (!confirm(`ลบกลุ่ม "${group}"?`)) return;
    setLoading(true);
    try {
      await deleteContactGroup(group);
      loadGroups();
    } catch (e: any) {
      setError(e.message || "ลบกลุ่มล้มเหลว");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg w-full max-w-md mx-auto mt-8 border border-gray-200 dark:border-zinc-700">
      <h2 className="text-lg font-semibold mb-4 text-center">จัดการกลุ่มผู้ติดต่อ</h2>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <div className="mb-4 flex gap-2">
          <input
            className="w-full border border-gray-300 p-2 rounded-md text-sm dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={newGroup}
            onChange={e => setNewGroup(e.target.value)}
            placeholder="ชื่อกลุ่มใหม่"
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
        {groups.map(group => (
          <li key={(group as any).value ?? group} className="flex justify-between items-center py-2">
            <span className="text-gray-700 dark:text-gray-200 text-sm">{(group as any).label ?? group}</span>
            <button
              className="text-red-600 hover:text-red-800 p-1 rounded transition-colors disabled:opacity-60"
              onClick={() => handleDelete((group as any).value ?? group)}
              disabled={loading}
              title="ลบกลุ่ม"
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