"use client";
import AddContactGroup from "@/components/AddContactGroup";

export default function ContactGroupSettingsPage() {
  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white dark:bg-zinc-800 rounded shadow">
      <h1 className="text-2xl font-bold mb-4">ตั้งค่ากลุ่มผู้ติดต่อ</h1>
      <AddContactGroup />
    </div>
  );
}