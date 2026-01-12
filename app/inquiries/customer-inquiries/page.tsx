"use client"

import type React from "react"
import { useEffect, useState, Suspense } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "firebase/firestore"
import { Mail, Phone, Trash2, Search, Clock, Calendar, MessageSquare, Eye, X, User } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

interface Inquiry {
  id: string
  fullName: string
  email: string
  phone: string
  message: string
  submittedAt: any
}

function CustomerInquiriesContent() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)

  // --- REAL-TIME FETCH ---
  useEffect(() => {
    const q = query(collection(db, "inquiries"), orderBy("submittedAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Inquiry[]
      setInquiries(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  // --- DELETE FUNCTION ---
  const deleteInquiry = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm("Are you sure you want to delete this inquiry?")) {
      try {
        await deleteDoc(doc(db, "inquiries", id))
        if (selectedInquiry?.id === id) setSelectedInquiry(null)
      } catch (error) {
        console.error("Delete error:", error)
      }
    }
  }

  const formatFullDate = (timestamp: any) => {
    if (!timestamp) return "---"
    const date = timestamp.toDate()
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const filteredInquiries = inquiries.filter(
    (item) =>
      item.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-widest text-xs">
        <Clock className="animate-spin mr-2" size={16} /> Loading Inquiries...
      </div>
    )

  return (
    <div className="space-y-8">
      {/* Header & Search - Application style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Customer Inquiries</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            General messages and project leads
          </p>
        </div>

        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d11a2a] transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-[#d11a2a]/10 outline-none font-medium text-sm transition-all"
          />
        </div>
      </div>

      {/* Inquiries List - Card Style */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredInquiries.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => setSelectedInquiry(item)}
              className="bg-white border border-gray-100 p-6 rounded-[2rem] hover:shadow-xl hover:shadow-gray-200/40 transition-all group cursor-pointer"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Client Info */}
                <div className="flex items-start gap-5 min-w-[250px]">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-red-50 transition-colors">
                    <User className="text-gray-400 group-hover:text-[#d11a2a]" size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-gray-900 leading-none">{item.fullName}</h3>
                    <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {formatFullDate(item.submittedAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Message Snippet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8 flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                        <Mail size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-600 lowercase">{item.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                        <Phone size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-600">{item.phone}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 hidden md:block">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1 flex items-center gap-1">
                      <MessageSquare size={10} /> Message Preview:
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2 italic">"{item.message}"</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedInquiry(item)
                    }}
                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#d11a2a] transition-all"
                  >
                    <Eye size={14} /> View Details
                  </button>

                  <button
                    onClick={(e) => deleteInquiry(item.id, e)}
                    className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredInquiries.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">No inquiries found</p>
          </div>
        )}
      </div>

      {/* --- MODAL DIALOG --- */}
      <AnimatePresence>
        {selectedInquiry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInquiry(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-start mb-8">
                  <div className="h-16 w-16 rounded-2xl bg-red-50 flex items-center justify-center text-[#d11a2a]">
                    <MessageSquare size={32} />
                  </div>
                  <button
                    onClick={() => setSelectedInquiry(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 leading-tight">
                      {selectedInquiry.fullName}
                    </h2>
                    <p className="text-[#d11a2a] text-[10px] font-black uppercase tracking-[0.3em] mt-2">
                      Received: {formatFullDate(selectedInquiry.submittedAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                        Email Address
                      </p>
                      <p className="text-sm font-bold text-gray-800 break-words">{selectedInquiry.email}</p>
                    </div>
                    <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">
                        Phone Number
                      </p>
                      <p className="text-sm font-bold text-gray-800">{selectedInquiry.phone}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase px-1 tracking-widest">Message Brief</p>
                    <div className="p-8 bg-black rounded-[2rem] text-white text-sm leading-relaxed font-medium italic relative">
                      <div className="absolute -top-3 left-6 bg-[#d11a2a] px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                        Client Message
                      </div>
                      "{selectedInquiry.message}"
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="w-full mt-8 py-5 bg-gray-100 text-gray-900 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-black hover:text-white transition-all shadow-xl shadow-gray-200"
                >
                  Close Inquiry
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CustomerInquiriesPage() {
  return (
    <PageWrapper>
      <Suspense fallback={null}>
        <CustomerInquiriesContent />
      </Suspense>
    </PageWrapper>
  )
}
