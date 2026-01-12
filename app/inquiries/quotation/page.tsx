"use client"

import { useEffect, useState, Suspense } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore"
import {
  Mail,
  Phone,
  FileText,
  Calendar,
  Trash2,
  ExternalLink,
  Search,
  User,
  CheckCircle,
  Clock,
  MapPin,
  Building2,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

function QuotationContent() {
  const [quotes, setQuotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // --- REAL-TIME FETCH ---
  useEffect(() => {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const quoteList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setQuotes(quoteList)
        setLoading(false)
      },
      (error) => {
        console.error("Firebase Error:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  // --- DELETE FUNCTION ---
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this quote request?")) {
      try {
        await deleteDoc(doc(db, "quotes", id))
      } catch (error) {
        console.error("Error deleting:", error)
      }
    }
  }

  // --- UPDATE STATUS ---
  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "reviewed" ? "pending" : "reviewed"
    try {
      await updateDoc(doc(db, "quotes", id), { status: nextStatus })
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const filteredQuotes = quotes.filter(
    (quote) =>
      `${quote.firstName} ${quote.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.company?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-widest text-xs">
        <Clock className="animate-spin mr-2" size={16} /> Loading Quotations...
      </div>
    )

  return (
    <div className="space-y-8">
      {/* Header & Search - Katulad ng Applications Page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Project Quotations</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Manage incoming custom service requests
          </p>
        </div>

        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d11a2a] transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name, email or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-[#d11a2a]/10 outline-none font-medium text-sm transition-all"
          />
        </div>
      </div>

      {/* Quotations List */}
      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredQuotes.map((quote) => (
            <motion.div
              key={quote.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 p-6 rounded-[2rem] hover:shadow-xl hover:shadow-gray-200/40 transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* Client Info - Gayang-gaya ang layout */}
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-red-50 transition-colors">
                    <User className="text-gray-400 group-hover:text-[#d11a2a]" size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-gray-900 leading-none">
                      {quote.firstName} {quote.lastName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                      <span className="flex items-center gap-1 text-[#d11a2a]">
                        <Building2 size={12} /> {quote.company || "Individual"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {quote.createdAt?.toDate().toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1 lowercase">
                        <MapPin size={12} /> {quote.streetAddress}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Message Snippet */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-8 flex-1 px-0 lg:px-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                        <Mail size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-600 lowercase">{quote.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-50 rounded-lg text-gray-400">
                        <Phone size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-600">{quote.contactNumber}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Message Preview:</p>
                    <p className="text-xs text-gray-600 line-clamp-2 italic">"{quote.message || "No message."}"</p>
                  </div>
                </div>

                {/* Actions - Same buttons style */}
                <div className="flex items-center gap-2 pt-4 lg:pt-0 border-t lg:border-t-0 border-gray-50">
                  {/* Attachment Link */}
                  <a
                    href={quote.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      quote.attachmentUrl
                        ? "bg-gray-900 text-white hover:bg-[#d11a2a]"
                        : "bg-gray-100 text-gray-300 pointer-events-none"
                    }`}
                  >
                    <FileText size={14} /> {quote.attachmentUrl ? "View Brief" : "No File"} <ExternalLink size={12} />
                  </a>

                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleStatus(quote.id, quote.status)}
                    className={`p-3 rounded-xl transition-all ${
                      quote.status === "reviewed"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500"
                    }`}
                    title="Mark as Reviewed"
                  >
                    <CheckCircle size={18} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(quote.id)}
                    className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredQuotes.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">No quotations found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function QuotationPage() {
  return (
    <PageWrapper>
      <Suspense fallback={null}>
        <QuotationContent />
      </Suspense>
    </PageWrapper>
  )
}
