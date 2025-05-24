"use client";

import { getContactsPaginated, getTotalContactsCount, getContactsByName, deleteContact, getContactGroups, getContactsByGroup } from "@/app/firebase/firestore";
import { useState, useEffect } from "react";
import FlexTable from "@/components/FlexTable";
import { ChevronLeft, ChevronRight } from "lucide-react"
import AddContactPopup from "@/components/AddContact";
import ProtectedRoute from "@/components/ProtectedRoute";
import Modal from "@/components/modal";
import { ModalTitle } from '@/components/enum';
import { EditContactPopup } from "@/components/AddContact";
import Link from "next/link";
import { useAuth } from '@/app/contexts/AuthContext';

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [lastDoc, setLastDoc] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    contactId: '',
    contactName: '',
  });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Contact group filter states
  const [contactGroups, setContactGroups] = useState<{value: string, label: string}[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [totalData, setTotalData] = useState(0);
  const { hasPermission } = useAuth();

  // Fetch contact groups from Firebase using the imported function
  useEffect(() => {
    const loadContactGroups = async () => {
      try {
        const groups = await getContactGroups();
        setContactGroups(groups);
      } catch (error) {
        console.error("Error loading contact groups:", error);
      }
    };
    
    loadContactGroups();
  }, []);

  // Handle group filter change
  const handleGroupFilterChange = async (group: string) => {
    try {
      setLoading(true);
      setStatusFilter(group);
      setCurrentPage(1);
      setLastDoc(null);
      
      if (group === "ALL") {
        const totalCount = await getTotalContactsCount();
        setTotalContacts(totalCount);
        setTotalData(totalCount);
        const { contacts, lastDoc } = await getContactsPaginated(null, pageSize);
        setContacts(contacts);
        setLastDoc(lastDoc);
      } else {
        const result:any = await getContactsByGroup(group, null, pageSize);
        setContacts(result.contacts);
        setLastDoc(result.lastDoc);
        setTotalData(result.count);
        setTotalContacts(result.count);
      }
    } catch (error) {
      console.error(`Error filtering contacts by group ${group}:`, error);
    } finally {
      setLoading(false);
    }
  };

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
  }, [refreshTrigger]);

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
      if (statusFilter !== "ALL") {
        const result = await getContactsByGroup(statusFilter, lastDoc, pageSize);
        setContacts(result.contacts);
        setLastDoc(result.lastDoc);
      } else {
        const { contacts: nextContacts, lastDoc: newLastDoc } = await getContactsPaginated(lastDoc, pageSize);
        setContacts(nextContacts);
        setLastDoc(newLastDoc);
      }
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
      if (statusFilter !== "ALL") {
        const result = await getContactsByGroup(statusFilter, null, pageSize);
        setContacts(result.contacts);
        setLastDoc(result.lastDoc);
      } else {
        const { contacts, lastDoc } = await getContactsPaginated(null, pageSize);
        setContacts(contacts);
        setLastDoc(lastDoc);
      }
    } catch (error) {
      console.error("Error fetching previous page:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePopup = () => setShowPopup(!showPopup);
  const totalPages = Math.ceil(totalContacts / pageSize);

  // Call this function to trigger a refresh
  const refreshContactsList = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle contact deletion
  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId);
      // Remove deleted contact from local state
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      // Refresh the contact list
      await refreshContactsList();
      // Close the modal
      setModalState(prev => ({ ...prev, isOpen: false }));
    } catch (error) {
      console.error("Error deleting contact:", error);
      setModalState({
        isOpen: true,
        title: ModalTitle.ERROR,
        message: 'เกิดข้อผิดพลาดในการลบผู้ติดต่อ',
        contactId: '',
        contactName: '',
      });
    }
  };

  return (
    <>
    <ProtectedRoute module='customers' action="view">
    <EditContactPopup
      isOpen={editModalOpen}
      onClose={() => setEditModalOpen(false)}
      contact={editContact}
      onSuccess={refreshContactsList}
    />
    <Modal
      isOpen={modalState.isOpen}
      onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
      title={modalState.title}
      message={modalState.message || `คุณต้องการลบผู้ติดต่อ ${modalState.contactName} ใช่หรือไม่?`}
      onConfirm={() => handleDeleteContact(modalState.contactId)}
    />
    <div className="container mx-auto p-5">
      <div className="flex flex-col items-start mb-4">
        <h1 className="text-2xl font-bold">ผู้ติดต่อ</h1>
        <h2 className="text-1xl font-semibold text-gray-700 dark:text-gray-200">จำนวน {totalContacts} รายการ</h2>
      </div>

      {/* Contact Group Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {contactGroups.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleGroupFilterChange(value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === value
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {label}
            {statusFilter === value && totalData > 0 ? ` (${totalData})` : ""}
          </button>
        ))}
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
        {hasPermission('customers', 'create') && (
        <button
          onClick={togglePopup}
          className="relative text-white py-2 px-4 rounded-md bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 transition"
        >
          เพิ่มผู้ติดต่อ
        </button>
        )}
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
                <th className="p-2 w-[100px] text-center"> </th>
              </tr>
            }
            customRow={(contact, index) => (
              <tr key={contact.id} className="border-b transition-all duration-300 ease-in-out hover:bg-gray-100 dark:hover:bg-gray-800">
                <td className="p-2 w-[50px] text-center">{index + 1 + (currentPage - 1) * pageSize}</td>
                <td className="p-2 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis">{contact.client_id}</td>
                <td className="text-blue-500 p-2 w-[150px] whitespace-nowrap overflow-hidden  text-ellipsis max-w-[150px] hover:underline cursor-pointer"
                title={contact.name}>
                  <Link
                  href={`/contacts/${contact.client_id}`}
                  className="text-blue-500 hover:underline"
                  >
                  {contact.name}
                  </Link>
                </td>
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
                <td className="p-2 w-[5%]">
                  <div className="relative inline-block text-left">
                    <button
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === contact.id ? null : contact.id);
                      }}
                    >
                      <svg width="20" height="20" fill="currentColor" className="text-gray-600 dark:text-gray-300" viewBox="0 0 20 20">
                        <circle cx="4" cy="10" r="2" />
                        <circle cx="10" cy="10" r="2" />
                        <circle cx="16" cy="10" r="2" />
                      </svg>
                    </button>
                    {openDropdownId === contact.id && (
                      <div
                        id={`dropdown-${contact.id}`}
                        className="fixed z-50 mt-2 w-32 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md shadow-lg"
                        style={{
                          top: 'auto',
                          left: 'auto',
                          right: '16px',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-700"
                          disabled={!hasPermission('customers', 'edit')}
                          onClick={() => {
                            setEditContact(contact);
                            setEditModalOpen(true);
                            setOpenDropdownId(null);
                          }}
                        >
                          แก้ไข
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-zinc-700"
                          disabled={!hasPermission('customers', 'delete')}
                          onClick={() => {
                            setModalState({
                              isOpen: true,
                              title: ModalTitle.DELETE,
                              message: '',
                              contactId: contact.id,
                              contactName: contact.name,
                            });
                            setOpenDropdownId(null);
                          }}
                        >
                          ลบ
                        </button>
                      </div>
                    )}
                  </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && contactToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            if ((e.target as HTMLElement).className.includes('fixed')) {
              setShowDeleteConfirm(false);
              setContactToDelete(null);
              setDeleteError("");
            }
          }}
        >
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">ยืนยันการลบรายการ</h3>
            <p className="mb-6">คุณต้องการลบผู้ติดต่อ <span className="font-semibold">{contactToDelete.name}</span> ใช่หรือไม่?</p>
            
            {deleteError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                <p>{deleteError}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setContactToDelete(null);
                  setDeleteError("");
                }}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400 dark:bg-zinc-700 dark:hover:bg-zinc-600 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    await deleteContact(contactToDelete.id);
                    
                    // Refresh contacts list after deletion
                    const totalCount = await getTotalContactsCount();
                    setTotalContacts(totalCount);
                    
                    // Calculate the correct page to display after deletion
                    const newTotalPages = Math.ceil((totalCount) / pageSize);
                    const newCurrentPage = currentPage > newTotalPages ? newTotalPages || 1 : currentPage;
                    setCurrentPage(newCurrentPage);
                    
                    // Fetch updated contacts
                    const { contacts: updatedContacts, lastDoc: newLastDoc } = await getContactsPaginated(
                      null, 
                      pageSize
                    );
                    setContacts(updatedContacts);
                    setLastDoc(newLastDoc);
                    
                    // Close modal
                    setShowDeleteConfirm(false);
                    setContactToDelete(null);
                  } catch (error) {
                    console.error("Error deleting contact:", error);
                    setDeleteError(`เกิดข้อผิดพลาดในการลบ: ${error instanceof Error ? error.message : String(error)}`);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className={`px-4 py-2 text-white rounded-md ${
                  isDeleting ? 
                  "bg-gray-500 cursor-not-allowed" : 
                  "bg-red-600 hover:bg-red-700"
                } transition`}
                disabled={isDeleting}
              >
                {isDeleting ? "กำลังลบ..." : "ลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ProtectedRoute>
    </>
  );
}