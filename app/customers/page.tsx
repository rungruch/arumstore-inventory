"use client";

import { getContactsPaginated, getTotalContactsCount, getContactsByName } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { Timestamp } from "firebase/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Contact } from "@/app/firebase/interfaces";
import AddContactPopup from "@/components/AddContact";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [lastDoc, setLastDoc] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  // Fetch initial data on component mount
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const totalCount = await getTotalContactsCount();
        setTotalContacts(totalCount);
        const { contacts, lastDoc } = await getContactsPaginated(null, pageSize);
        setContacts(contacts);
        setLastDoc(lastDoc);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handle page size change
  const handlePageSizeChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(event.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    setLastDoc(null);

    try {
      setLoading(true);
      const totalCount = await getTotalContactsCount();
      setTotalContacts(totalCount);
      const { contacts, lastDoc } = await getContactsPaginated(null, newSize);
      setContacts(contacts);
      setLastDoc(lastDoc);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search functionality
  const handleSearch = async () => {
    try {
      setLoading(true);
      if (search.trim() === "") {
        setCurrentPage(1);
        setLastDoc(null);
        const totalCount = await getTotalContactsCount();
        setTotalContacts(totalCount);
        const { contacts, lastDoc } = await getContactsPaginated(null, pageSize);
        setContacts(contacts);
        setLastDoc(lastDoc);
      } else {
        const filteredContacts = await getContactsByName(search);
        setContacts(filteredContacts);
        setCurrentPage(1);
        setTotalContacts(filteredContacts.length);
        setLastDoc(null);
      }
    } catch (error) {
      console.error("Error during search:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle next page navigation
  const handleNextPage = async () => {
    if (!lastDoc || currentPage === Math.ceil(totalContacts / pageSize)) return;
    try {
      setLoading(true);
      const { contacts: nextContacts, lastDoc: newLastDoc } = await getContactsPaginated(lastDoc, pageSize);
      setContacts(nextContacts);
      setLastDoc(newLastDoc);
      setCurrentPage(currentPage + 1);
    } catch (error) {
      console.error("Error fetching next page:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle previous page navigation
  const handlePrevPage = async () => {
    if (currentPage <= 1) return;
    try {
      setLoading(true);
      setCurrentPage(currentPage - 1);
      const { contacts, lastDoc } = await getContactsPaginated(null, pageSize);
      setContacts(contacts);
      setLastDoc(lastDoc);
    } catch (error) {
      console.error("Error fetching previous page:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePopup = () => setShowPopup(!showPopup);
  const totalPages = Math.ceil(totalContacts / pageSize);

  return (
    <div className="container mx-auto p-5">
      <div className="flex flex-col items-start mb-4">
        <h1 className="text-2xl font-bold">ผู้ติดต่อ</h1>
        <h2 className="text-1xl font-semibold text-gray-700 dark:text-gray-200">จำนวน {totalContacts} รายการ</h2>
      </div>

      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="ค้นหา"
          className="border p-2 rounded-md w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
        />
        <button
          onClick={togglePopup}
          className="relative text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition"
        >
          เพิ่มผู้ติดต่อ
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-gray-500 border-solid"></div>
          <span className="ml-4 text-gray-500">Loading...</span>
        </div>
      ) : (
        <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
          <FlexTable
            datas={contacts}
            customHeader={
              <tr className="text-left h-[9vh]">
                <th className="p-2 w-[50px] text-center">#</th>
                <th className="p-2 w-[150px] whitespace-nowrap">รหัส</th>
                <th className="p-2 w-[150px] whitespace-nowrap">ชื่อผู้ติดต่อ</th>
                <th className="p-2 w-[150px] whitespace-nowrap">เบอร์โทรศัพท์</th>
                <th className="p-2 w-[120px] whitespace-nowrap">อีเมล</th>
                <th className="p-2 w-[180px] whitespace-nowrap">อัพเดทล่าสุด</th>
              </tr>
            }
            customRow={(contact, index) => (
              <tr key={contact.id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800">
                <td className="p-2 w-[50px] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
                <td className="p-2 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">{contact.client_id}</td>
                <td className="p-2 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">{contact.name}</td>
                <td className="p-2 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">{contact.contact_info?.phone || "-"}</td>
                <td className="p-2 w-[120px] whitespace-nowrap overflow-hidden text-ellipsis">{contact.contact_info?.email || "-"}</td>
                <td className="p-2 w-[180px] whitespace-nowrap overflow-hidden text-ellipsis">
                  {contact.updated_date ? 
                    new Date(contact.updated_date.toDate()).toLocaleString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }) 
                    : "-"}
                </td>
              </tr>
            )}
          />
        </div>
      )}

      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center space-x-2">
          <span className="text-gray-700 dark:text-white">แถว/หน้า:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="border rounded-md p-2"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || search.trim() !== ""}
            className={`px-3 py-2 rounded-md transition ${currentPage === 1 || search.trim() !== ""
              ? "bg-gray-300 cursor-not-allowed dark:bg-zinc-700"
              : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
          >
            <ChevronLeft size={16} className="inline-block" />
          </button>
          <span className="py-2 text-gray-700 dark:text-white">{currentPage} / {totalPages}</span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || !lastDoc || search.trim() !== ""}
            className={`px-3 py-2 rounded-md transition ${currentPage === totalPages || !lastDoc || search.trim() !== ""
              ? "bg-gray-300 cursor-not-allowed dark:bg-zinc-700"
              : "bg-gray-800 text-white hover:bg-gray-700"
              }`}
          >
            <ChevronRight size={16} className="inline-block" />
          </button>
        </div>
      </div>

      <AddContactPopup isOpen={showPopup} onClose={togglePopup} />
    </div>
  );
}