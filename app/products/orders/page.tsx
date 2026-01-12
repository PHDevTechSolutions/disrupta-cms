"use client"

import { useEffect, useState, Suspense } from "react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore"
import { Mail, Phone, MapPin, Package, Clock, User, Trash2, CheckCircle, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageWrapper } from "@/components/sidebar/page-wrapper"

function OrdersContent() {
  const [inquiries, setInquiries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setInquiries(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const toggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === "pending" ? "reviewed" : "pending"
    try {
      await updateDoc(doc(db, "inquiries", id), { status: nextStatus })
    } catch (error) {
      console.error("Error updating status:", error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("Delete this product inquiry?")) {
      await deleteDoc(doc(db, "inquiries", id))
    }
  }

  const filteredInquiries = inquiries.filter(
    (inq) =>
      `${inq.customerDetails.firstName} ${inq.customerDetails.lastName}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      inq.customerDetails.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 font-bold uppercase tracking-widest text-xs">
        <Clock className="animate-spin mr-2" size={16} /> Loading Product Inquiries...
      </div>
    )

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Product Inquiries</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Manage item requests and orders
          </p>
        </div>

        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#d11a2a] transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-2xl w-full md:w-80 shadow-sm focus:ring-2 focus:ring-[#d11a2a]/10 outline-none font-medium text-sm transition-all"
          />
        </div>
      </div>

      {/* Inquiries List */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredInquiries.map((inquiry) => (
            <motion.div
              key={inquiry.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden hover:shadow-xl hover:shadow-gray-200/40 transition-all group"
            >
              {/* Card Top Section */}
              <div className="p-6 md:p-8 border-b border-gray-50 flex flex-wrap justify-between items-start gap-4">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-red-50 transition-colors">
                    <User className="text-gray-400 group-hover:text-[#d11a2a]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-none uppercase">
                      {inquiry.customerDetails.firstName} {inquiry.customerDetails.lastName}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5">
                        <Mail size={12} className="text-[#d11a2a]" /> {inquiry.customerDetails.email}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Phone size={12} className="text-[#d11a2a]" /> {inquiry.customerDetails.phone || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-2">
                    <div className="text-[10px] font-black text-gray-300 uppercase flex items-center gap-1 justify-end">
                      <Clock size={12} /> {inquiry.createdAt?.toDate().toLocaleDateString()}
                    </div>
                    <div
                      className={`mt-1 text-[9px] font-black uppercase px-3 py-1 rounded-full inline-block ${
                        inquiry.status === "pending" ? "bg-orange-50 text-orange-500" : "bg-green-50 text-green-500"
                      }`}
                    >
                      {inquiry.status}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStatus(inquiry.id, inquiry.status)}
                    className={`p-3 rounded-xl transition-all ${
                      inquiry.status === "reviewed"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-400 hover:bg-orange-50 hover:text-orange-500"
                    }`}
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(inquiry.id)}
                    className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Card Content Section */}
              <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8 bg-gray-50/30">
                {/* Left: Delivery Info */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                      <MapPin size={14} className="text-[#d11a2a]" /> Delivery Address
                    </h4>
                    <p className="text-sm font-bold text-gray-700 leading-relaxed pl-6">
                      {inquiry.customerDetails.streetAddress}
                      {inquiry.customerDetails.apartment && (
                        <span className="block text-gray-400 font-medium italic mt-1">
                          {inquiry.customerDetails.apartment}
                        </span>
                      )}
                    </p>
                  </div>

                  {inquiry.customerDetails.orderNotes && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] pl-6">
                        Customer Notes
                      </h4>
                      <div className="ml-6 p-4 bg-white border border-gray-100 rounded-2xl italic text-xs text-gray-600 shadow-sm">
                        "{inquiry.customerDetails.orderNotes}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Items List */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                    <Package size={14} className="text-[#d11a2a]" /> Requested Items ({inquiry.items?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                    {inquiry.items?.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm group/item hover:border-red-100 transition-colors"
                      >
                        <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden border border-gray-50 flex-shrink-0">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black uppercase text-gray-800 truncate">{item.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 italic tracking-tighter uppercase">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <div className="bg-gray-900 text-white w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black">
                          {item.quantity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredInquiries.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">No product inquiries found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrdersPage() {
  return (
    <PageWrapper>
      <Suspense fallback={null}>
        <OrdersContent />
      </Suspense>
    </PageWrapper>
  )
}
