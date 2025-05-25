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
    <div className="container mx-auto p-3 sm:p-5 min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ผู้ติดต่อ</h1>
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            จำนวน {totalContacts} รายการ
          </h2>
        </div>
        {hasPermission('customers', 'create') && (
          <button
            onClick={togglePopup}
            className="text-white py-3 px-4 sm:px-6 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold tracking-wide text-sm sm:text-base whitespace-nowrap"
          >
            เพิ่มผู้ติดต่อ
          </button>
        )}
      </div>

      {/* Enhanced Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 backdrop-blur-sm">
        {/* Filter Section */}
        <div className="mb-6">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <div className="p-1.5 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg mr-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z"></path>
              </svg>
            </div>
            กรองตามกลุ่ม
          </label>
          <div className="flex flex-wrap gap-3">
            {contactGroups.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleGroupFilterChange(value)}
                className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 ${
                  statusFilter === value
                    ? "bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 hover:scale-105"
                }`}
              >
                {label}
                {statusFilter === value && totalData > 0 ? ` (${totalData})` : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Search Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <div className="p-1.5 bg-gradient-to-r from-slate-600 to-slate-700 rounded-lg mr-2">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            ค้นหาข้อมูล
          </label>
          <div className="flex gap-3">
            <div className="relative group flex-1 max-w-lg">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 group-focus-within:text-slate-500 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input
                type="text"
                placeholder="ค้นหาผู้ติดต่อ..."
                className="block w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 dark:from-slate-600 dark:to-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 whitespace-nowrap"
            >
              ค้นหา
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 opacity-100 transition-opacity duration-500 animate-pulse">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-slate-600 dark:border-slate-400 border-solid"></div>
          <span className="ml-4 text-slate-600 dark:text-slate-400">กำลังโหลด...</span>
        </div>
      ) : (
        <div className={`transition-opacity duration-500 ${loading ? "opacity-0" : "opacity-100"}`}>
          <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-lg overflow-hidden">
            <FlexTable
              datas={contacts}
              customHeader={
                <tr className="text-left h-[9vh] bg-gray-50 dark:bg-zinc-700">
                  <th className="p-4 w-[50px] text-center font-semibold text-gray-700 dark:text-gray-300">#</th>
                  <th className="p-4 w-[150px] whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">รหัส</th>
                  <th className="p-4 w-[150px] whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">ชื่อผู้ติดต่อ</th>
                  <th className="p-4 w-[150px] whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">เบอร์โทรศัพท์</th>
                  <th className="p-4 w-[120px] whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">อีเมล</th>
                  <th className="p-4 w-[180px] whitespace-nowrap font-semibold text-gray-700 dark:text-gray-300">อัพเดทล่าสุด</th>
                  <th className="p-4 w-[100px] text-center font-semibold text-gray-700 dark:text-gray-300"> </th>
                </tr>
              }
            customRow={(contact, index) => (
              <tr key={contact.id} className="border-b border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-sm group">
                <td className="p-4 w-[50px] text-center text-gray-700 dark:text-gray-300 font-medium">{index + 1 + (currentPage - 1) * pageSize}</td>
                <td className="p-4 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis text-gray-800 dark:text-gray-200 font-mono text-sm">{contact.client_id}</td>
                <td className="p-4 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]" title={contact.name}>
                  <Link
                  href={`/contacts/${contact.client_id}`}
                  className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300 hover:underline font-medium transition-colors duration-200"
                  >
                  {contact.name}
                  </Link>
                </td>
                <td className="p-4 w-[150px] whitespace-nowrap overflow-hidden text-ellipsis text-gray-700 dark:text-gray-300">{contact.contact_info?.phone || "-"}</td>
                <td className="p-4 w-[120px] whitespace-nowrap overflow-hidden text-ellipsis text-gray-700 dark:text-gray-300">{contact.contact_info?.email || "-"}</td>
                <td className="p-4 w-[180px] whitespace-nowrap overflow-hidden text-ellipsis text-gray-600 dark:text-gray-400 text-sm">
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
                <td className="p-4 w-[5%]">
                  <div className="relative inline-block text-left">
                    <button
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === contact.id ? null : contact.id);
                      }}
                    >
                      <svg width="20" height="20" fill="currentColor" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200" viewBox="0 0 20 20">
                        <circle cx="4" cy="10" r="2" />
                        <circle cx="10" cy="10" r="2" />
                        <circle cx="16" cy="10" r="2" />
                      </svg>
                    </button>
                    {openDropdownId === contact.id && (
                      <div
                        id={`dropdown-${contact.id}`}
                        className="fixed z-50 mt-2 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl backdrop-blur-sm ring-1 ring-black ring-opacity-5"
                        style={{
                          top: 'auto',
                          left: 'auto',
                          right: '16px',
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="py-1">
                          <button
                            className="flex items-center w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!hasPermission('customers', 'edit')}
                            onClick={() => {
                              setEditContact(contact);
                              setEditModalOpen(true);
                              setOpenDropdownId(null);
                            }}
                          >
                            <svg className="w-4 h-4 mr-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                            แก้ไข
                          </button>
                          <button
                            className="flex items-center w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                            ลบ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          />
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row justify-between items-center mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">แถว/หน้า:</span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:border-transparent shadow-sm hover:shadow-md transition-all duration-200"
          >
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || search.trim() !== ""}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${currentPage === 1 || search.trim() !== ""
              ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
              : "bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 shadow-sm hover:shadow-md"
              }`}
          >
            <ChevronLeft size={16} className="inline-block mr-1" />
            ก่อนหน้า
          </button>
          <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || !lastDoc || search.trim() !== ""}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${currentPage === totalPages || !lastDoc || search.trim() !== ""
              ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
              : "bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 shadow-sm hover:shadow-md"
              }`}
          >
            ถัดไป
            <ChevronRight size={16} className="inline-block ml-1" />
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