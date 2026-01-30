"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Save, 
  Globe, 
  Settings2, 
  Check, 
  AlertCircle 
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageWrapper } from "@/components/sidebar/page-wrapper"
import { cn } from "@/lib/utils"

const WEBSITE_OPTIONS = ["Disruptive Solutions Inc.", "Ecoshift Corporation", "Value Acquisitions Holdings"]

const SpecsManagerContent = () => {
  const [specs, setSpecs] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // --- Form States ---
  const [name, setName] = useState("")
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([])

  useEffect(() => {
    const q = query(collection(db, "specs"), orderBy("createdAt", "desc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSpecs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsubscribe()
  }, [])

  const toggleWebsite = (website: string) => {
    setSelectedWebsites((prev) =>
      prev.includes(website)
        ? prev.filter((w) => w !== website)
        : [...prev, website]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return alert("Specification name is required.")
    if (selectedWebsites.length === 0) return alert("Please select at least one website.")

    setLoading(true)
    try {
      const specData = {
        name: name.trim(),
        websites: selectedWebsites,
        updatedAt: serverTimestamp(),
      }

      if (editingId) {
        await updateDoc(doc(db, "specs", editingId), specData)
      } else {
        await addDoc(collection(db, "specs"), { ...specData, createdAt: serverTimestamp() })
      }

      setIsModalOpen(false)
      resetForm()
    } catch (err) {
      console.error(err)
      alert("Error saving specification.")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setName("")
    setSelectedWebsites([])
  }

  return (
    <div className="space-y-8">
      {/* HEADER PANEL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter italic">
            Specs <span className="text-purple-600">Maintenance</span>
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            System-wide configuration & technical parameters
          </p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}
          className="bg-black text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-purple-600 transition-all shadow-lg shadow-gray-200"
        >
          <Plus size={18} /> New Specification
        </button>
      </div>

      {/* SPECS LIST TABLE */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
            <tr>
              <th className="px-8 py-6">Specification Name</th>
              <th className="px-8 py-6 text-center">Assigned Websites</th>
              <th className="px-8 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {specs.map((spec) => (
              <tr key={spec.id} className="hover:bg-gray-50/30 transition-colors group">
                <td className="px-8 py-6">
                  <h4 className="font-black text-gray-900 uppercase text-sm tracking-tight">{spec.name}</h4>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-wrap justify-center gap-2">
                    {spec.websites?.map((site: string) => (
                      <span key={site} className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-gray-100 text-gray-500 rounded-lg group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                        {site}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingId(spec.id)
                        setName(spec.name)
                        setSelectedWebsites(spec.websites || [])
                        setIsModalOpen(true)
                      }}
                      className="p-3 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() =>
                        confirm("Delete this specification permanently?") && deleteDoc(doc(db, "specs", spec.id))
                      }
                      className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {specs.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">No specifications found</p>
          </div>
        )}
      </div>

      {/* FULL-HEIGHT SIDE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-white h-screen w-full max-w-2xl shadow-2xl overflow-y-auto"
            >
              {/* MODAL HEADER */}
              <div className="p-8 border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur-md z-20 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                    <Settings2 size={24} />
                  </div>
                  <h3 className="font-black uppercase italic tracking-tighter text-2xl">
                    {editingId ? "Edit Spec" : "New Spec"}
                  </h3>
                </div>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-black text-white px-10 py-4 rounded-full font-black uppercase text-[10px] tracking-[0.2em] hover:bg-purple-600 flex items-center gap-3 shadow-xl shadow-gray-200"
                  >
                    {loading ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Save size={16} /> Save Spec
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* MODAL FORM CONTENT */}
              <div className="p-12 space-y-12 pb-32">
                {/* Name Input */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                    Specification Name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. VOLTAGE INPUT"
                    className="w-full text-4xl font-black uppercase italic outline-none border-b-4 border-gray-50 focus:border-purple-600 transition-all placeholder:text-gray-100 pb-2"
                  />
                </div>

                {/* Website Multi-Select */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-purple-600" />
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em]">
                      Website Assignment
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {WEBSITE_OPTIONS.map((site) => {
                      const isActive = selectedWebsites.includes(site);
                      return (
                        <div
                          key={site}
                          onClick={() => toggleWebsite(site)}
                          className={cn(
                            "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all",
                            isActive 
                              ? "border-purple-600 bg-purple-50/50" 
                              : "border-gray-50 bg-gray-50/30 hover:border-gray-200"
                          )}
                        >
                          <span className={cn(
                            "text-xs font-black uppercase italic tracking-tight",
                            isActive ? "text-purple-900" : "text-gray-400"
                          )}>
                            {site}
                          </span>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            isActive 
                              ? "bg-purple-600 border-purple-600 shadow-lg shadow-purple-200" 
                              : "border-gray-200"
                          )}>
                            {isActive && <Check size={14} className="text-white" strokeWidth={4} />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-[9px] font-bold text-gray-300 uppercase italic">
                    * This specification will appear on all selected platforms
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SpecsMaintenancePage() {
  return (
    <PageWrapper>
      <SpecsManagerContent />
    </PageWrapper>
  )
}